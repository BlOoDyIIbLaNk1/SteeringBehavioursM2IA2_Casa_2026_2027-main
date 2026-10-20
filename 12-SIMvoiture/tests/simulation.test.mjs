import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tf,Vector,Vehicle,NeuralNetwork,Ray,SimConfig,Brain,TrackWall,SimTrack,SimCar,BrainStore,Evolution,SimRace,NetworkView,config,plain,constantBrain,entry} from './harness.mjs';

test('réglages : bornes inclusives, architecture, circuits, refus des valeurs invalides',()=>{
  for (const [key,[low,high]] of Object.entries(SimConfig.ranges)) {
    if (key === 'elite') continue;
    for (const value of [low,high]) assert.equal(config({[key]:value})[key],value);
    for (const value of [low-1,high+1,NaN,Infinity,'3']) assert.throws(()=>config({[key]:value}));
  }
  for (const hidden of [[],[1],[33],[4,4,4,4],[2.5]]) assert.throws(()=>config({hidden}));
  for (const tracks of [[],['?'],['aurora','aurora']]) assert.throws(()=>config({tracks}));
  assert.throws(()=>config({elite:8}));
  assert.throws(()=>config({activation:'softmax'}));
  assert.equal(SimConfig.inputs(config({rays:15,speedInput:true})),16);
  assert.equal(SimConfig.inputs(config({rays:3,speedInput:false})),3);
});

test('réseau TP : héritage, dimensions paramétrables et activations réelles',()=>{
  for (const activation of ['sigmoid','relu','tanh']) {
    const cfg=config({rays:5,hidden:[8,6,3],activation});
    const brain=new Brain(cfg), inputs=[.1,.2,.3,.4,.5,.6];
    assert.ok(brain instanceof NeuralNetwork);
    assert.equal(Brain.prototype.predict,NeuralNetwork.prototype.predict);
    const output=Array.from(brain.predict(inputs)), trace=brain.trace(inputs);
    assert.deepEqual(plain(trace.layers.map(layer=>layer.length)),[6,8,6,3,2]);
    assert.deepEqual(plain(trace.layers.at(-1)),output);
    assert.ok(output.every(n=>Number.isFinite(n)&&n>=0&&n<=1));
    brain.dispose();
  }
});

test('copie indépendante, mutation 0/1 et bruit injecté reproductible',()=>{
  const parent=constantBrain(config()), before=parent.serialize(), child=parent.copy();
  assert.deepEqual(plain(child.serialize()),plain(before));
  child.mutate(0,.1,()=>0,()=>.25);
  assert.deepEqual(plain(child.serialize()),plain(before));
  child.mutate(1,.1,()=>0,()=>.25);
  const after=child.serialize();
  after.forEach((tensor,i)=>tensor.values.forEach((value,j)=>assert.ok(Math.abs(value-before[i].values[j]-.25)<1e-6)));
  assert.deepEqual(plain(parent.serialize()),plain(before));
  parent.dispose();child.dispose();
});

test('export/import conserve exactement poids, architecture et prédictions',()=>{
  const cfg=config({hidden:[5,3],rays:3,speedInput:false});
  const brain=new Brain(cfg), inputs=[.2,.4,.9];
  const packed=BrainStore.pack('Pilote A',brain,cfg,{generation:5,fitness:24,evaluations:[]});
  const loaded=BrainStore.parse(JSON.stringify(packed));
  const clone=Brain.fromData(loaded.config,loaded.weights);
  assert.deepEqual(Array.from(clone.predict(inputs)),Array.from(brain.predict(inputs)));
  assert.deepEqual(plain(clone.serialize()),plain(brain.serialize()));
  brain.dispose();clone.dispose();
});

test('import refuse format, valeurs, dimensions et fichiers démesurés sans fuite',()=>{
  const data=entry(), before=tf.memory().numTensors;
  const bads=[{...data,version:2},{...data,format:'autre'},{...data,name:''},{...data,weights:[]},{...data,training:{fitness:-1,generation:2}}];
  let bad=plain(data);bad.weights[0].shape=[1,4];bads.push(bad);
  bad=plain(data);bad.weights[0].values[0]=null;bads.push(bad);
  bad=plain(data);bad.weights[0].values[0]=1e9;bads.push(bad);
  bad=plain(data);bad.config.rays=9;bads.push(bad);
  bad=plain(data);bad.training.evaluations='non';bads.push(bad);
  bad=plain(data);bad.training.evaluations=[{finished:true}];bads.push(bad);
  for (const item of bads) assert.throws(()=>BrainStore.parse(JSON.stringify(item)));
  assert.throws(()=>BrainStore.parse('x'.repeat(2*1024*1024+1)));
  assert.equal(tf.memory().numTensors,before);
});

