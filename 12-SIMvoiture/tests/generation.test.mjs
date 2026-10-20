import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {tf,Vector,Brain,CircuitGenerator,SimTrack,SimCar,BrainStore,Evolution,SimRace,config,plain,constantBrain,entry} from './harness.mjs';

test('graines : format strict, bornes inclusives et paramètres invalides refusés',()=>{
  for(const seed of [0,1,2147483647]) for(const difficulty of [1,2,3]) {
    assert.deepEqual(plain(CircuitGenerator.parse(CircuitGenerator.id(seed,difficulty))),{seed,difficulty});
  }
  for(const id of ['random:-1:2','random:2147483648:2','random:01:2','random:1:4','random:1.5:2','random:NaN:2','random:1:2extra']) assert.equal(CircuitGenerator.parse(id),null);
  assert.throws(()=>CircuitGenerator.id(-1,2));
  assert.throws(()=>CircuitGenerator.generate(1,2,69));
  assert.throws(()=>CircuitGenerator.generate(1,2,141));
});

test('même graine : même vraie géométrie ; autres graines : nouveaux tracés',()=>{
  const a=new SimTrack('random:42:2'),b=new SimTrack('random:42:2');
  assert.deepEqual(plain(a.path),plain(b.path));
  assert.deepEqual(plain(a.inner),plain(b.inner));
  const signatures=new Set();
  for(let seed=0;seed<60;seed++) signatures.add(CircuitGenerator.signature(new SimTrack(CircuitGenerator.id(seed,2))));
  assert.ok(signatures.size>45,`Diversité insuffisante : ${signatures.size}`);
  assert.notDeepEqual(plain(a.path),plain(new SimTrack('random:123456789:2').path));
});

test('pistes sûres : différentes difficultés, largeurs et graines, départ libre',()=>{
  for(const width of [70,110,140]) for(const difficulty of [1,2,3]) for(const seed of [0,42,999,2147483647]) {
    const track=new SimTrack(CircuitGenerator.id(seed,difficulty),width);
    assert.ok(CircuitGenerator.safe(track.path,width));
    assert.equal(track.hit(track.start,track.start,6),false);
    assert.ok(track.path.length>12&&Number.isFinite(track.length));
    assert.ok(['grille TP 9b','coque convexe TP 9b'].includes(track.method));
  }
});

test('le contrôleur géométrique refuse les croisements et points hors du monde',()=>{
  assert.equal(CircuitGenerator.safe([[20,20],[1100,700],[1100,20],[20,700]],110),false);
  assert.equal(CircuitGenerator.safe([[-500,0],[100,0],[100,100],[0,100]],110),false);
});

test('générer une piste ne consomme pas le générateur des mutations/sélections',()=>{
  const population=[{fitness:1},{fitness:3},{fitness:6},{fitness:9}];
  const sim=new Evolution(config({seed:321}));
  const expected=[sim.tournamentSelection(population).fitness,sim.tournamentSelection(population).fitness];sim.dispose();
  const again=new Evolution(config({seed:321}));
  const actual=[again.tournamentSelection(population).fitness];
  new SimTrack('random:123:3');actual.push(again.tournamentSelection(population).fitness);
  assert.deepEqual(actual,expected);again.dispose();
});

test('plusieurs pistes procédurales : pas de mutation entre les essais du même génome',()=>{
  const cfg=config({tracks:['random:10:1','random:11:1'],circuitSeed:10,randomCount:2});
  const sim=new Evolution(cfg),weights=plain(sim.cars[0].brain.serialize());
  sim.cars.forEach(car=>car.dead=true);sim.finishTrack();
  assert.equal(sim.track.id,'random:11:1');assert.equal(sim.generation,1);
  assert.deepEqual(plain(sim.cars[0].brain.serialize()),weights);
  sim.cars.forEach(car=>car.dead=true);sim.finishTrack();
  assert.equal(sim.generation,2);assert.equal(sim.champion.evaluations.length,2);
  const data=BrainStore.parse(JSON.stringify(sim.exportBest('Procédural')));
  assert.deepEqual(plain(data.config.tracks),plain(cfg.tracks));
  assert.equal(data.training.seenTracks.length,2);sim.dispose();
});

test('test inédit exclut les graines apprises et préserve la provenance après reprise',()=>{
  const cfg=config({tracks:['random:0:2']}),sim=new Evolution(cfg);
  const saved=sim.exportBest('Premier');sim.dispose();
  const seed=Brain.fromData(saved.config,saved.weights);
  const resumed=new Evolution(config({tracks:['random:1:2']}),seed,CircuitGenerator.knownTracks([saved]));seed.dispose();
  const data=resumed.exportBest('Repris');resumed.dispose();
  const track=CircuitGenerator.freshId([data],110,3,()=>0);
  assert.ok(track.recipe.seed!==0&&track.recipe.seed!==1);
  assert.equal(data.training.seenTracks.length,2);
  const bad=plain(data);bad.training.seenTracks=[{track:'random:-2:2',width:110}];
  assert.throws(()=>BrainStore.parse(JSON.stringify(bad)));
});

