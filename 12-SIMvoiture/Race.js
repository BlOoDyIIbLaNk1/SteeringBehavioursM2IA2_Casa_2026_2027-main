class SimRace {
  constructor(entries, trackId, width, speed, force, laps, options = {}) {
    this.evaluation = Boolean(options.evaluation);
    if (entries.length < (this.evaluation ? 1 : 2) || entries.length > 8) throw new Error(this.evaluation ? 'Coche 1 à 8 cerveaux à tester.' : 'Sélectionne entre 2 et 8 cerveaux pour la course.');
    SimConfig.validate({...SimConfig.defaults,tracks:[trackId],width,maxSpeed:speed,maxForce:force,laps});
    this.track = options.track || new SimTrack(trackId, width);
    this.paused = false; this.finished = false; this.ticks = 0;
    this.cars = [];
    try {
      entries.forEach((entry, id) => {
        const brain = Brain.fromData(entry.config, entry.weights);
        const config = {...entry.config, maxSpeed: speed, maxForce: force, laps, lifespan: 7200, checkpointTimeout: 600};
        this.cars.push(new SimCar(brain, config, this.track, id, entry.name));
      });
    } catch (error) { this.dispose(); throw error; }
  }
  step() {
    if (this.paused || this.finished) return;
    if(this.sliceIndex) {while(this.sliceIndex)this.stepSlice();return 1;}
    this.ticks++;
    for (const car of this.cars) car.step();
    this.finished = this.cars.every(car => car.finished || car.dead);
  }
  stepSlice() {
    if(this.paused||this.finished)return 0;
    const index=this.sliceIndex||0;
    this.cars[index].step();this.sliceIndex=index+1;
    if(this.sliceIndex<this.cars.length)return 0;
    this.sliceIndex=0;this.ticks++;
    this.finished=this.cars.every(car=>car.finished||car.dead);
    return 1;
  }
  standings() {
    return [...this.cars].sort((a,b) => {
      if (a.finished && b.finished) return a.age - b.age;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return b.progress() - a.progress();
    });
  }
  bestCar() { return this.standings()[0]; }
  results() {
    return this.standings().map(car => ({name:car.name,finished:car.finished,
      progress:Math.min(100,100*car.passed/(car.track.checkpoints.length*car.config.laps)),
      seconds:car.age/60,reason:car.reason}));
  }
  dispose() { for (const car of this.cars) car.brain.dispose(); }
}
