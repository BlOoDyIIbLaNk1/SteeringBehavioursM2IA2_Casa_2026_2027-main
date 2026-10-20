import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// TensorFlow réel, même bundle CPU que dans le navigateur. Seul p5.Vector est
// remplacé par son contrat arithmétique pour les tests sans DOM.
export const tf = createRequire(import.meta.url)('../vendor/tf.min.js');
await tf.setBackend('cpu');
await tf.ready();

export class Vector {
  constructor(x=0,y=0) { this.x=x; this.y=y; }
  copy() { return new Vector(this.x,this.y); }
  set(x,y) { if (typeof x === 'object') return this.set(x.x,x.y); this.x=x; this.y=y; return this; }
  add(v) { this.x+=v.x; this.y+=v.y; return this; }
  sub(v) { this.x-=v.x; this.y-=v.y; return this; }
  mult(n) { this.x*=n; this.y*=n; return this; }
  div(n) { return this.mult(1/n); }
  magSq() { return this.x*this.x+this.y*this.y; }
  mag() { return Math.hypot(this.x,this.y); }
  normalize() { const length=this.mag(); return length ? this.div(length) : this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { return this.mag()>n ? this.setMag(n) : this; }
  dot(v) { return this.x*v.x+this.y*v.y; }
  heading() { return Math.atan2(this.y,this.x); }
  static add(a,b) { return a.copy().add(b); }
  static sub(a,b) { return a.copy().sub(b); }
  static dist(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
  static fromAngle(angle) { return new Vector(Math.cos(angle),Math.sin(angle)); }
}

let seed=42;
function random(n=1) { seed=(1664525*seed+1013904223)>>>0; return seed/4294967296*n; }
const scope = vm.createContext({
  tf, console, crypto, Math, Date, performance,
  p5:{Vector}, createVector:(x,y)=>new Vector(x,y),
  constrain:(n,a,b)=>Math.max(a,Math.min(b,n)),
  lerp:(a,b,t)=>a+(b-a)*t, dist:(x,y,a,b)=>Math.hypot(x-a,y-b),
  random,randomSeed:n=>{seed=n;},
  randomGaussian:(mean=0,sd=1)=>mean+sd*Math.sqrt(-2*Math.log(Math.max(1e-12,random())))*Math.cos(2*Math.PI*random())
});
for (const path of [
  '../../1-Seek/vehicle.js',
  '../../9b - Voiture suit circuit version 2/js/NeuralNetwork.js',
  '../../9b - Voiture suit circuit version 2/js/Ray.js',
  '../../9b - Voiture suit circuit version 2/js/Track.js',
  '../../9b - Voiture suit circuit version 2/js/utils.js',
  '../Config.js','../DenseInference.js','../Brain.js','../TrackWall.js','../WallIndex.js','../CircuitGenerator.js','../Track.js','../CarRenderer.js','../SimCar.js',
  '../BrainStore.js','../Evolution.js','../Race.js','../NetworkView.js','../SimulationClock.js','../TrackRenderer.js'
]) vm.runInContext(readFileSync(new URL(path,import.meta.url),'utf8'),scope,{filename:path});

export const {Vehicle,NeuralNetwork,Ray,SimConfig,Brain,TrackWall,SimTrack,SimCar,BrainStore,Evolution,SimRace,NetworkView,CircuitGenerator,DenseInference,WallIndex,SimulationClock,TrackRenderer} = vm.runInContext('({Vehicle,NeuralNetwork,Ray,SimConfig,Brain,TrackWall,SimTrack,SimCar,BrainStore,Evolution,SimRace,NetworkView,CircuitGenerator,DenseInference,WallIndex,SimulationClock,TrackRenderer})',scope);
export const config = input => SimConfig.validate({...SimConfig.defaults,population:8,hidden:[4],...input});
export const geometry = vm.runInContext('({distPointToSegment,doSegmentsIntersect})',scope);
export const CarRenderer = vm.runInContext('CarRenderer', scope);
export function drawTrack(track, context, checkpoints) {
  scope.drawingContext=context;
  try {track.show(checkpoints);} finally {delete scope.drawingContext;}
}
export const plain = value => JSON.parse(JSON.stringify(value));
export function constantBrain(cfg,direction=.5,throttle=.7) {
  const brain = new Brain(cfg);
  tf.tidy(() => {
    const weights = brain.model.getWeights().map(weight=>tf.zeros(weight.shape));
    weights[weights.length-1] = tf.tensor1d([Math.log(direction/(1-direction)),Math.log(throttle/(1-throttle))]);
    brain.model.setWeights(weights);
  });
  return brain;
}
export function entry(name='Test',cfg=config()) {
  const brain = constantBrain(cfg);
  const data = BrainStore.pack(name,brain,cfg,{generation:1,fitness:0,evaluations:[]});
  brain.dispose(); return data;
}
