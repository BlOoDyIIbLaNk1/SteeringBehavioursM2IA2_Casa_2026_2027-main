// Limite le travail PAR RENDU, pas la vitesse physique des voitures.
class SimulationClock {
  static rates=[.25,.5,1,2,4,8,16,32,64,128,256,'max'];
  constructor(now=()=>performance.now()) {this.now=now;this.accumulator=0;this.lastComputeMs=0;}
  reset() {this.accumulator=0;}
  run(sim,deltaMs,rate) {
    if(!SimulationClock.rates.includes(rate))throw new Error('Vitesse de simulation invalide.');
    if(!sim || sim.paused || sim.finished) {this.reset();this.lastComputeMs=0;return 0;}
    const max=rate==='max',delta=Math.max(0,Math.min(Number.isFinite(deltaMs)?deltaMs:0,100));
    if(!max)this.accumulator=Math.min(Math.max(2,rate*2),this.accumulator+delta*.06*rate);
    else this.accumulator=0;
    // Réserve du temps au rendu/DOM. Un pas de véhicule reste atomique, jamais
    // coupé au milieu de Vehicle.update ; une génération est préparée par lots.
    const budget=deltaMs>24 ? 2.5 : 8;
    const start=this.now();let steps=0,iterations=0;
    while((max || this.accumulator>=1) && this.now()-start<budget && iterations++<8192) {
      const result=sim.stepSlice ? sim.stepSlice() : sim.step();
      if(result!==0)steps++;
      if(!max && result!==0)this.accumulator--;
      if(sim.paused || sim.finished) {this.reset();break;}
    }
    this.lastComputeMs=this.now()-start;
    return steps;
  }
}