test('bibliothèque locale : lecture, persistance, erreurs quota et corruption',()=>{
  const map=new Map(),storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
  assert.equal(BrainStore.read(storage).length,0);
  BrainStore.save([entry('A'),entry('B')],storage);
  assert.equal(BrainStore.read(storage)[1].name,'B');
  assert.throws(()=>BrainStore.save(Array(31).fill(entry()),storage));
  assert.throws(()=>BrainStore.save([], {setItem(){throw new Error('Quota');}}),/Quota/);
  map.set(BrainStore.key,'corrompu');assert.throws(()=>BrainStore.read(storage));
});

test('géométrie TP, entités Vehicle et capteur intersection la plus proche',()=>{
  for (const id of Object.keys(SimTrack.layouts)) {
    const track=new SimTrack(id);
    assert.ok(track instanceof Vehicle);
    assert.ok(track.walls.every(wall=>wall instanceof Vehicle&&wall instanceof TrackWall));
    assert.ok(track.length>1000&&track.checkpoints.length>20);
    assert.equal(track.hit(track.start,track.start,6),false);
  }
  const cfg=config({rays:3,speedInput:false,fov:90,sight:100});
  const brain=constantBrain(cfg), car=new SimCar(brain,cfg,new SimTrack(),0);
  car.pos.set(0,0);car.vel.set(1,0);
  const wall=(x)=>new TrackWall([x,-50],[x,50]);
  const inputs=car.look([wall(80),wall(20)]);
  assert.ok(Math.abs(inputs[1]-.8)<1e-9);
  assert.ok(inputs.every(n=>n>=0&&n<=1));
  assert.equal(car.look([])[1],0);
  const ray=new Ray(new Vector(0,0),0);assert.equal(ray.cast(wall(-20)),undefined);
  brain.dispose();
});

test('steering du TP : desired-current, force bornée, applyForce et update hérités une fois',()=>{
  const cfg=config({maxForce:.3,maxSpeed:5,turn:.5});
  const brain=constantBrain(cfg,.8,.9),car=new SimCar(brain,cfg,new SimTrack(),0);
  assert.ok(car instanceof Vehicle);
  assert.equal(SimCar.prototype.applyForce,Vehicle.prototype.applyForce);
  car.look=()=>Array(SimConfig.inputs(cfg)).fill(0);
  const before=car.pos.copy(), velocity=car.vel.copy();
  const out=brain.predict(car.look());
  const expected=Vector.fromAngle(velocity.heading()+(out[0]*2-1)*cfg.turn).setMag(out[1]*cfg.maxSpeed).sub(velocity).limit(cfg.maxForce);
  const baseUpdate=Vehicle.prototype.update;let updates=0;
  Vehicle.prototype.update=function(){updates++;baseUpdate.call(this);};
  try {car.step();} finally {Vehicle.prototype.update=baseUpdate;}
  assert.equal(updates,1);
  assert.ok(Math.abs(car.lastForce.x-expected.x)<1e-7&&Math.abs(car.lastForce.y-expected.y)<1e-7);
  assert.ok(car.lastForce.mag()<=cfg.maxForce+1e-9);
  assert.ok(car.vel.mag()<=cfg.maxSpeed+1e-9);
  assert.ok(Vector.dist(car.pos,before.copy().add(velocity).add(expected))<1e-8);
  assert.equal(car.acc.mag(),0);brain.dispose();
});

test('la direction dépend du cerveau, pas du prochain checkpoint',()=>{
  const cfg=config(),track=new SimTrack(),brain=constantBrain(cfg,.65,.7);
  const a=new SimCar(brain,cfg,track,0),b=new SimCar(brain,cfg,track,1);b.checkpointIndex=20;
  a.think(track.walls);b.think(track.walls);
  assert.equal(a.lastForce.x,b.lastForce.x);assert.equal(a.lastForce.y,b.lastForce.y);brain.dispose();
});

