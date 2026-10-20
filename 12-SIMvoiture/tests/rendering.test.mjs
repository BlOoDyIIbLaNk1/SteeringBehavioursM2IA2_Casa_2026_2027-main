import test from 'node:test';
import assert from 'node:assert/strict';
import {CarRenderer, SimCar, SimTrack, config, constantBrain, plain, drawTrack} from './harness.mjs';

function context() {
  const calls=[];
  const c=new Proxy({calls}, {
    get(target,key) {return key in target ? target[key] : (...args)=>calls.push([key,...args]);},
    set(target,key,value) {target[key]=value;return true;}
  });
  return c;
}

test('livrées : cache borné à douze couleurs, identités reproductibles',()=>{
  assert.equal(CarRenderer.color(0),CarRenderer.color(12));
  assert.equal(CarRenderer.color(-1),CarRenderer.color(11));
  assert.equal(new Set(Array.from({length:160},(_,i)=>CarRenderer.color(i))).size,12);
  // Canvas déjà précalculés : le rendu ne doit pas les recréer.
  CarRenderer.sprites.clear();
  CarRenderer.palette.forEach(color=>CarRenderer.sprites.set(color,{color}));
  const first=CarRenderer.sprite(0);
  for(let i=0;i<160;i++)assert.ok(CarRenderer.sprite(i));
  assert.equal(CarRenderer.sprite(12),first);
  assert.equal(CarRenderer.sprites.size,12);
});

test('dessin/debug : lecture seule, pas de perception ou de force recalculée',()=>{
  const cfg=config(),brain=constantBrain(cfg),car=new SimCar(brain,cfg,new SimTrack(),0);
  car.step();
  const snapshot=()=>plain({pos:car.pos,vel:car.vel,acc:car.acc,force:car.lastForce,
    age:car.age,inputs:car.inputs,outputs:car.outputs,weights:brain.serialize()});
  const before=snapshot();
  car.think=car.look=car.applyForce=car.update=()=>{throw new Error('Le rendu ne pilote pas');};
  for(const dead of [false,true])for(const finished of [false,true]) {
    car.dead=dead;car.finished=finished;
    const c=context();CarRenderer.draw(c,car,true,true,true);
    assert.equal(c.calls.filter(([name])=>name==='drawImage').length,1);
    assert.equal(c.calls.filter(([name])=>name==='save').length,c.calls.filter(([name])=>name==='restore').length);
    assert.deepEqual(snapshot(),before);
  }
  brain.dispose();
});

test('debug : rayons absents, vitesse et force nulles, capteur proche et arrivée',()=>{
  const cfg=config(),brain=constantBrain(cfg),car=new SimCar(brain,cfg,new SimTrack(),0);
  car.vel.mult(0);car.lastForce.mult(0);
  car.rays[0].end=car.pos.copy();car.inputs[0]=.81;
  const c=context();CarRenderer.debug(c,car);
  const cp=car.track.checkpoints[car.checkpointIndex];
  assert.ok(c.calls.some(([name,x,y])=>name==='moveTo'&&x===cp.a.x&&y===cp.a.y));
  assert.ok(c.calls.some(([name])=>name==='fillRect'));
  car.finished=true;
  const done=context();CarRenderer.debug(done,car);
  assert.ok(!done.calls.some(([name,x,y])=>name==='moveTo'&&x===cp.a.x&&y===cp.a.y));
  brain.dispose();
});

test('habillage circuit : mêmes murs et checkpoints, chemin généré et fixe',()=>{
  for(const id of ['aurora','random:42:2']) {
    const track=new SimTrack(id),before=plain({path:track.path,walls:track.walls,cp:track.checkpoints});
    for(const checkpoints of [true,false]) {
      const c=context();drawTrack(track,c,checkpoints);
      assert.ok(c.calls.some(([name,rule])=>name==='fill'&&rule==='evenodd'));
      assert.ok(c.calls.some(([name,dash])=>name==='setLineDash'&&dash.length===2&&dash[0]===12));
      assert.equal(c.calls.filter(([name])=>name==='save').length,c.calls.filter(([name])=>name==='restore').length);
    }
    assert.deepEqual(plain({path:track.path,walls:track.walls,cp:track.checkpoints}),before);
  }
});

test('aperçu garage : même sprite et numéro que le véhicule sélectionné',()=>{
  const c=context(),canvas={width:280,height:96,getContext:()=>c};
  CarRenderer.preview(canvas,13);
  assert.ok(c.calls.some(([name,text])=>name==='fillText'&&text==='#14'));
  assert.ok(c.calls.some(([name,sprite])=>name==='drawImage'&&sprite===CarRenderer.sprite(13)));
  assert.ok(c.calls.some(([name,x,y,w,h])=>name==='clearRect'&&w===280&&h===96));
});
