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
  if (previewScenario === 'sanctuary' || previewScenario === 'arrival' || previewScenario === 'refuge') {
    game.enemies = [];
    game.wave = 1;
    game.startWave();
    if (previewScenario === 'refuge') {
      game.player.hp = 60; game.player.maxHp = 100;
      // Immunité réservée au scénario de contrôle pour observer l'aller-retour
      // au milieu de la horde; les dégâts normaux sont couverts par les tests.
      game.player.invulnerableUntil = Infinity;
      for (const name of ['sword', 'orbit', 'ricochet', 'missile']) {
        while (game.weaponSystem.levels[name] < 3) game.weaponSystem.upgrade(name, game.player);
      }
      game.spawnAllyDrone();
      game.collectDrops = () => {};
      let shelterTarget = game.shelter.pos.copy();
      game.player.steerToMouse = function () { this.applyForce(Steering.arrive(this, shelterTarget, 160)); };
      const refugeControl = document.createElement('button');
      let leaving = false;
      refugeControl.textContent = 'SORTIR DU REFUGE (TEST)';
      refugeControl.style.cssText = 'position:fixed;left:40%;top:20px;z-index:30;padding:10px;border:1px solid #91cec9;border-radius:8px;background:#15262c;color:#d8f1e0';
      refugeControl.addEventListener('click', () => {
        leaving = !leaving;
        shelterTarget = game.shelter.pos.copy().add(createVector(leaving ? 500 : 0, 0));
        refugeControl.textContent = leaving ? 'REVENIR AU REFUGE (TEST)' : 'SORTIR DU REFUGE (TEST)';
      });
      document.body.append(refugeControl);
      installBenchmark();
    }
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
      for (const name of ['sword', 'orbit', 'ricochet']) {
        while (game.weaponSystem.levels[name] < 8) game.weaponSystem.upgrade(name, game.player);
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
  } else if (['transition', 'results', 'victory'].includes(previewScenario)) {
    game.wave = 0;
    game.startWave();
    // Résultats obtenus par les événements de production, sans compteurs inventés.
    const target = new Enemy(game.player.pos.x + 200, game.player.pos.y);
    target.game = game;
    game.enemies = [target];
    const shot = new Projectile(target.pos.x, target.pos.y, createVector(0, 0), 100);
    shot.game = game;
    shot.updateProjectile(game.enemies);
    game.collectDrops(false);
    game.player.addXp(18);
    game.allies[0].takeDamage(100);
    if (previewScenario === 'victory') game.wave = 15;
    if (previewScenario === 'results') {
      game.player.hp = game.player.maxHp = 100;
      game.player.shield = 0;
      game.player.damage((game.player.hp + 1) / (1 - game.player.armor));
      game.gameOver = true;
    } else game.completeSector();
  } else if (previewScenario === 'arsenal') {
    for (const name of ['laser', 'sword', 'orbit', 'ricochet']) {
      while (game.weaponSystem.levels[name] < 8) game.weaponSystem.upgrade(name, game.player);
    }
    game.enemies = [];
    for (let index = 0; index < 12; index++) {
      const offset = p5.Vector.fromAngle(index * TWO_PI / 12).setMag(280);
      const enemy = new Enemy(game.player.pos.x + offset.x, game.player.pos.y + offset.y, 'drone');
      enemy.hp = 100000;
      enemy.game = game;
      game.enemies.push(enemy);
    }
    game.collectDrops = () => {};
    installBenchmark();
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
        cages: game.fields.length,
        permanent: game.projectiles.filter(shot => shot.persistent).length,
        blades: game.projectiles.filter(shot => shot.orbital).length,
        bladeRadii: game.projectiles.filter(shot => shot.orbital).map(shot => Math.round(shot.distanceTo(game.player))),
        playerHp: game.player.hp, canAttack: game.canAttack(),
        sheltered: game.isSheltered(game.player.pos),
        intruders: game.enemies.filter(enemy => game.routeShelters.some(bubble => enemy.distanceTo(bubble) < bubble.radius + enemy.radius - 0.001)).length
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
