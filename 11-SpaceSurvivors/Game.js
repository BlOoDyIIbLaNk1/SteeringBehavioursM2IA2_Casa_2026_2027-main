const SECTOR_COUNT = 15;

function sectorProfile(sector) {
  const tier = Math.floor((sector - 1) / 2);
  if (sector % 2 === 0) {
    const angles = [-0.35, 1.15, 2.45, -2.15, -1.05, 0.5, 2.9];
    return {
      sector, mode: 'sanctuary', title: 'Traversée du sanctuaire',
      hint: 'Suivez la flèche. Les bulles protègent pendant la traversée.',
      count: 30 + Math.min(tier * 3, 18), horde: 120 + tier * 18, routeAngle: angles[tier]
    };
  }
  return {
    sector, mode: 'combat',
    title: sector === SECTOR_COUNT ? 'Le Cœur du Néant' : 'Assaut du secteur',
    hint: 'Éliminez la vague, puis son gardien.',
    formation: ['patrol', 'swarm', 'hunter'][tier % 3], count: 18 + tier * 3
  };
}

class SpaceSurvivorsGame {
  constructor() { this.reset(); }
  reset() {
    this.audio?.resetMusic?.();
    this.player = new Player(width / 2, height / 2); this.weaponSystem = new WeaponSystem();
    this.audio = this.audio || new AudioSystem();
    this.player.game = this;
    this.stats = new ProgressStats();
    this.lastSectorResult = null;
    this.resultsRendered = false;
    this.enemies = []; this.projectiles = []; this.enemyProjectiles = []; this.effects = []; this.particles = []; this.pickups = []; this.wave = 0; this.spawnTimer = 0;
    this.allies = []; this.fields = [];
    this.maxEffects = 60;
    this.enemyGrid = new SpatialGrid();
    this.bossArena = null;
    this.bossDeath = null;
    this.sectorComplete = null;
    this.debug = this.debug || false;
    this.levelUp = false; this.options = []; this.paused = false; this.gameOver = false; this.boss = null;
    this.started = false;
    this.victory = false;
    this.elapsed = 0;
    this.shelter = null;
    this.routeShelters = [];
    this.destination = null;
    this.sector = null;
    this.routeLength = 0;
    this.bossSpawned = false;
    this.hordeRemaining = 0;
    this.hordeSpawnClock = 0;
    this.updateCamera();
  }

  updateCamera() {
    this.cameraOffsetX = this.player.pos.x - width / 2;
    this.cameraOffsetY = this.player.pos.y - height / 2;
    this.cameraBounds = {
      left: this.cameraOffsetX, right: this.cameraOffsetX + width,
      top: this.cameraOffsetY, bottom: this.cameraOffsetY + height
    };
  }

  spawnAllyDrone() {
    if (this.allies.length >= 4) return false;
    this.allies.push(new AllyDrone(this.player, this.allies.length));
    return true;
  }

  activateSingularity() {
    const field = new SingularityField(this.player.pos.x, this.player.pos.y, Math.min(620, Math.hypot(width, height) * 0.48));
    this.fields.push(field);
    return field;
  }

