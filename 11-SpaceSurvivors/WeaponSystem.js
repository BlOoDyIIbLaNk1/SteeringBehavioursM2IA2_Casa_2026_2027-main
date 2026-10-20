class WeaponSystem {
  constructor() {
    this.levels = Object.fromEntries(Object.keys(UpgradeCatalog).map(name => [name, name === 'laser' ? 1 : 0]));
    this.cooldowns = {};
    this.evolved = new Set();
    this.cadenceFactor = 0.82;
    this.primaryCannon = null;
  }

  interval(frames, minimum = 6) { return Math.max(minimum, Math.round(frames * this.cadenceFactor)); }

  syncPersistent(player, projectiles) {
    for (const name of ['sword', 'orbit', 'ricochet']) {
      const level = this.levels[name];
      if (!level) continue;
      const count = name === 'ricochet' ? level
        : name === 'sword' ? 1 + Math.ceil(level / 2) + (level === 8 ? 1 : 0)
          : 2 + level + (level === 8 ? 4 : 0);
      const current = projectiles.filter(shot => shot.persistent && (shot.weaponName || shot.style) === name);
      for (const shot of current) shot.configure(level);
      for (let index = current.length; index < count; index++) {
        projectiles.push(name === 'ricochet'
          ? new RicochetProjectile(player, level, p5.Vector.fromAngle(index * TWO_PI / count + 0.35))
          : new OrbitalBlade(player, name, index, count, level));
      }
    }
  }

  upgradeOptions(rng = Math.random) {
    const pool = Object.keys(this.levels).filter(name => this.levels[name] < 8);
    for (let index = pool.length - 1; index > 0; index--) {
      const chosen = Math.floor(rng() * (index + 1));
      [pool[index], pool[chosen]] = [pool[chosen], pool[index]];
    }
    return pool.length ? pool.slice(0, 3) : ['hull', 'shield'];
  }
  upgrade(name, player) {
    if (!UpgradeCatalog[name]) return;
    if (this.levels[name] >= 8) {
      if (name === 'hull') player.hp = Math.min(player.maxHp, player.hp + 45);
      if (name === 'shield') player.shield = player.maxShield;
      return;
    }
    this.levels[name] = Math.min(8, (this.levels[name] || 0) + 1);
    if (name === 'shield') { player.maxShield += 25; player.shield = player.maxShield; }
    if (name === 'hull') { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 45); }
    player.magnetRadius = 190 + this.levels.magnet * 45;
    player.maxSpeed = 5.5 * (1 + this.levels.reactor * 0.1);
    player.armor = this.levels.armor * 0.07;
    player.regeneration = this.levels.regen * 0.5;
    player.damageMultiplier = 1 + this.levels.amplifier * 0.12;
    if (this.levels[name] === 8 && UpgradeCatalog[name].type === 'weapon') this.evolved.add(name);
  }
  fire(player, enemies, projectiles) {
    const now = frameCount;
    const nearestEnemy = (origin, maxDistanceSq = Infinity) => {
      let nearest = null;
      let nearestSq = maxDistanceSq;
      for (const enemy of enemies) {
        if (enemy.dead || enemy.targetable === false) continue;
        const dx = enemy.pos.x - origin.x;
        const dy = enemy.pos.y - origin.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < nearestSq) { nearest = enemy; nearestSq = distanceSq; }
      }
      return nearest;
    };
    if (!this.primaryCannon) this.primaryCannon = new OrbitalCannon(player);
    this.primaryCannon.updateCannon(this.levels.laser || 1);
    this.syncPersistent(player, projectiles);
    if (player.game?.canAttack?.() === false) return;

    const add = (v, damage, style, config = {}, origin = player.pos) => {
      projectiles.push(new Projectile(origin.x, origin.y, v, damage, style));
      const projectile = projectiles[projectiles.length - 1];
      projectile.game = player.game;
      projectile.owner = player;
      projectile.damage *= player.damageMultiplier || 1;
      Object.assign(projectile, config);
      if (this.evolved.has(style)) {
        projectile.damage *= 1.6;
        projectile.pierce = Math.max(3, projectile.pierce);
        projectile.evolved = true;
        projectile.bounces = style === 'ricochet' ? 12 : projectile.bounces;
      }
      if (player.game && player.game.audio) player.game.audio.shot(style);
    };
    if (this.levels.laser && now % this.interval(28 - this.levels.laser * 2) === 0) {
      const target = nearestEnemy(this.primaryCannon.pos);
      this.primaryCannon.aimAt(target);
      const laserSpeed = 8 + this.levels.laser * 0.55;
      const direction = target
        ? p5.Vector.sub(target.pos, this.primaryCannon.pos).setMag(laserSpeed)
        : p5.Vector.fromAngle(this.primaryCannon.aimAngle).setMag(laserSpeed);
      add(direction, 8 + this.levels.laser * 3, 'laser', {}, this.primaryCannon.pos);
      if (this.evolved.has('laser')) {
        add(direction.copy().rotate(-0.16), 32, 'laser', {}, this.primaryCannon.pos);
        add(direction.copy().rotate(0.16), 32, 'laser', {}, this.primaryCannon.pos);
      }
    }
    if (this.levels.missile && now % this.interval(Math.max(30, 100 - this.levels.missile * 8)) === 0) add(createVector(random(-1, 1), -4), 25 + this.levels.missile * 7, 'missile');
    if (this.levels.pulse && now % this.interval(Math.max(50, 130 - this.levels.pulse * 10)) === 0) {
      for (let i = 0; i < 8; i++) add(p5.Vector.fromAngle(i * TWO_PI / 8).setMag(5), 12 + this.levels.pulse * 4, 'pulse');
    }
    if (this.levels.nova && now % this.interval(Math.max(90, 210 - this.levels.nova * 15)) === 0) {
      for (let i = 0; i < 16; i++) add(p5.Vector.fromAngle(i * TWO_PI / 16).setMag(7), 28 + this.levels.nova * 8, 'nova');
    }
    // Les armes à cadence partagent l'émission, pas leurs effets spécifiques.
    const target = nearestEnemy(player.pos);
    const heading = target ? p5.Vector.sub(target.pos, player.pos).heading() : player.vel.heading();
    for (const [name, item] of Object.entries(UpgradeCatalog)) {
      const level = this.levels[name];
      if (!item.interval || !level) continue;
      this.cooldowns[name] = Math.max(0, (this.cooldowns[name] || 0) - 1);
      if (this.cooldowns[name] > 0) continue;
      this.cooldowns[name] = this.interval(item.interval - level * 6, 14);
      if (item.field) {
        player.game?.activateSingularity?.();
        player.game?.audio?.shot(name);
        continue;
      }
      const count = item.count || 1;
      for (let index = 0; index < count; index++) {
        if (item.sweep) {
          const bounds = player.game?.cameraBounds || { left: 0, right: width, top: 0, bottom: height };
          const side = index % 4;
          const start = side === 0 ? createVector(bounds.left - 24, random(bounds.top, bounds.bottom))
            : side === 1 ? createVector(bounds.right + 24, random(bounds.top, bounds.bottom))
            : side === 2 ? createVector(random(bounds.left, bounds.right), bounds.top - 24)
            : createVector(random(bounds.left, bounds.right), bounds.bottom + 24);
          const targetPoint = createVector(random(bounds.left, bounds.right), random(bounds.top, bounds.bottom));
          const direction = p5.Vector.sub(targetPoint, start).rotate(random(-0.16, 0.16)).setMag(item.speed);
          add(direction, item.damage + level * 3, name, {
            sprite: item.sprite, pierce: enemies.length + 2, homing: false,
            life: 180, sweep: true
          });
          const shot = projectiles[projectiles.length - 1];
          shot.pos = start;
          continue;
        }
        const angle = item.radial ? index * TWO_PI / count : heading + (index - (count - 1) / 2) * (item.spread || 0);
        add(p5.Vector.fromAngle(angle).setMag(item.speed), item.damage + level * 3, name, {
          sprite: item.sprite,
          pierce: item.pierce || 1,
          homing: Boolean(item.homing),
          returning: Boolean(item.returning),
          slows: Boolean(item.slow),
          burns: Boolean(item.burn),
          splash: item.splash || 0,
          life: item.radial ? 55 : 120
        });
      }
    }
  }
}
