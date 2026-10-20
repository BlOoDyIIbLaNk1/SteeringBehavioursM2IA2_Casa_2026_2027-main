class Projectile extends SpaceVehicle {
  constructor(x, y, velocity, damage, style = 'laser') {
    super(x, y, style === 'sword' ? 12 : 5);
    this.vel = velocity.copy(); this.maxSpeed = this.vel.mag(); this.damage = damage;
    this.style = style; this.life = style === 'sword' ? 20 : 120; this.bounces = style === 'ricochet' ? 4 : 0;
    this.pierce = 1;
    this.hitEnemies = new Set();
    this.trail = [];
    this.effectEnemies = new Set();
    this.hitCooldowns = new WeakMap();
    this.age = 0;
  }

  steer(enemies) {
    if (this.returning && this.life < 65 && this.owner) {
      this.applyForce(Steering.seek(this, this.owner.pos));
      if (this.distanceTo(this.owner) < 20) this.life = 0;
    } else if (this.style === 'missile' || this.homing) {
      let target = null;
      let nearestDistanceSq = Infinity;
      for (const enemy of enemies) {
        if (enemy.dead || enemy.targetable === false) continue;
        const dx = enemy.pos.x - this.pos.x;
        const dy = enemy.pos.y - this.pos.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < nearestDistanceSq) { target = enemy; nearestDistanceSq = distanceSq; }
      }
      if (target) this.applyForce(Steering.pursue(this, target, 0.4));
    }
    if (this.style === 'sword') {
      this.applyForce(this.vel.copy().rotate(0.22).sub(this.vel).limit(this.maxForce));
    }
  }

  updateProjectile(enemies, grid) {
    if (this.life <= 0) return;
    const start = this.pos.copy();
    this.trail.push(this.pos.copy());
    if (this.trail.length > (this.orbital ? 16 : 8)) this.trail.shift();
    this.steer(enemies);
    super.update();
    this.age++;
    if (!this.persistent) this.life--;
    const bounds = this.game?.cameraBounds || { left: 0, right: width, top: 0, bottom: height };
    if (this.bounces > 0) this.reflectAtBounds(bounds);
    // Les orbites restent visibles et pilotées, mais inoffensives au refuge.
    if (this.game?.canAttack?.() === false) return;
    if (this.game?.blockProjectile?.(this, start)) return;
    const candidates = grid ? grid.query(this.pos, this.radius + grid.maxRadius) : enemies;
    for (const enemy of candidates) {
      const dx = enemy.pos.x - this.pos.x;
      const dy = enemy.pos.y - this.pos.y;
      const hitRadius = this.radius + enemy.radius;
      const canHit = this.persistent ? this.age >= (this.hitCooldowns.get(enemy) || 0) : !this.hitEnemies.has(enemy);
      if (!enemy.dead && !enemy.invulnerable && canHit && dx * dx + dy * dy < hitRadius * hitRadius) {
        (this.game || enemy.game)?.stats?.recordDamage(enemy, this.damage);
        enemy.hp -= this.damage;
        if (this.slows) enemy.slowFrames = 120;
        if (this.burns) { enemy.burnFrames = 180; enemy.burnDamage = this.damage * 0.3; }
        if (this.splash) {
          const splashSq = this.splash * this.splash;
          for (const neighbor of enemies) {
            const dx = neighbor.pos.x - this.pos.x;
            const dy = neighbor.pos.y - this.pos.y;
            if (neighbor !== enemy && !neighbor.dead && !neighbor.invulnerable && dx * dx + dy * dy <= splashSq) {
              (this.game || neighbor.game)?.stats?.recordDamage(neighbor, this.damage * 0.65);
              neighbor.hp -= this.damage * 0.65;
              if (neighbor.hp <= 0) neighbor.dead = true;
            }
          }
          if (enemy.game) {
            const explosion = new AttackEffect(this.pos.x, this.pos.y, '#e8bd88', this.splash);
            explosion.game = enemy.game;
            enemy.game.effects.push(explosion);
          }
        }
        if (this.persistent) this.hitCooldowns.set(enemy, this.age + 24);
        else {
          this.hitEnemies.add(enemy);
          this.pierce--;
          if (this.pierce <= 0) this.life = 0;
        }
        if (enemy.game && (this.persistent || !this.effectEnemies.has(enemy))) {
          if (!this.persistent) this.effectEnemies.add(enemy);
          const effect = new AttackEffect(enemy.pos.x, enemy.pos.y, "#ffd166", 25); effect.game = enemy.game; enemy.game.effects.push(effect);
        }
        if (enemy.hp <= 0) enemy.dead = true;
        break;
      }
    }
    if (this.style === 'laser' && (this.pos.x < bounds.left || this.pos.x > bounds.right || this.pos.y < bounds.top || this.pos.y > bounds.bottom)) this.life = 0;
  }

  reflectAtBounds(bounds) {
    // Réponse de collision distincte du steering : corrige la pénétration et
    // ne réfléchit qu'une vitesse sortante, même quand la caméra se déplace.
    for (const [axis, low, high] of [['x', bounds.left, bounds.right], ['y', bounds.top, bounds.bottom]]) {
      if (this.bounces <= 0) break;
      const minimum = low + this.radius;
      const maximum = high - this.radius;
      if (this.pos[axis] <= minimum) {
        this.pos[axis] = minimum;
        if (this.vel[axis] < 0) { this.vel[axis] *= -1; this.bounces--; }
      } else if (this.pos[axis] >= maximum) {
        this.pos[axis] = maximum;
        if (this.vel[axis] > 0) { this.vel[axis] *= -1; this.bounces--; }
      }
    }
  }

  show() {
    if (this.trail.length > 1) {
      const context = drawingContext;
      context.save();
      context.beginPath();
      context.moveTo(this.trail[0].x, this.trail[0].y);
      for (let index = 1; index < this.trail.length; index++) context.lineTo(this.trail[index].x, this.trail[index].y);
      context.strokeStyle = this.orbital ? (this.weaponName === 'orbit' ? 'rgba(188,165,255,0.55)' : 'rgba(245,216,156,0.6)') : 'rgba(100,210,255,0.23)';
      context.lineWidth = this.orbital ? 4 : this.evolved ? 3 : 1.5;
      context.stroke();
      context.restore();
    }
    if (this.orbital && typeof SpriteCache !== 'undefined') {
      push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
      const drawn = SpriteCache.draw('sword', 0, 0, this.evolved ? 58 : 44);
      pop();
      if (drawn) return;
    }
    if (typeof SpriteCache !== 'undefined' && SpriteCache.draw(this.sprite || this.style, this.pos.x, this.pos.y, 34)) return;
    if (weaponArt) {
      const cells = {
        laser: [0, 0], missile: [1, 0], sword: [2, 0],
        ricochet: [0, 1], pulse: [1, 1], nova: [2, 1]
      };
      const [column, row] = cells[this.sprite || this.style] || cells.laser;
      imageMode(CENTER);
      image(weaponArt, this.pos.x, this.pos.y, 34, 34,
        column * weaponArt.width / 3, row * weaponArt.height / 2,
        weaponArt.width / 3, weaponArt.height / 2);
      imageMode(CORNER);
      return;
    }
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
    noStroke(); fill(this.style === 'missile' ? '#ff9f43' : this.style === 'sword' ? '#d6f7ff' : this.style === 'ricochet' ? '#ffe66d' : '#72f1ff');
    if (this.style === 'sword') rectMode(CENTER); rect(0, 0, this.style === 'sword' ? 42 : 16, this.style === 'sword' ? 5 : 5); pop();
  }
}