  startWave() {
    if (this.wave >= SECTOR_COUNT) {
      this.victory = true;
      this.gameOver = true;
      return;
    }
    this.wave++;
    this.stats.startSector();
    this.lastSectorResult = null;
    this.sector = sectorProfile(this.wave);
    // Une arrivée peut laisser des poursuivants en vie : clôture de la scène.
    this.enemies = [];
    this.projectiles = this.projectiles.filter(shot => shot.persistent);
    this.enemyProjectiles = [];
    this.fields = [];
    this.boss = null;
    this.bossArena = null;
    this.bossDeath = null;
    this.sectorComplete = null;
    this.bossSpawned = false;
    this.shelter = null;
    this.routeShelters = [];
    this.destination = null;
    this.routeLength = 0;
    this.hordeRemaining = 0;
    let count = this.sector.count;
    if (this.sector.mode === 'sanctuary') {
      this.hordeRemaining = this.sector.horde - count;
      this.hordeSpawnClock = 0;
      this.shelter = new ShelterBubble(this.player.pos.x, this.player.pos.y, 156);
      this.routeLength = Math.max(1600, Math.min(3000, width * 1.8)) + Math.floor(this.wave / 2) * 100;
      const route = p5.Vector.fromAngle(this.sector.routeAngle).setMag(this.routeLength);
      const end = this.player.pos.copy().add(route);
      this.destination = new DestinationGate(end.x, end.y);
      this.destination.updateGate(true);
      const midpoint = this.player.pos.copy().add(route.mult(0.5));
      this.routeShelters = [this.shelter, new ShelterBubble(midpoint.x, midpoint.y, 156)];
    }
    for (let index = 0; index < count; index++) {
      const kind = this.sector.formation === 'swarm' && index % 3 === 0 ? 'swarm'
        : this.sector.formation === 'hunter' ? (index % 3 === 0 ? 'charger' : index % 3 === 1 ? 'hunter' : 'encircler')
          : undefined;
      this.spawnEnemy(kind);
    }
  }

  isSheltered(position) {
    return this.routeShelters.some(bubble => bubble.protects(position));
  }

  canAttack() {
    return !this.isSheltered(this.player.pos);
  }

  blockProjectile(shot, start) {
    return this.routeShelters.some(bubble => bubble.blockProjectile(shot, start));
  }

  advanceMission() {
    if (!this.sector || this.gameOver || this.levelUp || this.paused || this.sectorComplete || this.bossDeath) return;
    if (this.destination) {
      // Objectif de trajet : rejoindre la balise suffit, même avec des ennemis en vie.
      if (this.destination.reachedBy(this.player)) this.completeSector();
    } else if (this.enemies.length === 0) {
      if (this.bossSpawned) {
        if (this.boss?.dead) this.beginBossDeath();
      }
      else {
        this.bossSpawned = true;
        const arenaRadius = Math.max(270, Math.min(420, height * 0.43));
        this.boss = new Boss(this.player.pos.x, this.player.pos.y - arenaRadius * 0.48, this.wave);
        this.boss.game = this;
        this.bossArena = new BossArena(this.player.pos.x, this.player.pos.y, arenaRadius, this.boss);
        for (const guard of this.bossArena.guards) guard.game = this;
        this.enemies.push(this.boss, ...this.bossArena.guards);
        this.audio.boss();
      }
    }
  }

  completeSector() {
    if (this.lastSectorResult || this.gameOver) return;
    this.stats.add('sectors');
    this.lastSectorResult = this.stats.snapshot('sector');
    if (this.wave === SECTOR_COUNT) { this.victory = true; this.gameOver = true; return; }
    this.sectorComplete = { completed: this.wave, next: sectorProfile(this.wave + 1), result: this.lastSectorResult };
  }

  beginBossDeath() {
    if (this.bossDeath || !this.boss?.dead || this.gameOver) return;
    this.bossArena?.updateArena();
    this.collectDrops(false);
    this.bossDeath = new BossDeathEffect(this.boss);
    this.enemies = [];
    this.projectiles = this.projectiles.filter(shot => shot.persistent);
    this.enemyProjectiles = [];
    this.fields = [];
    this.effects = [];
    this.particles = [];
    this.audio.bossDefeated?.();
  }

  updateBossDeath() {
    this.bossDeath.updateEffect();
    if (this.bossDeath.life <= 0) {
      this.bossDeath = null;
      this.completeSector();
    }
  }

