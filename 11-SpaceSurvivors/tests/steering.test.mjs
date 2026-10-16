import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { this.x /= n; this.y /= n; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  magSq() { return this.x * this.x + this.y * this.y; }
  setMag(n) { const m = this.mag(); return m ? this.mult(n / m) : this; }
  limit(n) { if (this.mag() > n) this.setMag(n); return this; }
}
globalThis.createVector = (x, y) => new Vector(x, y);
globalThis.p5 = { Vector: { sub: (a, b) => a.copy().sub(b), dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y) } };
const scope = vm.createContext({ createVector, p5, constrain: (n, a, b) => Math.min(b, Math.max(a, n)) });
vm.runInContext(readFileSync(new URL('../../1-Seek/vehicle.js', import.meta.url), 'utf8'), scope);
vm.runInContext(readFileSync(new URL('../steering.js', import.meta.url), 'utf8'), scope);
const Steering = vm.runInContext('Steering', scope);
// Charge aussi l'implémentation du TP d'arrivée/poursuite pour comparer ses forces.
const tpScope = vm.createContext({
  createVector, p5,
  map: (n, a, b, c, d) => c + (n - a) * (d - c) / (b - a),
  fill() {}, circle() {}
});
vm.runInContext(readFileSync(new URL('../../3-Arrival_correction/vehicle.js', import.meta.url), 'utf8'), tpScope);
const TPVehicle = vm.runInContext('Vehicle', tpScope);

test('seek construit desired - current et respecte maxForce', () => {
  const agent = { pos: createVector(0, 0), vel: createVector(0, 3), maxSpeed: 5, maxForce: 0.4 };
  const force = Steering.seek(agent, createVector(100, 0));
  assert.ok(force.mag() <= 0.4 + 1e-9);
  assert.ok(force.x > 0);
  assert.ok(force.y < 0);
});

test('seek renvoie une force nulle sur une cible confondue', () => {
  const agent = { pos: createVector(2, 2), vel: createVector(0, 0), maxSpeed: 5, maxForce: 0.4 };
  const force = Steering.seek(agent, createVector(2, 2));
  assert.equal(force.mag(), 0);
});

test('arrive produit les mêmes forces que le TP, près, loin et sur la cible', () => {
  const reference = new TPVehicle(0, 0);
  reference.maxSpeed = 5;
  reference.maxForce = 0.4;
  reference.rayonZoneDeFreinage = 160;
  reference.vel = createVector(0.2, -0.3);
  for (const target of [createVector(400, 100), createVector(40, 20), createVector(0, 0)]) {
    const actual = Steering.arrive(reference, target, 160);
    const expected = reference.arrive(target);
    assert.ok(Math.abs(actual.x - expected.x) < 1e-10);
    assert.ok(Math.abs(actual.y - expected.y) < 1e-10);
    assert.ok(actual.mag() <= reference.maxForce + 1e-10);
  }
});

test('pursue utilise la même anticipation vectorielle que le TP avec horizon paramétrable', () => {
  const reference = new TPVehicle(10, 20);
  reference.vel = createVector(1, 2);
  const target = {pos: createVector(240, 70), vel: createVector(-2, 3)};
  const expected = reference.pursue(target);
  const actual = Steering.pursue(reference, target, 10);
  assert.ok(Math.abs(actual.x - expected.x) < 1e-10);
  assert.ok(Math.abs(actual.y - expected.y) < 1e-10);
  assert.ok(actual.mag() <= reference.maxForce + 1e-10);
  assert.equal(target.pos.x, 240);
  assert.equal(target.vel.y, 3);
});
