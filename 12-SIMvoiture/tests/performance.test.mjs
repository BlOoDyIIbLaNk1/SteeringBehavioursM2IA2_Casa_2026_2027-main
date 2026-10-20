import test from 'node:test';
import assert from 'node:assert/strict';
import {tf,Vector,Brain,SimCar,SimTrack,TrackWall,Evolution,DenseInference,WallIndex,SimulationClock,TrackRenderer,geometry,config,plain,constantBrain} from './harness.mjs';
import {readFileSync} from 'node:fs';

test('inférence mise en cache : mêmes sorties Float32 que TensorFlow CPU sur différentes architectures autorisées',()=>{
  let seed=71;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const activation of ['sigmoid','relu','tanh'])for(const [index,hidden] of [[12],[16,12],[32,32,32]].entries()) {
    const cfg=config({rays:[3,7,15][index],speedInput:index>0,hidden,activation}),brain=new Brain(cfg);
    for(let sample=0;sample<50;sample++) {
      const inputs=Array.from({length:brain.input_nodes},rng);
      const expected=Array.from(brain.predict(inputs));
      assert.deepEqual(Array.from(brain.predictFast(inputs)),expected);
    }
    const inputs=Array(brain.input_nodes).fill(.4321),reference=brain.trace(inputs),actual=brain.traceFast(inputs);
    reference.layers.slice(1).forEach((layer,i)=>assert.deepEqual(plain(actual.layers[i+1]),plain(layer)));
    brain.dispose();
  }
});

test('cache des poids invalidé par mutation ET setWeights, copies indépendantes, prédiction du TP inchangée',()=>{
  const brain=constantBrain(config()),inputs=Array(8).fill(.2);
  brain.predictFast(inputs);const first=DenseInference.compiled(brain);
  assert.equal(DenseInference.compiled(brain),first);
  brain.mutate(1,.1,()=>0,()=>.1);
  assert.deepEqual(Array.from(brain.predictFast(inputs)),Array.from(brain.predict(inputs)));
  assert.notEqual(DenseInference.compiled(brain),first);
  tf.tidy(()=>brain.model.setWeights(brain.model.getWeights().map(weight=>tf.zeros(weight.shape))));
  assert.deepEqual(Array.from(brain.predictFast(inputs)),[.5,.5]);
  const child=brain.copy();child.mutate(1,.1,()=>0,()=>.2);
  assert.deepEqual(Array.from(brain.predictFast(inputs)),[.5,.5]);
  assert.deepEqual(Array.from(child.predictFast(inputs)),Array.from(child.predict(inputs)));
  assert.throws(()=>brain.predictFast([1]));brain.dispose();child.dispose();
});

test('2000 prédictions rapides ne créent aucun tenseur et ne modifient pas les poids',()=>{
  const brain=constantBrain(config()),before=plain(brain.serialize()),count=tf.memory().numTensors;
  for(let i=0;i<2000;i++)brain.predictFast(Array(8).fill(i/2000));
  assert.equal(tf.memory().numTensors,count);assert.deepEqual(plain(brain.serialize()),before);brain.dispose();
});

test('rayons indexés : mêmes distances que Ray.cast sur tous les murs, y compris portée et bords',()=>{
  const cfg=config({rays:15,sight:500,fov:300}),brain=constantBrain(cfg);
  for(const id of ['aurora','sierra','random:42:2']) {
    const track=new SimTrack(id),car=new SimCar(brain,cfg,track,0);
    for(let i=0;i<track.path.length;i+=5)for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.75]) {
      car.pos.set(...track.path[i]);car.vel=Vector.fromAngle(angle);
      const indexed=Array.from(car.look(track.walls));
      const reference=Array.from(car.look([...track.walls]));
      indexed.forEach((value,j)=>assert.ok(Math.abs(value-reference[j])<1e-12));
    }
  }
  brain.dispose();
});

