import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function load() {
  class Vector {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    copy() { return new Vector(this.x, this.y); }
    set(x, y) { this.x = x; this.y = y; return this; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    div(n) { return this.mult(1 / n); }
    mag() { return Math.hypot(this.x, this.y); }
    magSq() { return this.x ** 2 + this.y ** 2; }
    normalize() { return this.mag() ? this.div(this.mag()) : this; }
    setMag(n) { return this.normalize().mult(n); }
    limit(n) { return this.mag() > n ? this.setMag(n) : this; }
    heading() { return Math.atan2(this.y, this.x); }
    rotate(a) { const x = this.x; this.x = x * Math.cos(a) - this.y * Math.sin(a); this.y = x * Math.sin(a) + this.y * Math.cos(a); return this; }
    static fromAngle(a) { return new Vector(Math.cos(a), Math.sin(a)); }
    static random2D() { return new Vector(1, 0); }
    static sub(a, b) { return a.copy().sub(b); }
    static dist(a, b) { return a.copy().sub(b).mag(); }
  }
  const scope = vm.createContext({
    console, Set, Math, width: 1280, height: 720, frameCount: 240,
    createVector: (x, y) => new Vector(x, y), p5: { Vector },
    constrain: (n, a, b) => Math.min(b, Math.max(a, n)),
    random: (a = 1, b) => b === undefined ? a * 0.5 : a + (b - a) * 0.5,
    floor: Math.floor, TWO_PI: Math.PI * 2, mouseX: 640, mouseY: 360,
    millis: () => 1000, AudioSystem: class { boss() {} levelUp() {} hit() {} shot() {} }
  });
  for (const file of ['../1-Seek/vehicle.js', 'steering.js', 'SpaceVehicle.js', 'SpatialGrid.js', 'Player.js', 'OrbitalCannon.js', 'AllyDrone.js', 'Enemy.js', 'Boss.js', 'ArenaGuard.js', 'BossArena.js', 'EnemyProjectile.js', 'Projectile.js', 'Pickup.js', 'AttackEffect.js', 'Particle.js', 'BossDeathEffect.js', 'SingularityField.js', 'ShelterBubble.js', 'DestinationGate.js', 'UpgradeCatalog.js', 'WeaponSystem.js', 'Game.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), scope);
  }
  const exports = vm.runInContext('({ Vehicle, SpaceVehicle, SpatialGrid, ArenaGuard, BossArena, BossDeathEffect, OrbitalCannon, AllyDrone, SingularityField, ShelterBubble, DestinationGate, Particle, AttackEffect, EnemyProjectile, Steering, WeaponSystem, SpaceSurvivorsGame, Boss, Player, Enemy, Projectile, Pickup, UpgradeCatalog, createVector, sectorProfile, SECTOR_COUNT })', scope);
  exports.setFrame = value => { scope.frameCount = value; };
  return exports;
}

test('améliorations: choix uniques, niveaux plafonnés, coque et bouclier', () => {
  const { WeaponSystem, Player } = load();
  const weapons = new WeaponSystem();
  const player = new Player(100, 100);
  for (let i = 0; i < 10; i++) weapons.upgrade('laser', player);
  assert.equal(weapons.levels.laser, 8);
  assert.ok(weapons.evolved.has('laser'));
  const options = weapons.upgradeOptions(() => 0.5);
  assert.equal(new Set(options).size, 3);
  assert.ok(!options.includes('laser'));
  weapons.upgrade('shield', player);
  weapons.upgrade('hull', player);
  assert.equal(player.shield, 25);
  assert.equal(player.maxHp, 125);
  weapons.upgrade(undefined, player);
  assert.ok(!Object.hasOwn(weapons.levels, 'undefined'));
});

test('laser évolué: trois tirs perforants, dégâts augmentés', () => {
  const { WeaponSystem, Player } = load();
  const weapons = new WeaponSystem();
  weapons.levels.laser = 8;
  weapons.evolved.add('laser');
  const projectiles = [];
  weapons.fire(new Player(100, 100), [], projectiles);
  assert.equal(projectiles.length, 3);
  assert.ok(projectiles.every(p => p.evolved && p.pierce === 3 && p.damage > 32));
});

test('canon par défaut: véhicule orbital, tir déporté et rotation accélérée par le niveau', () => {
  const { OrbitalCannon, Vehicle, WeaponSystem, Player, setFrame } = load();
  const player = new Player(100, 100);
  const slow = new OrbitalCannon(player);
  const fast = new OrbitalCannon(player);
  slow.updateCannon(1);
  fast.updateCannon(8);
  assert.ok(slow instanceof Vehicle);
  assert.equal(slow.applyForce, Vehicle.prototype.applyForce);
  assert.ok(fast.angularSpeed > slow.angularSpeed);
  assert.ok(fast.maxSpeed > slow.maxSpeed);

  const system = new WeaponSystem();
  system.levels.laser = 8;
  system.evolved.add('laser');
  setFrame(0);
  const shots = [];
  system.fire(player, [], shots);
  assert.equal(shots.length, 3);
  assert.equal(shots[0].pos.x, system.primaryCannon.pos.x);
  assert.equal(shots[0].pos.y, system.primaryCannon.pos.y);
  assert.ok(shots[0].vel.mag() > 8);
});

test('ricochet: la vitesse du projectile augmente à chaque niveau', () => {
  const { WeaponSystem, Player, setFrame } = load();
  const speedAt = level => {
    const system = new WeaponSystem();
    system.levels.laser = 0;
    system.levels.ricochet = level;
    const shots = [];
    setFrame(0);
    system.fire(new Player(100, 100), [], shots);
    assert.equal(shots.length, 1);
    return shots[0].vel.mag();
  };
  assert.ok(speedAt(8) > speedAt(1));
  assert.equal(speedAt(1), 6.75);
  assert.equal(speedAt(8), 12);
});

test('perforation: un ennemi ne reçoit pas deux fois le même projectile', () => {
  const { Projectile, createVector } = load();
  const shot = new Projectile(100, 100, createVector(0, 0), 10);
  shot.pierce = 3;
  const enemy = { pos: createVector(100, 100), radius: 10, hp: 100 };
  shot.updateProjectile([enemy]);
  shot.updateProjectile([enemy]);
  assert.equal(enemy.hp, 90);
  assert.equal(shot.pierce, 2);
});

test('boss: phases inclusives et salves croissantes', () => {
  const { Boss, Player } = load();
  const boss = new Boss(200, 200, 15);
  const player = new Player(640, 360);
  boss.hp = boss.maxHp * 0.3;
  boss.attackClock = 100;
  const shots = [];
  boss.updateAgainst(player, [boss], shots);
  assert.equal(boss.phase, 3);
  assert.equal(shots.length, 20);
  assert.ok(shots.every(p => !p.homing));
  assert.ok(boss.vel.mag() <= boss.maxSpeed);
});

test('cycle de partie: titre, pause, défaite, victoire et reprise', () => {
  const { SpaceSurvivorsGame } = load();
  const game = new SpaceSurvivorsGame();
  game.update();
  assert.equal(game.wave, 0);
  game.started = true;
  game.paused = true;
  game.update();
  assert.equal(game.wave, 0);
  game.wave = 15;
  game.startWave();
  assert.ok(game.victory && game.gameOver);
  const audio = game.audio;
  game.reset();
  assert.equal(game.audio, audio);
  assert.ok(!game.gameOver && !game.started);
  game.choose(99);
  assert.ok(!Object.hasOwn(game.weaponSystem.levels, 'undefined'));
});

test('26 choix au total: 19 armes et 7 bonus, tous améliorables sans dépasser 8', () => {
  const { UpgradeCatalog, WeaponSystem, Player } = load();
  assert.equal(Object.values(UpgradeCatalog).filter(item => item.type === 'weapon').length, 19);
  assert.equal(Object.values(UpgradeCatalog).filter(item => item.type === 'bonus').length, 7);
  const system = new WeaponSystem();
  const player = new Player(100, 100);
  for (const name of Object.keys(UpgradeCatalog)) {
    system.upgrade(name, player);
    const firstLevel = system.levels[name];
    system.upgrade(name, player);
    assert.equal(system.levels[name], firstLevel + 1, name);
  }
  assert.equal(player.magnetRadius, 280);
  assert.ok(player.maxSpeed > 5.5);
  assert.equal(player.armor, 0.14);
  assert.equal(player.regeneration, 1);
  assert.equal(player.damageMultiplier, 1.24);
});

test('dix nouvelles armes: émission et propriétés de combat réelles', () => {
  const { UpgradeCatalog, WeaponSystem, Player, createVector } = load();
  for (const [name, item] of Object.entries(UpgradeCatalog).filter(([, item]) => item.interval && !item.sweep && !item.field)) {
    const system = new WeaponSystem();
    system.levels.laser = 0;
    const player = new Player(100, 100);
    system.upgrade(name, player);
    const shots = [];
    system.fire(player, [{ pos: createVector(400, 100), dead: false }], shots);
    assert.equal(shots.length, item.count || 1, name);
    assert.ok(shots.every(shot => shot.style === name && shot.damage > item.damage));
    assert.equal(shots[0].homing, Boolean(item.homing));
    assert.equal(shots[0].slows, Boolean(item.slow));
    assert.equal(shots[0].burns, Boolean(item.burn));
    system.fire(player, [], shots);
    assert.equal(shots.length, item.count || 1, 'cooldown');
  }
});

test('XP: attraction inclusive, vitesse bornée, repos lointain et persistance', () => {
  const { Pickup, Player } = load();
  const player = new Player(400, 300);
  const far = new Pickup(100, 300, 'xp');
  for (let i = 0; i < 100; i++) far.updateToward(player);
  assert.equal(far.pos.x, 100);
  assert.equal(far.life, Infinity);
  const near = new Pickup(210, 300, 'xp');
  near.updateToward(player);
  assert.ok(near.pos.x > 210);
  assert.ok(near.vel.mag() <= near.maxForce);
  for (let i = 0; i < 20; i++) near.updateToward(player);
  assert.ok(near.vel.mag() > 3 && near.vel.mag() <= 14);
});

test('effets: ralentissement, brûlure et explosion atteignent les ennemis', () => {
  const { Projectile, Enemy, Player, createVector } = load();
  const enemy = new Enemy(100, 100);
  enemy.hp = 100;
  const neighbor = new Enemy(120, 100);
  neighbor.hp = 100;
  const shot = new Projectile(100, 100, createVector(0, 0), 20, 'torpedo');
  shot.splash = 85;
  shot.slows = true;
  shot.burns = true;
  shot.updateProjectile([enemy, neighbor]);
  assert.equal(enemy.hp, 80);
  assert.equal(neighbor.hp, 87);
  assert.equal(enemy.slowFrames, 120);
  const speed = enemy.maxSpeed;
  enemy.updateAgainst(new Player(400, 100), [enemy]);
  assert.ok(enemy.hp < 80);
  assert.equal(enemy.maxSpeed, speed);
});

test('XP importante: les choix de niveaux sont consommés successivement', () => {
  const { Player } = load();
  const player = new Player(100, 100);
  assert.ok(player.addXp(80));
  assert.equal(player.level, 2);
  assert.ok(player.consumeLevel());
  assert.equal(player.level, 3);
  assert.ok(player.consumeLevel());
  assert.equal(player.level, 4);
  assert.equal(player.consumeLevel(), false);
});

test('tous les équipements maximisés: restauration disponible sans niveau 9', () => {
  const { WeaponSystem, Player } = load();
  const system = new WeaponSystem();
  const player = new Player(100, 100);
  for (const name of Object.keys(system.levels)) {
    while (system.levels[name] < 8) system.upgrade(name, player);
  }
  player.hp = 1;
  player.shield = 0;
  const options = system.upgradeOptions(() => 0.5);
  assert.ok(options.includes('hull') && options.includes('shield'));
  system.upgrade('hull', player);
  system.upgrade('shield', player);
  assert.equal(player.hp, 46);
  assert.equal(player.shield, player.maxShield);
  assert.equal(system.levels.hull, 8);
  assert.equal(system.levels.shield, 8);
});

test('toutes les entités du monde héritent du Vehicle du TP et de son applyForce', () => {
  const { Vehicle, SpaceVehicle, Player, AllyDrone, SingularityField, Enemy, Boss, Projectile, EnemyProjectile, Pickup, Particle, AttackEffect, createVector } = load();
  const player = new Player(100, 100);
  const entities = [
    new SpaceVehicle(100, 100), player, new AllyDrone(player, 0), new SingularityField(100, 100, 300), new Enemy(100, 100),
    new Boss(100, 100, 3), new Projectile(100, 100, createVector(2, 0), 10),
    new EnemyProjectile(100, 100, createVector(2, 0)), new Pickup(100, 100, 'xp'),
    new Particle(100, 100, '#ffffff', createVector(1, 0)), new AttackEffect(100, 100)
  ];
  for (const entity of entities) {
    assert.ok(entity instanceof Vehicle, entity.constructor.name);
    assert.equal(entity.applyForce, Vehicle.prototype.applyForce);
  }
});

test('vol libre: le Vehicle traverse les anciennes limites écran sans téléportation', () => {
  const { SpaceVehicle, createVector } = load();
  const ship = new SpaceVehicle(1279, 360);
  ship.vel = createVector(4, 0);
  ship.update();
  assert.ok(ship.pos.x > 1280);
  assert.equal(ship.pos.y, 360);
});

test('SWARM: vingt missiles traversent le champ et perforent les ennemis croisés', () => {
  const { UpgradeCatalog, WeaponSystem, Player, createVector } = load();
  const system = new WeaponSystem();
  system.levels.laser = 0;
  const player = new Player(640, 360);
  player.game = { cameraBounds: { left: 0, right: 1280, top: 0, bottom: 720 }, audio: { shot() {} } };
  system.upgrade('swarm', player);
  const shots = [];
  const enemies = [{ pos: createVector(700, 350), dead: false }, { pos: createVector(800, 370), dead: false }];
  system.fire(player, enemies, shots);
  assert.equal(UpgradeCatalog.swarm.count, 20);
  assert.equal(shots.length, 20);
  assert.ok(shots.every(shot => shot.sweep && !shot.homing && shot.pierce > enemies.length));
  assert.ok(shots.every(shot => shot.pos.x < 0 || shot.pos.x > 1280 || shot.pos.y < 0 || shot.pos.y > 720));
});

test('cage gravitationnelle: attire les ennemis visibles et contracte son anneau', () => {
  const { SingularityField, Enemy } = load();
  const field = new SingularityField(0, 0, 500, 210);
  const enemy = new Enemy(490, 0, 'drone');
  field.updateField([enemy]);
  assert.equal(enemy.caged, true);
  assert.ok(enemy.acc.x < 0);
  enemy.pos.x = 480;
  field.updateField([enemy]);
  assert.ok(field.captured.has(enemy));
  enemy.pos.x = 500;
  enemy.vel.x = 3;
  field.contain(enemy);
  assert.ok(enemy.pos.x <= field.radius - enemy.radius);
  assert.ok(enemy.vel.x <= 0);
  const firstRadius = field.radius;
  for (let i = 0; i < 60; i++) field.updateField([]);
  assert.ok(field.radius < firstRadius);
  const farEnemy = new Enemy(2000, 0, 'drone');
  field.updateField([farEnemy]);
  assert.equal(farEnemy.caged, undefined);
  assert.equal(farEnemy.acc.mag(), 0);
});

test('niveau pair: fait apparaître des drones alliés et les limite à quatre', () => {
  const { Player, SpaceSurvivorsGame } = load();
  const game = new SpaceSurvivorsGame();
  game.player.game = game;
  const pilot = game.player;
  pilot.xp = 18;
  assert.equal(pilot.consumeLevel(), true);
  assert.equal(pilot.level, 2);
  assert.equal(game.allies.length, 1);
  for (let index = 0; index < 8; index++) game.spawnAllyDrone();
  assert.equal(game.allies.length, 4);
  const drone = game.allies[0];
  assert.equal(drone.takeDamage(10), true);
  assert.equal(drone.hp, 32);
  drone.invulnerableUntil = 0;
  drone.takeDamage(50);
  assert.equal(drone.dead, true);
  const secondPilot = new Player(100, 100);
  secondPilot.game = game;
  secondPilot.level = 1;
  secondPilot.xp = 18;
  secondPilot.consumeLevel();
  assert.equal(game.allies.length, 4);
});

test('ailier: tient sa formation par steering et tire sur une cible proche', () => {
  const { Player, AllyDrone, Enemy, Projectile, createVector } = load();
  const player = new Player(100, 100);
  const game = { allies: [], projectiles: [] };
  player.game = game;
  const drone = new AllyDrone(player, 0);
  drone.pos = createVector(200, 100);
  game.allies.push(drone);
  drone.fireCooldown = 0;
  const enemy = new Enemy(260, 100);
  drone.updateAlly([enemy], game.projectiles);
  assert.ok(drone.pos.x < 200 && drone.acc.mag() === 0);
  assert.equal(game.projectiles.length, 1);
  assert.ok(game.projectiles[0] instanceof Projectile);
});

test('un tir hostile peut sélectionner et détruire un drone allié', () => {
  const { Player, AllyDrone, EnemyProjectile, createVector } = load();
  const player = new Player(700, 600);
  const drone = new AllyDrone(player, 0);
  drone.pos = createVector(100, 100);
  const shot = new EnemyProjectile(100, 100, createVector(0, 0), 50);
  assert.equal(shot.updateAgainst([player, drone]), true);
  assert.equal(drone.dead, true);
  assert.equal(shot.life, 0);
});

test('les ennemis SWARM gardent une formation de poursuite derrière leur leader', () => {
  const { Enemy, Player, createVector } = load();
  const leader = new Enemy(200, 200, 'swarm');
  leader.vel = createVector(1, 0);
  const wing = new Enemy(100, 100, 'swarm');
  wing.formationLeader = leader;
  wing.formationOffset = createVector(-42, 30);
  wing.updateAgainst(new Player(400, 400), [leader, wing]);
  assert.ok(wing.pos.x > 100 && wing.pos.y > 100);
  assert.equal(wing.acc.mag(), 0);
});

test('locomotion héritée sur 300 pas en espace libre', () => {
  const { SpaceVehicle, createVector } = load();
  const agent = new SpaceVehicle(1200, 650, 18);
  agent.vel = createVector(3, 4);
  let x = agent.pos.x, y = agent.pos.y, vx = 3, vy = 4;
  for (let frame = 0; frame < 300; frame++) {
    const fx = Math.sin(frame * 0.1) * 0.35;
    const fy = Math.cos(frame * 0.17) * 0.35;
    vx += fx;
    vy += fy;
    const speed = Math.hypot(vx, vy);
    if (speed > agent.maxSpeed) { vx *= agent.maxSpeed / speed; vy *= agent.maxSpeed / speed; }
    x += vx;
    y += vy;
    agent.applyForce(createVector(fx, fy));
    agent.update();
    assert.ok(Math.abs(agent.pos.x - x) < 1e-9);
    assert.ok(Math.abs(agent.pos.y - y) < 1e-9);
    assert.equal(agent.acc.mag(), 0);
  }
});

test('seek réutilise la force du TP sans modifier les limites de l’agent', () => {
  const { Vehicle, SpaceVehicle, Steering, createVector } = load();
  const agent = new SpaceVehicle(100, 100);
  agent.vel = createVector(1, -2);
  const target = createVector(400, 300);
  const reference = new Vehicle(100, 100);
  reference.vel = agent.vel.copy();
  reference.maxSpeed = agent.maxSpeed;
  reference.maxForce = agent.maxForce;
  const force = Steering.seek(agent, target);
  const expected = reference.seek(target);
  assert.equal(force.x, expected.x);
  assert.equal(force.y, expected.y);
  const specialized = Steering.seek(agent, target, 9, 0.05);
  assert.ok(specialized.mag() <= 0.05 + 1e-10);
  assert.equal(agent.maxSpeed, 4);
  assert.equal(agent.maxForce, 0.18);
});

test('quinze secteurs alternent combat avec boss et trajet, jusqu’au boss final', () => {
  const { sectorProfile, SECTOR_COUNT } = load();
  assert.equal(SECTOR_COUNT, 15);
  assert.deepEqual(Array.from({ length: 15 }, (_, index) => sectorProfile(index + 1).mode), [
    'combat', 'sanctuary', 'combat', 'sanctuary', 'combat',
    'sanctuary', 'combat', 'sanctuary', 'combat', 'sanctuary',
    'combat', 'sanctuary', 'combat', 'sanctuary', 'combat'
  ]);
  assert.ok(sectorProfile(14).horde > sectorProfile(8).horde);
  assert.equal(sectorProfile(15).title, 'Le Cœur du Néant');
});

test('refuge-bulle: protection seulement à l’intérieur, entité issue du Vehicle', () => {
  const { Vehicle, ShelterBubble, Player, createVector } = load();
  const bubble = new ShelterBubble(100, 100, 150);
  assert.ok(bubble instanceof Vehicle);
  assert.equal(bubble.protects(createVector(0, 100)), true);
  assert.equal(bubble.protects(createVector(232, 100)), true);
  assert.equal(bubble.protects(createVector(232.01, 100)), false);
  assert.equal(bubble.protects(createVector(-140, 100)), false);
  const player = new Player(100, 100);
  player.game = { shelter: bubble };
  assert.equal(player.damage(40), false);
  assert.equal(player.hp, 100);
  player.pos = createVector(300, 100);
  assert.equal(player.damage(40), true);
  assert.equal(player.hp, 60);
});

test('balise: reste verrouillée jusqu’à la purge puis complète la traversée', () => {
  const { Vehicle, DestinationGate, Player } = load();
  const gate = new DestinationGate(300, 100);
  assert.ok(gate instanceof Vehicle);
  const player = new Player(300, 100);
  assert.equal(gate.reachedBy(player), false);
  gate.updateGate(true);
  assert.equal(gate.reachedBy(player), true);
  player.pos.x = gate.pos.x + gate.radius + player.radius;
  assert.equal(gate.reachedBy(player), true);
});

test('traversée: balise active immédiatement, refuges et arrivée sans tuer la horde', () => {
  const { SpaceSurvivorsGame } = load();
  const game = new SpaceSurvivorsGame();
  game.player.game = game;
  game.wave = 3;
  game.startWave();
  assert.equal(game.sector.mode, 'sanctuary');
  assert.ok(game.enemies.length >= 10);
  assert.ok(game.hordeRemaining > 0);
  assert.ok(game.shelter.protects(game.player.pos));
  assert.ok(game.destination.active);
  assert.equal(game.routeShelters.length, 2);
  assert.ok(game.isSheltered(game.routeShelters[1].pos));
  const reserveBeforeSpawn = game.hordeRemaining;
  game.hordeSpawnClock = 35;
  game.started = true;
  game.update();
  assert.equal(game.hordeRemaining, reserveBeforeSpawn - 4);
  const gate = game.destination;
  assert.ok(game.enemies.length > 0 && game.hordeRemaining > 0);
  game.started = true;
  game.player.pos = gate.pos.copy();
  game.update();
  assert.equal(game.wave, 4);
  assert.equal(game.sectorComplete.next.sector, 5);
  game.continueSector();
  assert.equal(game.wave, 5);
  assert.notEqual(game.destination, gate);
  assert.equal(game.sector.mode, 'combat');
  assert.equal(game.boss, null);
});

test('combat: la vague doit être finie avant le boss, puis vient une traversée', () => {
  const { SpaceSurvivorsGame } = load();
  const game = new SpaceSurvivorsGame();
  game.startWave();
  game.advanceMission();
  assert.equal(game.wave, 1);
  assert.equal(game.boss, null);
  game.enemies = [];
  game.advanceMission();
  const boss = game.boss;
  assert.ok(boss && game.bossSpawned && game.enemies.includes(boss));
  game.advanceMission();
  assert.equal(game.boss, boss);
  assert.equal(game.wave, 1);
  boss.dead = true;
  game.enemies = [];
  game.advanceMission();
  assert.ok(game.bossDeath);
  assert.equal(game.sectorComplete, null);
  while (game.bossDeath) game.updateBossDeath();
  assert.equal(game.sectorComplete.next.sector, 2);
  assert.equal(game.wave, 1);
  game.continueSector();
  assert.equal(game.wave, 2);
  assert.ok(game.destination.active);
});

test('traversée: vider les ennemis ne termine pas le trajet; les upgrades et alliés persistent', () => {
  const { SpaceSurvivorsGame } = load();
  const game = new SpaceSurvivorsGame();
  game.wave = 1;
  game.startWave();
  game.spawnAllyDrone();
  const ally = game.allies[0];
  game.weaponSystem.upgrade('missile', game.player);
  game.enemies = [];
  game.hordeRemaining = 0;
  game.advanceMission();
  assert.equal(game.wave, 2);
  game.enemyProjectiles.push({ life: 100 });
  game.player.pos = game.destination.pos.copy();
  game.levelUp = true;
  game.advanceMission();
  assert.equal(game.wave, 2);
  game.levelUp = false;
  game.paused = true;
  game.advanceMission();
  assert.equal(game.wave, 2);
  game.paused = false;
  game.advanceMission();
  assert.equal(game.wave, 2);
  game.continueSector();
  assert.equal(game.wave, 3);
  assert.equal(game.allies[0], ally);
  assert.equal(game.weaponSystem.levels.missile, 1);
  assert.equal(game.enemyProjectiles.length, 0);
});

test('victoire: attend la destruction du boss final au secteur quinze', () => {
  const { SpaceSurvivorsGame } = load();
  const game = new SpaceSurvivorsGame();
  game.wave = 14;
  game.startWave();
  game.enemies = [];
  game.advanceMission();
  assert.equal(game.boss.variant, 'final');
  assert.equal(game.victory, false);
  game.boss.dead = true;
  game.enemies = [];
  game.advanceMission();
  assert.equal(game.victory, false);
  while (game.bossDeath) game.updateBossDeath();
  assert.ok(game.victory && game.gameOver);
});

test('laser: conserve ses tirs dans le repère du vol libre loin de l’origine', () => {
  const { Projectile, createVector } = load();
  const shot = new Projectile(3000, -1000, createVector(8, 0), 12);
  shot.game = { cameraBounds: { left: 2400, right: 3680, top: -1360, bottom: -640 } };
  shot.updateProjectile([]);
  assert.equal(shot.life, 119);
  shot.pos.x = 3681;
  shot.updateProjectile([]);
  assert.equal(shot.life, 0);
});

test('arène: gardes Vehicle invulnérables, formation arrive limitée et libération à la mort du boss', () => {
  const { BossArena, ArenaGuard, Vehicle, Boss } = load();
  const boss = new Boss(100, 100, 1);
  const arena = new BossArena(100, 100, 300, boss);
  assert.ok(arena instanceof Vehicle);
  assert.ok(arena.guards.length >= 40);
  const guard = arena.guards[0];
  assert.ok(guard instanceof ArenaGuard && guard instanceof Vehicle);
  assert.equal(guard.applyForce, Vehicle.prototype.applyForce);
  guard.game = {debug: true};
  guard.pos.x += 30;
  guard.updateAgainst();
  assert.ok(guard.vel.x < 0);
  assert.ok(guard.debugForce.mag() <= guard.maxForce + 1e-10);
  assert.equal(guard.targetable, false);
  assert.equal(guard.invulnerable, true);
  boss.dead = true;
  arena.updateArena();
  assert.equal(arena.active, false);
  assert.ok(arena.guards.every(member => member.dead && member.hp === 0 && member.dropDone));
});

test('arène: le joueur et le boss ne peuvent pas franchir le cercle vivant', () => {
  const { BossArena, Boss, Player, createVector } = load();
  const boss = new Boss(100, 100, 1);
  const arena = new BossArena(100, 100, 300, boss);
  for (const entity of [new Player(500, 100), boss]) {
    entity.pos = createVector(500, 100);
    entity.vel = createVector(4, 0);
    arena.steerInside(entity);
    assert.ok(entity.acc.x < 0 && entity.acc.mag() <= entity.maxForce + 1e-10);
    arena.contain(entity);
    assert.ok(entity.distanceTo(arena) <= arena.radius - entity.radius);
    assert.ok(entity.vel.x <= 0);
  }
  boss.dead = true;
  arena.updateArena();
  const free = new Player(800, 100);
  arena.contain(free);
  assert.equal(free.pos.x, 800);
});

test('gardes liés: les projectiles et la singularité ne leur infligent aucun dégât', () => {
  const { BossArena, Boss, Projectile, SingularityField, createVector } = load();
  const boss = new Boss(0, 0, 1);
  const arena = new BossArena(0, 0, 300, boss);
  const guard = arena.guards[0];
  guard.hp = 100;
  const shot = new Projectile(guard.pos.x, guard.pos.y, createVector(0, 0), 30);
  shot.updateProjectile([guard]);
  assert.equal(guard.hp, 100);
  assert.equal(shot.pierce, 1);
  const field = new SingularityField(0, 0, 500);
  field.updateField([guard]);
  assert.equal(guard.acc.mag(), 0);
  assert.equal(field.captured.has(guard), false);
});

test('grille spatiale: retrouve les voisins sur les cellules négatives sans changer la séparation', () => {
  const { SpatialGrid, Enemy, Steering, createVector } = load();
  const population = Array.from({length: 80}, (_, index) => new Enemy(index * 31 - 1000, index % 3 * 35 - 20));
  const grid = new SpatialGrid(128);
  grid.rebuild(population);
  for (const agent of population) {
    const expected = Steering.separation(agent, population, 65);
    const actual = Steering.separation(agent, grid.query(agent.pos, 65), 65);
    assert.ok(Math.abs(expected.x - actual.x) < 1e-10);
    assert.ok(Math.abs(expected.y - actual.y) < 1e-10);
  }
  assert.equal(grid.query(createVector(10000, 10000), 10).length, 0);
});

test('plus de pression en traversée, cadence accélérée et plafonnée', () => {
  const { SpaceSurvivorsGame, WeaponSystem, Player, sectorProfile, setFrame } = load();
  assert.ok(sectorProfile(2).count >= 30 && sectorProfile(2).horde >= 120);
  const game = new SpaceSurvivorsGame();
  game.wave = 1; game.startWave();
  assert.ok(game.enemies.length >= 30);
  const system = new WeaponSystem();
  const player = new Player(100, 100);
  const shots = [];
  for (let frame = 1; frame <= 260; frame++) { setFrame(frame); system.fire(player, [], shots); }
  assert.equal(shots.length, 12);
  assert.ok(system.interval(100) < 100 && system.interval(1) >= 6);
});

test('debug: enregistre la force composée et ne modifie ni la locomotion ni applyForce', () => {
  const { SpaceVehicle, Vehicle, createVector } = load();
  const normal = new SpaceVehicle(100, 100);
  const debug = new SpaceVehicle(100, 100);
  debug.game = {debug: true};
  for (const entity of [normal, debug]) {
    entity.applyForce(createVector(0.1, -0.2));
    entity.update();
    assert.equal(entity.applyForce, Vehicle.prototype.applyForce);
  }
  assert.equal(debug.debugForce.x, 0.1);
  assert.equal(debug.debugForce.y, -0.2);
  assert.equal(debug.pos.x, normal.pos.x);
  assert.equal(debug.pos.y, normal.pos.y);
});

test('fin de secteur: tout est suspendu tant que le pilote ne confirme pas la suite', () => {
  const { SpaceSurvivorsGame } = load();
  const game = new SpaceSurvivorsGame();
  game.started = true;
  game.startWave(); game.completeSector();
  const elapsed = game.elapsed;
  const position = game.player.pos.copy();
  for (let frame = 0; frame < 20; frame++) game.update();
  assert.equal(game.elapsed, elapsed);
  assert.equal(game.player.pos.x, position.x);
  assert.equal(game.wave, 1);
  assert.equal(game.sectorComplete.next.sector, 2);
  game.continueSector();
  assert.equal(game.wave, 2);
  assert.equal(game.sectorComplete, null);
});

test('budget VFX: des impacts simultanés restent bornés sans toucher aux dégâts', () => {
  const { AttackEffect } = load();
  const game = {particles: []};
  for (let index = 0; index < 100; index++) {
    const effect = new AttackEffect(0, 0);
    effect.game = game;
    effect.updateEffect();
    assert.ok(game.particles.length <= 360);
    assert.equal(effect.life, 21);
  }
});

test('grille de collision: mêmes dégâts sur des ennemis de part et d’autre d’une cellule', () => {
  const { Enemy, SpatialGrid, Projectile, createVector } = load();
  const first = [new Enemy(-130, 0), new Enemy(-80, 0), new Enemy(0, 0)];
  const second = [new Enemy(-130, 0), new Enemy(-80, 0), new Enemy(0, 0)];
  const grid = new SpatialGrid(); grid.rebuild(second);
  new Projectile(-130, 0, createVector(0, 0), 11).updateProjectile(first);
  new Projectile(-130, 0, createVector(0, 0), 11).updateProjectile(second, grid);
  assert.deepEqual(second.map(enemy => enemy.hp), first.map(enemy => enemy.hp));
});

test('mort du boss: animation Vehicle de 105 pas, fragments hérités et menu différé', () => {
  const { SpaceSurvivorsGame, Vehicle, BossDeathEffect, Projectile, createVector } = load();
  const game = new SpaceSurvivorsGame();
  game.started = true;
  game.startWave();
  game.enemies = [];
  game.advanceMission();
  game.boss.hp = 1;
  game.projectiles.push(new Projectile(game.boss.pos.x, game.boss.pos.y, createVector(0, 0), 20, 'pulse'));
  game.update();
  assert.ok(game.bossDeath instanceof BossDeathEffect && game.bossDeath instanceof Vehicle);
  assert.equal(game.bossDeath.fragments.length, 24);
  assert.ok(game.bossDeath.fragments.every(fragment => fragment instanceof Vehicle));
  assert.equal(game.sectorComplete, null);
  assert.equal(game.levelUp, false);
  assert.equal(game.enemyProjectiles.length, 0);
  assert.equal(game.bossArena.active, false);
  assert.ok(game.bossArena.guards.every(guard => guard.dead));
  game.paused = true;
  game.update();
  assert.equal(game.bossDeath.life, 105);
  game.paused = false;
  for (let frame = 0; frame < 104; frame++) game.update();
  assert.equal(game.bossDeath.life, 1);
  assert.equal(game.sectorComplete, null);
  game.update();
  assert.equal(game.bossDeath, null);
  assert.equal(game.sectorComplete.next.sector, 2);
});
