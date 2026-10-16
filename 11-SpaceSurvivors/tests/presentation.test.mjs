import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scope = vm.createContext({ Math });
for (const file of ['SpaceBackdrop.js', 'NavigationHud.js']) {
  vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), scope);
}
const { SpaceBackdrop, NavigationHud } = vm.runInContext('({SpaceBackdrop, NavigationHud})', scope);

test('fond: reste continu autour des anciens seuils de retour à zéro', () => {
  for (const boundary of [-1440, -720, 0, 720, 1440]) {
    const before = SpaceBackdrop.layout(1280, 720, 1672, 941, boundary - 0.01, boundary - 0.01, 2);
    const after = SpaceBackdrop.layout(1280, 720, 1672, 941, boundary + 0.01, boundary + 0.01, 2.00001);
    assert.ok(Math.abs(before.x - after.x) < 0.01);
    assert.ok(Math.abs(before.y - after.y) < 0.01);
  }
});

test('fond: couvre toujours le canvas et garde les proportions de l’image', () => {
  for (const [width, height] of [[1280, 720], [360, 800], [3440, 1440], [800, 360]]) {
    for (const position of [-1e8, -720, 0, 720, 1e8]) {
      for (const time of [0, 10, 1000]) {
        const box = SpaceBackdrop.layout(width, height, 1672, 941, position, -position, time);
        assert.ok(box.x <= 0 && box.y <= 0);
        assert.ok(box.x + box.width >= width && box.y + box.height >= height);
        assert.ok(Math.abs(box.width / box.height - 1672 / 941) < 1e-10);
      }
    }
  }
});

test('navigation: flèche visible pour toute direction, même hors écran et sur mobile', () => {
  const origin = {x: 5000, y: -3000};
  for (const [width, height] of [[1280, 720], [360, 800], [800, 360]]) {
    for (const [dx, dy, angle] of [[4000, 0, 0], [0, 4000, 90], [-4000, 0, 180], [0, -4000, -90], [4000, -4000, -45]]) {
      const marker = NavigationHud.project(origin, { x: origin.x + dx, y: origin.y + dy }, width, height);
      assert.equal(marker.angle, angle);
      assert.ok(marker.x >= 40 && marker.x <= width - 40);
      assert.ok(marker.y >= 65 && marker.y <= height - 65);
      assert.equal(marker.offscreen, true);
      assert.ok(Math.abs(marker.distance - Math.hypot(dx, dy)) < 1e-9);
    }
  }
});

test('navigation: distance exacte et pas de NaN au contact de la destination', () => {
  const marker = NavigationHud.project({x: 10, y: 10}, {x: 10, y: 10}, 1280, 720);
  assert.equal(marker.distance, 0);
  assert.ok(Number.isFinite(marker.x) && Number.isFinite(marker.y) && Number.isFinite(marker.angle));
  const near = NavigationHud.project({x: 0, y: 0}, {x: 80, y: 30}, 1280, 720);
  assert.equal(near.offscreen, false);
});

test('D synchronise la case debug, ignore la répétition et les champs de saisie', () => {
  const nodes = {'debug-toggle': {checked: false}, 'debug-legend': {hidden: true}};
  const document = {activeElement: null, getElementById: id => nodes[id]};
  const keyboard = vm.createContext({document, key: 'd', keyCode: 68, ESCAPE: 27, ENTER: 13});
  vm.runInContext(readFileSync(new URL('../sketch.js', import.meta.url), 'utf8'), keyboard);
  vm.runInContext('game = {debug: false, audio: {start() {}}, started: false, levelUp: false}', keyboard);
  vm.runInContext('keyPressed({})', keyboard);
  assert.equal(nodes['debug-toggle'].checked, true);
  assert.equal(nodes['debug-legend'].hidden, false);
  vm.runInContext('keyPressed({repeat: true})', keyboard);
  assert.equal(nodes['debug-toggle'].checked, true);
  document.activeElement = {tagName: 'INPUT'};
  vm.runInContext('keyPressed({})', keyboard);
  assert.equal(nodes['debug-toggle'].checked, true);
  document.activeElement = null;
  vm.runInContext('keyPressed({})', keyboard);
  assert.equal(nodes['debug-toggle'].checked, false);
  assert.equal(nodes['debug-legend'].hidden, true);
});
