class Projectile extends SpaceVehicle {
  constructor(x, y, velocity, damage, style = 'laser') {
    super(x, y, style === 'sword' ? 12 : 5);
    this.vel = velocity.copy(); this.maxSpeed = this.vel.mag(); this.damage = damage;
    this.style = style; this.life = style === 'sword' ? 20 : 120; this.bounces = style === 'ricochet' ? 4 : 0;
    this.pierce = 1;
    this.hitEnemies = new Set();
    this.trail = [];
    this.effectEnemies = new Set();
  }

  updateProjectile(enemies, grid) {
    if (this.life <= 0) return;
    this.trail.push(this.pos.copy());
    if (this.trail.length > 8) this.trail.shift();
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
    if (this.style === 'sword') this.vel.rotate(0.22);
    this.vel.limit(this.maxSpeed); super.update(); this.life--;
    const bounds = this.game?.cameraBounds || { left: 0, right: width, top: 0, bottom: height };
    if (this.bounces > 0 && (this.pos.x <= bounds.left + this.radius || this.pos.x >= bounds.right - this.radius)) { this.vel.x *= -1; this.bounces--; }
    if (this.bounces > 0 && (this.pos.y <= bounds.top + this.radius || this.pos.y >= bounds.bottom - this.radius)) { this.vel.y *= -1; this.bounces--; }
    const candidates = grid ? grid.query(this.pos, this.radius + grid.maxRadius) : enemies;
    for (const enemy of candidates) {
      const dx = enemy.pos.x - this.pos.x;
      const dy = enemy.pos.y - this.pos.y;
      const hitRadius = this.radius + enemy.radius;
      if (!enemy.dead && !enemy.invulnerable && !this.hitEnemies.has(enemy) && dx * dx + dy * dy < hitRadius * hitRadius) {
        enemy.hp -= this.damage;
        if (this.slows) enemy.slowFrames = 120;
        if (this.burns) { enemy.burnFrames = 180; enemy.burnDamage = this.damage * 0.3; }
        if (this.splash) {
          const splashSq = this.splash * this.splash;
          for (const neighbor of enemies) {
            const dx = neighbor.pos.x - this.pos.x;
            const dy = neighbor.pos.y - this.pos.y;
            if (neighbor !== enemy && !neighbor.dead && !neighbor.invulnerable && dx * dx + dy * dy <= splashSq) {
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
        this.hitEnemies.add(enemy);
        this.pierce--;
        if (this.pierce <= 0) this.life = 0;
        if (enemy.game && !this.effectEnemies.has(enemy)) {
          this.effectEnemies.add(enemy);
          const effect = new AttackEffect(enemy.pos.x, enemy.pos.y, "#ffd166", 25); effect.game = enemy.game; enemy.game.effects.push(effect);
        }
        if (enemy.hp <= 0) enemy.dead = true;
        break;
      }
    }
    if (this.style === 'laser' && (this.pos.x < bounds.left || this.pos.x > bounds.right || this.pos.y < bounds.top || this.pos.y > bounds.bottom)) this.life = 0;
  }

  show() {
    if (this.trail.length > 1) {
      const context = drawingContext;
      context.save();
      context.beginPath();
      context.moveTo(this.trail[0].x, this.trail[0].y);
      for (let index = 1; index < this.trail.length; index++) context.lineTo(this.trail[index].x, this.trail[index].y);
      context.strokeStyle = 'rgba(100,210,255,0.23)';
      context.lineWidth = this.evolved ? 3 : 1.5;
      context.stroke();
      context.restore();
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