  continueSector() {
    if (!this.sectorComplete || this.gameOver) return;
    this.startWave();
  }
  spawnEnemy(kindOverride) {
    const side = floor(random(4));
    const bounds = this.cameraBounds;
    const x = side === 0 ? bounds.left - 30 : side === 1 ? bounds.right + 30 : random(bounds.left, bounds.right);
    const y = side === 2 ? bounds.top - 30 : side === 3 ? bounds.bottom + 30 : random(bounds.top, bounds.bottom);
    const roll = random();
    const kind = kindOverride || (roll < 0.12 ? 'elite' : roll < 0.25 ? 'hunter' : roll < 0.39 ? 'encircler' : roll < 0.55 ? 'charger' : roll < 0.7 ? 'swarm' : 'drone');
    const enemy = new Enemy(x, y, kind);
    enemy.game = this;
    enemy.orbitOffset = random(TWO_PI);
    this.enemies.push(enemy);
    if (kind === 'swarm') {
      for (let index = 0; index < 2; index++) {
        const offset = createVector(-42, index === 0 ? -30 : 30);
        const companion = new Enemy(x + offset.x, y + offset.y, 'swarm');
        companion.game = this;
        companion.orbitOffset = random(TWO_PI);
        companion.formationLeader = enemy;
        companion.formationOffset = offset;
        this.enemies.push(companion);
      }
    }
  }
  update() {
    if (!this.started || this.gameOver || this.paused || this.levelUp || this.sectorComplete) return;
    if (this.bossDeath) { this.updateBossDeath(); return; }
    this.updateCamera();
    this.elapsed += 1 / 60;
    if (!this.isSheltered(this.player.pos)) this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regeneration / 60);
    if (!this.sector) this.startWave();
    if (this.gameOver) return;
    this.stats.add('frames');
    if (this.sector?.mode === 'sanctuary' && this.hordeRemaining > 0) {
      this.hordeSpawnClock++;
      if (this.hordeSpawnClock >= 18 && this.enemies.length < 80) {
        this.hordeSpawnClock = 0;
        const batch = Math.min(this.hordeRemaining, 4);
        for (let index = 0; index < batch; index++) this.spawnEnemy();
        this.hordeRemaining -= batch;
      }
    }
    this.enemyGrid.rebuild(this.enemies);
    this.player.steerToMouse();
    this.player.applyForce(Steering.separation(this.player, this.enemyGrid.query(this.player.pos, 58), 58).mult(0.3));
    this.bossArena?.steerInside(this.player);
    this.player.update();
    this.bossArena?.contain(this.player);
    this.updateCamera();
    for (const bubble of this.routeShelters) bubble.heal(this.player);
    if (!this.canAttack()) this.fields = [];
    for (const ally of this.allies) ally.updateAlly(this.enemies, this.projectiles);
    this.weaponSystem.fire(this.player, this.enemies, this.projectiles);
    for (const enemy of this.enemies) { enemy.caged = false; }
    for (const field of this.fields) field.updateField(this.enemies);
    for (const enemy of this.enemies) {
      for (const bubble of this.routeShelters) bubble.steerAway(enemy);
      if (enemy === this.boss) this.bossArena?.steerInside(enemy);
      enemy.updateAgainst(this.player, this.enemyGrid.query(enemy.pos, Math.max(100, enemy.radius * 3) + 8), this.enemyProjectiles);
      if (enemy === this.boss) this.bossArena?.contain(enemy);
      for (const field of this.fields) field.contain(enemy);
      for (const bubble of this.routeShelters) bubble.keepOutside(enemy);
      enemy.tryShoot(this.player, this.enemyProjectiles);
    }
    this.enemyGrid.rebuild(this.enemies);
    for (const projectile of this.projectiles) projectile.updateProjectile(this.enemies, this.enemyGrid);
    const friendlyTargets = [this.player, ...this.allies];
    for (const projectile of this.enemyProjectiles) projectile.updateAgainst(friendlyTargets);
    for (const enemy of this.enemies) {
      if (!enemy.dead && this.player.distanceTo(enemy) < this.player.radius + enemy.radius) {
        if (this.player.damage(enemy.damageValue)) this.audio.hit();
      }
    }
    for (const ally of this.allies) {
      if (ally.dead) continue;
      for (const enemy of this.enemies) {
        if (!enemy.dead && ally.distanceTo(enemy) < ally.radius + enemy.radius) ally.takeDamage(enemy.damageValue * 0.12);
      }
    }
    if (this.player.dead) this.gameOver = true;
    this.bossArena?.updateArena();
    if (this.boss?.dead && !this.gameOver) { this.beginBossDeath(); return; }
    this.collectDrops();
    // Cap temporally dense VFX at the newest impacts to keep boss phases responsive.
    if (this.effects.length > this.maxEffects) this.effects.splice(0, this.effects.length - this.maxEffects);
    if (this.particles.length > 360) this.particles.splice(0, this.particles.length - 360);
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p.life > 0);
    for (const effect of this.effects) effect.updateEffect();
    this.effects = this.effects.filter(effect => effect.life > 0);
    this.fields = this.fields.filter(field => field.life > 0);
    for (const particle of this.particles) particle.updateParticle();
    this.particles = this.particles.filter(particle => particle.life > 0);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.allies = this.allies.filter(ally => !ally.dead);
    if (this.projectiles.length > 500) {
      const persistent = this.projectiles.filter(shot => shot.persistent);
      const temporary = this.projectiles.filter(shot => !shot.persistent);
      this.projectiles = [...persistent, ...temporary.slice(-(500 - persistent.length))];
    }
    if (this.enemyProjectiles.length > 260) this.enemyProjectiles.splice(0, this.enemyProjectiles.length - 260);
    this.advanceMission();
  }
  collectDrops(collect = true) {
    for (const enemy of this.enemies) {
      if (enemy.dead && !enemy.dropDone) {
        enemy.dropDone = true;
        if (!enemy.invulnerable) {
          this.stats.add('kills');
          if (enemy === this.boss) this.stats.add('bosses');
        }
        const pickup = new Pickup(enemy.pos.x, enemy.pos.y, 'xp', enemy.xpValue);
        pickup.game = this;
        this.pickups.push(pickup);
      }
    }
    if (!collect) return;
    for (const pickup of this.pickups) {
      if (this.levelUp) break;
      pickup.updateToward(this.player);
      if (pickup.distanceTo(this.player) < 28) {
        if (this.player.addXp(pickup.value)) {
          this.levelUp = true;
          this.options = this.weaponSystem.upgradeOptions();
        }
        pickup.life = 0;
      }
    }
    this.pickups = this.pickups.filter(p => p.life > 0);
  }
  choose(index) {
    if (!this.levelUp || !Number.isInteger(index) || index < 0 || index >= this.options.length) return;
    this.weaponSystem.upgrade(this.options[index], this.player);
    this.audio.levelUp();
    this.levelUp = false;
    this.options = [];
    if (this.player.consumeLevel()) {
      this.levelUp = true;
      this.options = this.weaponSystem.upgradeOptions();
    }
  }
  draw() {
    const visible = entity => this.isVisible(entity);
    this.bossArena?.show();
    for (const pickup of this.pickups) if (visible(pickup)) pickup.show();
    for (const particle of this.particles) if (visible(particle)) particle.show();
    for (const effect of this.effects) if (visible(effect)) { effect.game = this; effect.show(); }
    for (const field of this.fields) if (visible(field)) field.show();
    for (const bubble of this.routeShelters) bubble.show();
    this.destination?.show();
    for (const projectile of this.projectiles) if (visible(projectile)) projectile.show();
    for (const projectile of this.enemyProjectiles) if (visible(projectile)) projectile.show();
    for (const enemy of this.enemies) if (visible(enemy)) enemy.show();
    for (const ally of this.allies) ally.show();
    this.bossDeath?.show();
    this.player.show();
    this.weaponSystem.primaryCannon?.show();
    if (this.debug) {
      const cannon = this.weaponSystem.primaryCannon ? [this.weaponSystem.primaryCannon] : [];
      for (const entity of [this.player, ...cannon, ...this.projectiles, ...this.enemyProjectiles, ...this.enemies, ...this.allies, ...this.pickups]) {
        if (visible(entity)) DebugRenderer.show(entity);
      }
    }
  }

  isVisible(entity) {
    const margin = Math.max(80, (entity.radius || 0) * 2);
    const bounds = this.cameraBounds;
    return entity.pos.x >= bounds.left - margin && entity.pos.x <= bounds.right + margin
      && entity.pos.y >= bounds.top - margin && entity.pos.y <= bounds.bottom + margin;
  }
}