test('collision balayée et seuil inclusif du rayon',()=>{
  const track=new SimTrack();track.walls=[new TrackWall([10,-50],[10,50])];
  assert.equal(track.hit(new Vector(0,0),new Vector(20,0),1),true);
  assert.equal(track.hit(new Vector(0,0),new Vector(4,0),6),true);
  assert.equal(track.hit(new Vector(0,0),new Vector(3.9,0),6),false);
});

test('checkpoints ordonnés, pas de marche arrière, tours et arrêt exact sans progression',()=>{
  const cfg=config({checkpointTimeout:60}),track=new SimTrack(),brain=constantBrain(cfg),car=new SimCar(brain,cfg,track,0);
  const cp=track.checkpoints[1];car.pos=Vector.add(cp.a,cp.b).div(2);
  const heading=Vector.sub(car.pos,new Vector(...track.path[0])).normalize();
  car.vel=heading.copy().mult(-1);car.checkCheckpoints();assert.equal(car.passed,0);
  car.vel=heading.copy();car.checkCheckpoints();assert.equal(car.passed,1);assert.equal(car.score,50);
  car.checkCheckpoints();assert.equal(car.passed,1);
  car.checkpointIndex=0;car.pos=track.start.copy();car.vel=Vector.sub(car.pos,new Vector(...track.path.at(-1))).normalize();
  car.checkCheckpoints();assert.equal(car.laps,1);assert.equal(car.finished,true);
  car.resetOnTrack(track);car.think=()=>{};car.vel.set(0,0);
  for(let i=0;i<59;i++)car.step();assert.equal(car.dead,false);
  car.step();assert.equal(car.dead,true);assert.equal(car.age,60);assert.equal(car.reason,'Plus de progression');
  const pos=car.pos.copy();car.step();assert.equal(Vector.dist(pos,car.pos),0);brain.dispose();
});

test('fitness identique au TP : score plus proximité bornée à zéro',()=>{
  const cfg=config(),brain=constantBrain(cfg),track=new SimTrack(),car=new SimCar(brain,cfg,track,0);
  const cp=track.checkpoints[1],center=Vector.add(cp.a,cp.b).div(2);car.score=100;
  for(const distance of [0,200,400,1000]) {
    car.pos=center.copy().add(new Vector(distance,0));car.calculateFitness();
    assert.ok(Math.abs(car.fitness-(100+Math.max(0,50*(1-distance/400))))<1e-8);
  }
  brain.dispose();
});

test('tournoi TP : sélection du meilleur candidat, tirages injectés',()=>{
  const sim=new Evolution(config({tournament:3})),population=[{fitness:1},{fitness:9},{fitness:4}];
  let i=0;const sequence=[0,.8,.4];
  assert.equal(sim.tournamentSelection(population,()=>sequence[i++]),population[1]);sim.dispose();
});

test('multi-circuits : mêmes poids, évaluation avant sélection, élitisme et moyenne',()=>{
  const cfg=config({tracks:['aurora','lagune'],elite:1}),sim=new Evolution(cfg);
  const first=plain(sim.cars[0].brain.serialize());
  sim.cars.forEach(car=>{car.dead=true;car.score=100;});sim.finishTrack();
  assert.equal(sim.generation,1);assert.equal(sim.trackIndex,1);
  assert.equal(sim.cars[0].evaluations.length,1);
  assert.deepEqual(plain(sim.cars[0].brain.serialize()),first);
  sim.cars.forEach(car=>{car.dead=true;car.score=200;});sim.finishTrack();
  assert.equal(sim.generation,2);assert.equal(sim.history.length,1);assert.equal(sim.trackIndex,0);
  const ev=sim.champion.evaluations;
  assert.equal(sim.champion.fitness,(ev[0].fitness+ev[1].fitness)/2);
  assert.deepEqual(plain(sim.cars[0].brain.serialize()),plain(sim.champion.brain.serialize()));
  assert.equal(sim.cars[0].evaluations.length,0);sim.dispose();
});

test('arrêt à 60 % et reprise sans doubler les évaluations',()=>{
  const sim=new Evolution(config({autoStop:true}));
  sim.cars.forEach((car,i)=>{car.finished=i<5;car.dead=i>=5;car.score=i<5?500:0;});sim.finishTrack();
  assert.equal(sim.paused,true);assert.equal(sim.goalReached,true);assert.equal(sim.generation,1);
  sim.step();assert.equal(sim.history.length,1);
  sim.resume();assert.equal(sim.generation,2);assert.equal(sim.paused,false);assert.equal(sim.cars[0].evaluations.length,0);sim.dispose();
});