test('collisions indexées identiques au parcours complet, rayon inclusif et segment balayé',()=>{
  const {distPointToSegment,doSegmentsIntersect}=geometry;
  const track=new SimTrack('random:12:1');
  for(const wall of track.walls)for(const radius of [0,6,12])for(const dx of [-100,-6,0,6,100]) {
    const start=wall.a.copy().add(new Vector(dx,20)),end=wall.b.copy().add(new Vector(dx,-20));
    const reference=track.walls.some(item=>distPointToSegment(end,item.a,item.b)<=radius||doSegmentsIntersect([start.x,start.y],[end.x,end.y],[item.a.x,item.a.y],[item.b.x,item.b.y]));
    assert.equal(track.hit(start,end,radius),reference);
  }
});

test('index : pas de doublons, cellules négatives, limites inclusives, débordement du compteur et remplacement des murs',()=>{
  const walls=[new TrackWall([-80,-80],[80,80]),new TrackWall([80,0],[80,160])],index=new WallIndex(walls);
  const result=[...index.query(-100,-100,180,180)];
  assert.equal(result.length,2);assert.equal(new Set(result).size,2);
  index.stamp=4294967294;assert.equal(index.query(80,80,80,80).length,2);
  const track=new SimTrack();track.wallCandidates(0,0,1,1);track.walls=walls;
  assert.equal(track.wallCandidates(-100,-100,180,180).length,2);
  track.walls.push(new TrackWall([100,100],[110,110]));assert.equal(track.wallCandidates(-100,-100,180,180).length,3);
});

test('préfiltre : la perception proche ne parcourt plus toute la piste',()=>{
  const track=new SimTrack();
  const walls=track.wallCandidates(track.start.x,track.start.y,track.start.x+50,track.start.y);
  assert.ok(walls.length<track.walls.length/3);
});

test('horloge : 32× à 256× et MAX, budget de rendu, pas physiques constants et mesure honnête',()=>{
  for(const rate of [32,64,128,256,'max']) {
    let now=0,calls=0;const clock=new SimulationClock(()=>now),sim={step(){now+=.5;calls++;return 1;}};
    const steps=clock.run(sim,1000/60,rate);
    assert.equal(calls,16);assert.equal(steps,calls);assert.ok(clock.lastComputeMs<=8);
  }
  const clock=new SimulationClock(()=>0);assert.throws(()=>clock.run({},16,999));
});

test('horloge : ralenti, pause, reprise, arrêt exact, remise à zéro et délai borné',()=>{
  let now=0,calls=0;const clock=new SimulationClock(()=>now),sim={step(){now+=.1;calls++;return 1;}};
  for(let i=0;i<4;i++)clock.run(sim,1000/60,.25);
  assert.equal(calls,1);
  sim.paused=true;assert.equal(clock.run(sim,1000,256),0);assert.equal(clock.accumulator,0);
  sim.paused=false;assert.equal(clock.run(sim,1000,1),2);
  clock.reset();assert.equal(clock.accumulator,0);
  const stop={step(){this.finished=true;return 1;}};
  assert.equal(clock.run(stop,16,'max'),1);assert.equal(clock.run(stop,16,'max'),0);
});

test('temps passé à préparer les descendants non compté comme temps physique simulé',()=>{
  let now=0,calls=0;
  const clock=new SimulationClock(()=>now),sim={step(){now+=.5;return ++calls<=3?0:1;}};
  assert.equal(clock.run(sim,16,'max'),13);assert.equal(calls,16);
});

