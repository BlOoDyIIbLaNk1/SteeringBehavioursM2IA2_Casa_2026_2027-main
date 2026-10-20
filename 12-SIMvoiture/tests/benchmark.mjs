// Comparaison reproductible d'une charge identique, pas une promesse de FPS.
import {readFileSync} from 'node:fs';
import {BrainStore,Brain,SimTrack,SimCar,config,tf} from './harness.mjs';
const data=BrainStore.parse(readFileSync(new URL('../brains/Atlas.simvoiture.json',import.meta.url),'utf8'));
const cfg=config({...data.config,population:48,lifespan:7200});
for(const mode of ['référence TensorFlow + murs complets','optimisé']) {
  const track=new SimTrack('aurora');
  if(mode.startsWith('référence'))track.wallCandidates=()=>track.walls;
  const cars=Array.from({length:48},(_,id)=>{
    const brain=Brain.fromData(cfg,data.weights);
    if(mode.startsWith('référence'))brain.predictFast=inputs=>brain.predict(inputs);
    return new SimCar(brain,cfg,track,id);
  });
  for(let i=0;i<30;i++)for(const car of cars)car.step();
  const start=performance.now();
  for(let i=0;i<300;i++)for(const car of cars)car.step();
  console.log(JSON.stringify({mode,ms:Math.round(performance.now()-start),carSteps:14400,alive:cars.filter(car=>!car.dead&&!car.finished).length}));
  for(const car of cars)car.brain.dispose();
}
console.log('Tenseurs restants :',tf.memory().numTensors);