test('course : 2–8 cerveaux, paramètres communs, pause et aucune mutation',()=>{
  const a=entry('A'),b=entry('B',config({rays:3,hidden:[3,2],speedInput:false}));
  assert.throws(()=>new SimRace([a],'aurora',110,5,.5,1));
  assert.throws(()=>new SimRace(Array(9).fill(a),'aurora',110,5,.5,1));
  assert.throws(()=>new SimRace([a,b],'aurora',110,-1,.5,1));
  assert.throws(()=>new SimRace([a,b],'aurora',110,5,0,1));
  const race=new SimRace([a,b],'aurora',100,6,.4,2), weights=race.cars.map(car=>plain(car.brain.serialize()));
  race.paused=true;race.step();assert.equal(race.ticks,0);
  race.paused=false;for(let i=0;i<700;i++)race.step();
  race.cars.forEach((car,i)=>{
    assert.equal(car.maxSpeed,6);assert.equal(car.maxForce,.4);assert.equal(car.config.laps,2);
    assert.deepEqual(plain(car.brain.serialize()),weights[i]);
  });
  assert.equal(race.finished,true);const time=race.ticks;race.step();assert.equal(race.ticks,time);
  race.dispose();
});

test('classement : arrivée prioritaire, meilleur temps puis progrès pour les autres',()=>{
  const race=new SimRace([entry('A'),entry('B'),entry('C')],'aurora',110,5,.5,1);
  const [a,b,c]=race.cars;a.dead=true;a.passed=20;b.finished=true;b.age=500;c.finished=true;c.age=400;
  assert.deepEqual(plain(race.standings().map(car=>car.name)),['C','B','A']);race.dispose();
});

test('Atlas et Orion : JSON réellement entraînés, importables et capables de finir Aurora',()=>{
  const entries=['Atlas','Orion'].map(name=>BrainStore.parse(readFileSync(new URL(`../brains/${name}.simvoiture.json`,import.meta.url),'utf8')));
  assert.notDeepEqual(plain(entries[0].config.hidden),plain(entries[1].config.hidden));
  const race=new SimRace(entries,'aurora',110,5,.5,1);
  for(let i=0;i<7200&&!race.finished;i++)race.step();
  assert.ok(race.cars.every(car=>car.finished),'Les deux cerveaux doivent finir le circuit déjà appris, sans aide.');
  race.dispose();
});

test('diagnostic réseau en lecture seule et absence de fuite TensorFlow sur cycles',()=>{
  const baseline=tf.memory().numTensors;
  for(let cycle=0;cycle<6;cycle++) {
    const sim=new Evolution(config());
    for(let generation=0;generation<5;generation++) {
      sim.cars.forEach(car=>{car.brain.predict(car.inputs);car.brain.trace(car.inputs);car.dead=true;});sim.finishTrack();
      const data=sim.exportBest('Mémoire');const brain=Brain.fromData(data.config,data.weights);brain.dispose();
    }
    sim.dispose();
  }
  assert.equal(tf.memory().numTensors,baseline);
});

test('rendu diagnostic ne recalcule pas les forces',()=>{
  const cfg=config(),brain=constantBrain(cfg),car=new SimCar(brain,cfg,new SimTrack(),0);
  const before=plain(brain.serialize()),pos=car.pos.copy();car.think=()=>{throw new Error('Interdit');};
  const ctx=new Proxy({}, {get:()=>()=>{},set:()=>true});
  NetworkView.draw({width:340,height:290,getContext:()=>ctx},car);
  assert.deepEqual(plain(brain.serialize()),before);assert.equal(Vector.dist(pos,car.pos),0);brain.dispose();
});

test('code fourni protégé : vehicle.js inchangé et scripts HTML existants',()=>{
  const source=readFileSync(new URL('../../1-Seek/vehicle.js',import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),'319a07e0d5d08fdd54a79a07a28e2b1e58b62721b0482ea66197b5331985137b');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const match of html.matchAll(/<script src="([^"]+)"/g)) assert.ok(readFileSync(new URL(decodeURI(match[1]),new URL('../index.html',import.meta.url))).length);
});