test('génération progressive : mêmes enfants que la méthode synchrone, élitisme et aucune réévaluation',()=>{
  const cfg=config(),seed=constantBrain(cfg),sync=new Evolution(cfg,seed);
  sync.cars.forEach((car,i)=>{car.dead=true;car.score=i*50;});sync.finishTrack();
  const expected=sync.cars.map(car=>plain(car.brain.serialize()));sync.dispose();
  const async=new Evolution(cfg,seed);async.deferGenerations=true;
  async.cars.forEach((car,i)=>{car.dead=true;car.score=i*50;});async.finishTrack();
  assert.equal(async.generation,1);assert.equal(async.pendingGeneration.children.length,0);
  async.step();assert.equal(async.pendingGeneration.children.length,1);
  async.paused=true;async.goalReached=true;async.resume();
  assert.equal(async.pendingGeneration.children.length,1);
  for(let i=1;i<cfg.population;i++)assert.equal(async.step(),0);
  assert.equal(async.generation,2);assert.equal(async.history.length,1);assert.equal(async.pendingGeneration,null);
  assert.deepEqual(async.cars.map(car=>plain(car.brain.serialize())),expected);
  async.dispose();seed.dispose();
});

test('abandon d’une génération partiellement construite : tous les modèles sont libérés',()=>{
  const baseline=tf.memory().numTensors,sim=new Evolution(config());sim.deferGenerations=true;
  sim.cars.forEach(car=>car.dead=true);sim.finishTrack();sim.step();sim.step();sim.dispose();
  assert.equal(tf.memory().numTensors,baseline);
});

test('cache de décor : construit une fois, invalidé par changement de piste ou checkpoints',()=>{
  let renders=0,blits=0;
  const context=new Proxy({canvas:{}},{get:(target,key)=>key in target?target[key]:()=>{if(key==='drawImage')blits++;},set:(target,key,value)=>{target[key]=value;return true;}});
  const renderer=new TrackRenderer();renderer.canvas={getContext:()=>({drawImage(){}})};
  const track={recipe:{seed:1},show(){renders++;}};
  renderer.draw(context,track,false,null);renderer.draw(context,track,false,null);
  assert.equal(renders,1);assert.equal(blits,1);
  renderer.draw(context,track,true,null);assert.equal(renders,2);
  renderer.draw(context,{...track},true,null);assert.equal(renders,3);
});

test('trajectoire complète : mêmes positions, forces et arrivée avec les prédictions du TP et les murs complets',()=>{
  const data=JSON.parse(readFileSync(new URL('../brains/Atlas.simvoiture.json',import.meta.url),'utf8'));
  const cfg=config(data.config),indexed=new SimTrack('aurora'),full=new SimTrack('aurora');
  full.wallCandidates=()=>full.walls;
  const brain=Brain.fromData(cfg,data.weights),reference=brain.copy();
  reference.predictFast=inputs=>reference.predict(inputs);
  const a=new SimCar(brain,cfg,indexed,0),b=new SimCar(reference,cfg,full,0);
  for(let i=0;i<1800;i++) {
    a.step();b.step();
    assert.equal(a.pos.x,b.pos.x);assert.equal(a.pos.y,b.pos.y);
    assert.equal(a.vel.x,b.vel.x);assert.equal(a.vel.y,b.vel.y);
    assert.equal(a.lastForce.x,b.lastForce.x);assert.equal(a.lastForce.y,b.lastForce.y);
    assert.equal(a.finished,b.finished);assert.equal(a.passed,b.passed);
  }
  brain.dispose();reference.dispose();
});

test('découpage coopératif : pas de véhicule mis à jour deux fois, pause et pas à pas après une tranche',()=>{
  const cfg=config(),seed=constantBrain(cfg),sim=new Evolution(cfg,seed);seed.dispose();
  assert.equal(sim.stepSlice(),0);assert.equal(sim.cars[0].age,1);assert.equal(sim.cars[1].age,0);
  sim.paused=true;sim.stepSlice();assert.equal(sim.cars[1].age,0);
  sim.paused=false;sim.step();assert.ok(sim.cars.every(car=>car.age===1));
  assert.equal(sim.sliceIndex,0);
  for(let i=0;i<sim.cars.length-1;i++)assert.equal(sim.stepSlice(),0);
  assert.equal(sim.stepSlice(),1);assert.ok(sim.cars.every(car=>car.age===2));sim.dispose();
});
