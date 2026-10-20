class Evolution {
  constructor(config, seedBrain = null, provenance = []) {
    this.config = SimConfig.validate(config);
    config = this.config;
    const known=new Map([...provenance,...config.tracks.map(track=>({track,width:config.width}))].map(item=>[`${item.track}/${item.width}`,{...item}]));
    this.seenTracks=[...known.values()];
    if (this.seenTracks.length>256) throw new Error('Historique maximal de 256 pistes atteint.');
    randomSeed(config.seed);
    this.tracks = config.tracks.map(id => new SimTrack(id, config.width));
    this.trackIndex = 0; this.track = this.tracks[0];
    this.generation = 1; this.history = []; this.champion = null;
    this.paused = false; this.goalReached = false;
    this.cars = Array.from({length: config.population}, (_, id) => {
      const brain = seedBrain ? seedBrain.copy() : new Brain(config);
      if (seedBrain && id > 0) brain.mutate(config.mutation, config.sigma);
      return new SimCar(brain, config, this.track, id);
    });
  }

  step() {
    if (this.paused) return 0;
    if (this.pendingGeneration) {this.advanceGeneration();return 0;}
    if(this.sliceIndex) {while(this.sliceIndex)this.stepSlice();return 1;}
    for (const car of this.cars) car.step();
    if (this.cars.every(car => car.dead || car.finished)) this.finishTrack();
    return 1;
  }

  stepSlice() {
    if(this.paused)return 0;
    if(this.pendingGeneration) {this.advanceGeneration();return 0;}
    const index=this.sliceIndex||0;
    this.cars[index].step();this.sliceIndex=index+1;
    if(this.sliceIndex<this.cars.length)return 0;
    this.sliceIndex=0;
    if(this.cars.every(car=>car.dead||car.finished))this.finishTrack();
    return 1;
  }

  finishTrack() {
    for (const car of this.cars) {
      car.calculateFitness();
      car.evaluations.push({track: this.track.id, fitness: car.fitness, finished: car.finished, frames: car.age, passed: car.passed});
    }
    if (++this.trackIndex < this.tracks.length) {
      this.track = this.tracks[this.trackIndex];
      for (const car of this.cars) car.resetOnTrack(this.track);
      return;
    }
    for (const car of this.cars) car.fitness = car.evaluations.reduce((sum, item) => sum + item.fitness, 0) / car.evaluations.length;
    const sorted = [...this.cars].sort((a, b) => b.fitness - a.fitness);
    const winner = sorted[0];
    const success = this.cars.filter(car => car.evaluations.every(item => item.finished)).length / this.cars.length;
    const completed = winner.evaluations.filter(item => item.finished).length;
    if (!this.champion || completed > this.champion.completed || (completed === this.champion.completed && winner.fitness > this.champion.fitness)) {
      this.champion?.brain.dispose();
      this.champion = {brain: winner.brain.copy(), fitness: winner.fitness, completed,
        generation: this.generation, evaluations: winner.evaluations.map(item => ({...item}))};
    }
    this.history.push({generation: this.generation, best: winner.fitness,
      mean: this.cars.reduce((sum, car) => sum + car.fitness, 0) / this.cars.length, success});
    if (this.history.length > 80) this.history.shift();
    this.goalReached = success >= 0.6;
    if (this.config.autoStop && this.goalReached) { this.paused = true; this.trackIndex = this.tracks.length - 1; return; }
    this.nextGeneration(sorted);
  }

  tournamentSelection(population, rng = () => random(1)) {
    // TournamentSelection du TP 9b, taille rendue configurable.
    let best = null;
    for (let i = 0; i < this.config.tournament; i++) {
      const candidate = population[Math.min(population.length - 1, Math.floor(rng() * population.length))];
      if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return best;
  }

  resume() {
    if (this.goalReached && this.paused) this.nextGeneration();
    this.paused = false;
  }

  nextGeneration(sorted = [...this.cars].sort((a,b) => b.fitness - a.fitness)) {
    if(this.pendingGeneration)return;
    if(this.deferGenerations) {this.pendingGeneration={sorted,children:[]};return;}
    this.commitGeneration(Array.from({length:this.config.population},(_,id)=>this.createChild(sorted,id)));
  }

  createChild(sorted,id) {
    const parent=id<this.config.elite ? sorted[id] : this.tournamentSelection(sorted);
    const brain=parent.brain.copy();
    if(id>=this.config.elite)brain.mutate(this.config.mutation,this.config.sigma);
    return new SimCar(brain,this.config,this.tracks[0],id);
  }

  advanceGeneration() {
    const pending=this.pendingGeneration;
    pending.children.push(this.createChild(pending.sorted,pending.children.length));
    if(pending.children.length===this.config.population)this.commitGeneration(pending.children);
  }

  commitGeneration(children) {
    for (const car of this.cars) car.brain.dispose();
    this.trackIndex=0;this.track=this.tracks[0];this.pendingGeneration=null;
    this.cars = children;
    this.generation++;
    this.goalReached = false;
  }

  bestCar() { return this.cars.reduce((best, car) => !best || car.fitness > best.fitness ? car : best, null); }

  exportBest(name) {
    const best = this.champion || {brain: this.bestCar().brain, generation: this.generation, fitness: this.bestCar().fitness, evaluations: []};
    return BrainStore.pack(name, best.brain, {...this.config, name}, {
      generation: best.generation, fitness: best.fitness, evaluations: best.evaluations, seenTracks:this.seenTracks
    });
  }

  dispose() {
    if(this.pendingGeneration)for(const car of this.pendingGeneration.children)car.brain.dispose();
    for (const car of this.cars) car.brain.dispose();
    this.champion?.brain.dispose();
  }
}