test('signature des pistes ne dépend pas du point de départ et empêche les doublons exacts',()=>{
  const track=new SimTrack('random:3:2');
  const shifted={path:[...track.path.slice(4),...track.path.slice(0,4)].reverse()};
  assert.equal(CircuitGenerator.signature(track),CircuitGenerator.signature(shifted));
});

test('test de généralisation : un seul cerveau, poids figés et bilan sans réussite fabriquée',()=>{
  const data=entry('Essai'),original=JSON.stringify(data),track=CircuitGenerator.freshId([data],110,1,()=>.42);
  const race=new SimRace([data],track.id,110,5,.5,1,{evaluation:true,track});
  assert.equal(race.cars.length,1);assert.equal(race.evaluation,true);
  const before=plain(race.cars[0].brain.serialize());
  for(let i=0;i<7200&&!race.finished;i++)race.step();
  const result=race.results()[0];
  assert.equal(race.finished,true);assert.ok(result.progress>=0&&result.progress<=100);
  assert.equal(result.finished,race.cars[0].finished);
  assert.deepEqual(plain(race.cars[0].brain.serialize()),before);
  assert.equal(JSON.stringify(data),original);race.dispose();
});

test('audit TP : prédictions et mutation identiques au NeuralNetwork fourni à poids/tirages égaux',()=>{
  const math=Object.create(Math);math.random=()=>0;
  const scope=vm.createContext({tf,Math:math,randomGaussian:()=>.125});
  vm.runInContext(readFileSync(new URL('../../9b - Voiture suit circuit version 2/js/NeuralNetwork.js',import.meta.url),'utf8'),scope);
  const Reference=vm.runInContext('NeuralNetwork',scope),cfg=config(),brain=new Brain(cfg);
  const reference=new Reference(8,4,2);
  tf.tidy(()=>reference.model.setWeights(brain.serialize().map(item=>tf.tensor(item.values,item.shape))));
  for(const inputs of [Array(8).fill(0),Array(8).fill(1),[.1,.2,.3,.4,.5,.6,.7,.8]]) assert.deepEqual(Array.from(reference.predict(inputs)),Array.from(brain.predict(inputs)));
  reference.mutate(1);brain.mutate(1,.125,()=>0,()=>.125);
  const expected=tf.tidy(()=>reference.model.getWeights().map(weight=>Array.from(weight.dataSync())));
  assert.deepEqual(plain(brain.serialize().map(item=>item.values)),expected);
  reference.dispose();brain.dispose();
});

test('audit TP : Car.think donne les mêmes forces, démarrage inclus, si braquage = maxForce',()=>{
  const scope=vm.createContext({p5:{Vector},GAME_SPEED_LIMIT:5,
    map:(n,a,b,c,d)=>c+(n-a)*(d-c)/(b-a),max:Math.max});
  vm.runInContext(readFileSync(new URL('../../9b - Voiture suit circuit version 2/js/Car.js',import.meta.url),'utf8'),scope);
  const Reference=vm.runInContext('Car',scope),cfg=config(),brain=constantBrain(cfg,.7,.2),car=new SimCar(brain,cfg,new SimTrack(),0);
  for(const age of [0,29,30,120]) for(const force of [.05,.5,1.2]) {
    car.maxForce=force;car.config={...cfg,turn:force};car.age=age;car.acc.set(0,0);
    const inputs=Array(8).fill(.3);car.look=()=>inputs;
    let expected;
    const original={frameCount:age,maxForce:force,vel:car.vel.copy(),brain,look:()=>inputs,applyForce:value=>{expected=value;}};
    Reference.prototype.think.call(original,[]);car.think([]);
    assert.ok(Vector.dist(expected,car.lastForce)<1e-10);
    assert.ok(car.lastForce.mag()<=force+1e-9);
  }
  brain.dispose();
});

test('audit TP : le tournoi sélectionne le même parent pour les mêmes tirages',()=>{
  const draws=[.1,.2,.8,.5,.1],population=[{fitness:1},{fitness:4},{fitness:7},{fitness:2}];
  let i=0;
  const scope=vm.createContext({random:n=>draws[i++]*n});
  vm.runInContext(readFileSync(new URL('../../9b - Voiture suit circuit version 2/js/Genetic.js',import.meta.url),'utf8'),scope);
  const original=vm.runInContext('tournamentSelection',scope);
  const expected=original(population),sim=new Evolution(config());i=0;
  assert.equal(sim.tournamentSelection(population,()=>draws[i++]),expected);sim.dispose();
});
