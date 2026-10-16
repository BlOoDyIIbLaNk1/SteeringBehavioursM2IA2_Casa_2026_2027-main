const previewScenario = document.currentScript.dataset.scenario;
function configurePreview() {
  game.started = true;
  game.wave = 3;
  game.sector = sectorProfile(3);
  game.enemies = [new Enemy(width - 150, 200, 'hunter')];
  game.enemies[0].game = game;
  game.pickups = [new Pickup(70, height / 2, 'xp', 3)];
  game.player.hp = 100000;
  game.player.maxHp = 100000;
  mouseX = width / 2;
  mouseY = height / 2;
  for (const name of ['rail', 'frost', 'magnet', 'shield', 'armor']) game.weaponSystem.upgrade(name, game.player);
  if (previewScenario === 'sanctuary' || previewScenario === 'arrival') {
    game.enemies = [];
    game.wave = 1;
    game.startWave();
    if (previewScenario === 'arrival') {
      game.player.pos = game.destination.pos.copy().add(createVector(-280, 0));
      game.updateCamera();
    }
  } else if (previewScenario === 'boss' || previewScenario === 'benchmark' || previewScenario === 'death') {
    game.wave = previewScenario === 'death' ? 0 : 14;
    game.startWave();
    game.enemies = [];
    game.advanceMission();
    if (previewScenario === 'benchmark') {
      randomSeed(42);
      for (const [name, item] of Object.entries(UpgradeCatalog)) {
        if (item.type === 'weapon') game.weaponSystem.upgrade(name, game.player);
      }
      for (let index = 0; index < 40; index++) {
        const position = game.player.pos.copy().add(p5.Vector.fromAngle(index * TWO_PI / 40).setMag(280 + index % 3 * 40));
        const enemy = new Enemy(position.x, position.y, index % 2 ? 'hunter' : 'drone');
        enemy.game = game;
        enemy.orbitOffset = index;
        game.enemies.push(enemy);
      }
      for (const enemy of game.enemies) enemy.hp = enemy.maxHp = 100000;
      game.boss.maxHp = 400000;
      const cage = game.activateSingularity();
      cage.life = cage.maxLife = 3600;
      game.collectDrops = () => {};
      installBenchmark();
    } else if (previewScenario === 'death') {
      game.boss.hp = game.boss.maxHp = 100000;
      const trigger = document.createElement('button');
      trigger.textContent = 'DÉCLENCHER L’EXPLOSION (TEST)';
      trigger.style.cssText = 'position:fixed;top:180px;left:28px;z-index:30;padding:12px;background:#d9c9a5;color:#17202c;border:0;border-radius:8px';
      trigger.addEventListener('click', () => {
        game.boss.dead = true;
        game.beginBossDeath();
        trigger.remove();
      });
      document.body.append(trigger);
      const originalDraw = game.draw;
      game.draw = function () {
        originalDraw.call(this);
        if (this.bossDeath) document.documentElement.dataset.deathPhase = this.bossDeath.life < 80 && this.bossDeath.life > 25 ? 'middle' : 'edge';
      };
    }
  } else if (previewScenario === 'transition') {
    game.wave = 0;
    game.startWave();
    game.completeSector();
  } else if (previewScenario === 'combat') {
    for (const [name, item] of Object.entries(UpgradeCatalog)) {
      if (item.type === 'weapon') game.weaponSystem.upgrade(name, game.player);
    }
    for (let index = 0; index < 3; index++) game.spawnAllyDrone();
    game.enemies[0].hp = 100000;
  } else if (previewScenario === 'pause') {
    game.paused = true;
  } else {
    game.levelUp = true;
    game.options = ['torpedo', 'magnet', 'frost'];
  }
}

function installBenchmark() {
  const timings = { update: [], draw: [], hud: [], background: [] };
  const wrap = (object, name, bucket) => {
    const original = object[name];
    object[name] = function (...args) {
      const start = performance.now();
      const result = original.apply(this, args);
      timings[bucket].push(performance.now() - start);
      if (timings[bucket].length > 360) timings[bucket].shift();
      return result;
    };
  };
  wrap(game, 'update', 'update');
  wrap(game, 'draw', 'draw');
  wrap(flightHud, 'update', 'hud');
  const originalBackground = drawSpaceBackground;
  drawSpaceBackground = function () {
    const start = performance.now();
    originalBackground();
    timings.background.push(performance.now() - start);
    if (timings.background.length > 360) timings.background.shift();
    if (frameCount % 60 === 0) {
      const report = Object.fromEntries(Object.entries(timings).map(([key, samples]) => {
        const sorted = [...samples].sort((a, b) => a - b);
        return [key, { mean: samples.reduce((sum, value) => sum + value, 0) / (samples.length || 1), p95: sorted[Math.floor(sorted.length * 0.95)] || 0 }];
      }));
      document.documentElement.dataset.benchmark = JSON.stringify({
        ...report, fps: frameRate(), frames: frameCount,
        enemies: game.enemies.length, shots: game.projectiles.length, particles: game.particles.length,
        cages: game.fields.length
      });
      if (frameCount >= 240) document.documentElement.dataset.benchmarkReady = 'true';
    }
  };
}

// The p5 global setup may have completed before this fixture is appended to srcdoc.
if (typeof flightHud !== 'undefined' && flightHud) configurePreview();
else {
  const productionSetup = setup;
  setup = function () {
    productionSetup();
    configurePreview();
  };
}
