class EnemyProjectile extends SpaceVehicle {
  constructor(x, y, velocity, damage = 8) {
    super(x, y, 7);
    this.vel = velocity.copy();
    this.maxSpeed = this.vel.mag();
    this.damage = damage;
    this.life = 180;
    this.homing = true;
    this.trail = [];
  }

  updateAgainst(targets) {
    if (this.life <= 0) return false;
    if (!Array.isArray(targets)) targets = [targets];
    this.game = this.game || targets[0]?.game;
    const start = this.pos.copy();
    let target = null;
    let nearestSq = Infinity;
    for (const candidate of targets) {
      if (candidate.dead) continue;
      const dx = candidate.pos.x - this.pos.x;
      const dy = candidate.pos.y - this.pos.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < nearestSq) { target = candidate; nearestSq = distanceSq; }
    }
    this.trail.push(this.pos.copy());
    if (this.trail.length > 8) this.trail.shift();
    if (this.homing && target) this.applyForce(Steering.seek(this, target.pos, this.maxSpeed, 0.08));
    super.update();
    this.life--;
    if (this.game?.blockProjectile?.(this, start)) return false;
    for (const candidate of targets) {
      const dx = candidate.pos.x - this.pos.x;
      const dy = candidate.pos.y - this.pos.y;
      const hitRadius = this.radius + candidate.radius;
      if (!candidate.dead && dx * dx + dy * dy < hitRadius * hitRadius) {
        if (candidate === targets[0] && typeof candidate.damage === 'function') candidate.damage(this.damage);
        else candidate.takeDamage?.(this.damage);
        this.life = 0;
        return true;
      }
    }
    return false;
  }

  show() {
    push();
    if (this.trail.length > 1) {
      const context = drawingContext;
      context.beginPath(); context.moveTo(this.trail[0].x, this.trail[0].y);
      for (let index = 1; index < this.trail.length; index++) context.lineTo(this.trail[index].x, this.trail[index].y);
      context.strokeStyle = 'rgba(218,125,146,0.35)'; context.lineWidth = 2; context.stroke();
    }
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    if (typeof SpriteCache !== 'undefined' && SpriteCache.draw('hostile', 0, 0, 48)) { pop(); return; }
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = '#e9a497';
    noStroke();
    fill('#9d5979');
    quad(-14, 0, 0, -6, 10, 0, 0, 6);
    fill('#f5c5af');
    quad(-5, 0, 1, -3, 10, 0, 1, 3);
    fill('#fff1d6');
    ellipse(3, 0, 6, 2);
    pop();
  }
}
