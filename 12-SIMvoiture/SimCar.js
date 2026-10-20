class SimCar extends Vehicle {
  constructor(brain, config, track, id, name = '') {
    super(track.start.x, track.start.y);
    this.brain = brain;
    this.config = config;
    this.id = id;
    this.name = name || `Voiture ${id + 1}`;
    this.r = 6;
    this.maxSpeed = config.maxSpeed;
    this.maxForce = config.maxForce;
    this.rays = Array.from({length: config.rays}, () => new Ray());
    this.evaluations = [];
    this.resetOnTrack(track);
  }

  resetOnTrack(track) {
    this.pos = track.start.copy();
    this.vel = p5.Vector.fromAngle(track.startAngle).setMag(1);
    this.acc.mult(0);
    this.dead = false; this.finished = false; this.reason = '';
    this.age = 0; this.sinceCheckpoint = 0; this.checkpointIndex = 1;
    this.passed = 0; this.laps = 0; this.score = 0; this.fitness = 0;
    this.inputs = Array(SimConfig.inputs(this.config)).fill(0);
    this.outputs = [0.5, 0.5]; this.lastForce = createVector(0,0);
    this.previous = this.pos.copy();
    this.track = track;
  }

  look(walls) {
    const inputs = this.inputs;
    const heading = this.vel.heading();
    this.rays.forEach((ray, index) => {
      const angle = heading - this.config.fov * Math.PI / 360
        + index * this.config.fov * Math.PI / 180 / (this.rays.length - 1);
      ray.setDir(angle); ray.setPos(this.pos.x, this.pos.y);
      let record = this.config.sight;
      let endX=this.pos.x+ray.dir.x*record,endY=this.pos.y+ray.dir.y*record;
      const candidates=walls===this.track.walls ? this.track.wallCandidates(this.pos.x,this.pos.y,endX,endY) : walls;
      for (const wall of candidates) {
        const point = ray.cast(wall);
        if (point) {
          const distance = p5.Vector.dist(this.pos, point);
          if (distance < record) { record = distance; endX=point.x;endY=point.y; }
        }
      }
      if(!ray.end)ray.end=createVector(0,0);
      ray.end.set(endX,endY);
      inputs[index]=1-record/this.config.sight;
    });
    if (this.config.speedInput) inputs[this.rays.length]=this.vel.mag()/this.maxSpeed;
    return inputs;
  }

  think(walls) {
    this.inputs = this.look(walls);
    this.outputs = this.brain.predictFast ? this.brain.predictFast(this.inputs) : this.brain.predict(this.inputs);
    // Car.think (9b) : sorties direction/vitesse → vitesse désirée → steering.
    const turn = (this.outputs[0] * 2 - 1) * this.config.turn;
    let thrust = this.outputs[1] * this.maxSpeed;
    if (this.age < 30) thrust = Math.max(thrust, this.maxSpeed * 0.5);
    const desired = p5.Vector.fromAngle(this.vel.heading() + turn).setMag(thrust);
    const steering = p5.Vector.sub(desired, this.vel).limit(this.maxForce);
    this.lastForce = steering.copy();
    this.applyForce(steering);
  }

  step() {
    if (this.dead || this.finished) return;
    this.previous = this.pos.copy();
    this.think(this.track.walls);
    super.update(); // applyForce et intégration du Vehicle fourni, une fois.
    this.age++; this.sinceCheckpoint++;
    if (this.track.hit(this.previous, this.pos, this.r)) return this.stop('Sortie de piste');
    this.checkCheckpoints();
    if (!this.finished && this.sinceCheckpoint >= this.config.checkpointTimeout) this.stop('Plus de progression');
    if (!this.finished && this.age >= this.config.lifespan) this.stop('Temps limite');
    this.calculateFitness();
  }

  stop(reason) { this.dead = true; this.reason = reason; this.calculateFitness(); }

  checkCheckpoints() {
    const cp = this.track.checkpoints[this.checkpointIndex];
    if (!cp) return;
    // Validation dans l'ordre et franchissement vers l'avant, pas un tour sur place.
    const center = p5.Vector.add(cp.a, cp.b).div(2);
    const previous = this.track.path[(this.checkpointIndex - 1 + this.track.path.length) % this.track.path.length];
    const direction = p5.Vector.sub(center, createVector(...previous));
    if (distPointToSegment(this.pos, cp.a, cp.b) < 16 && this.vel.dot(direction) > 0) {
      this.passed++; this.score += 50; this.sinceCheckpoint = 0;
      if (this.checkpointIndex === 0) {
        this.laps++; this.score += 200;
        if (this.laps >= this.config.laps) { this.finished = true; this.reason = 'Arrivée'; }
      }
      this.checkpointIndex = (this.checkpointIndex + 1) % this.track.checkpoints.length;
    }
  }

  calculateFitness() {
    // Fitness du TP 9b : score de checkpoints + proximité du prochain.
    const cp = this.track.checkpoints[this.checkpointIndex];
    const center = p5.Vector.add(cp.a, cp.b).div(2);
    const proximity = Math.max(0, 50 * (1 - p5.Vector.dist(this.pos, center) / 400));
    this.fitness = this.score + proximity;
  }

  progress() {
    const cp = this.track.checkpoints[this.checkpointIndex];
    const center = p5.Vector.add(cp.a, cp.b).div(2);
    const last = createVector(...this.track.path[(this.checkpointIndex - 1 + this.track.path.length) % this.track.path.length]);
    const fraction = constrain(1 - p5.Vector.dist(this.pos, center) / p5.Vector.dist(last, center), 0, 0.99);
    return this.finished ? this.config.laps * this.track.checkpoints.length : this.passed + fraction;
  }

  show(selected, leader, debug) {
    CarRenderer.draw(drawingContext, this, selected, leader, debug);
  }
}
