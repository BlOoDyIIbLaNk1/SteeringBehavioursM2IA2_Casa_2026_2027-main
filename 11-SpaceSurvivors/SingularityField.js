class SingularityField extends SpaceVehicle {
  constructor(x, y, maxRadius, life = 210) {
    super(x, y, 12);
    this.center = this.pos.copy();
    this.maxRadius = maxRadius;
    this.radius = maxRadius;
    this.life = life;
    this.maxLife = life;
    this.maxForce = 0.24;
    this.captured = new Set();
  }

  updateField(enemies) {
    if (this.life <= 0) return;
    const progress = 1 - this.life / this.maxLife;
    this.radius = Math.max(46, this.maxRadius * (1 - progress * 0.9));
    const radiusSq = (this.maxRadius + 220) ** 2;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.invulnerable) continue;
      const dx = enemy.pos.x - this.center.x;
      const dy = enemy.pos.y - this.center.y;
      if (dx * dx + dy * dy > radiusSq) continue;
      enemy.caged = true;
      const distance = Math.hypot(dx, dy);
      if (distance <= this.radius - enemy.radius) this.captured.add(enemy);
      if (distance > this.radius - enemy.radius) {
        enemy.applyForce(Steering.seek(enemy, this.center, enemy.maxSpeed, enemy.maxForce));
      }
    }
    this.life--;
    super.update();
  }

  contain(enemy) {
    if (!this.captured.has(enemy) || enemy.dead) return;
    const offset = p5.Vector.sub(enemy.pos, this.center);
    const distance = offset.mag();
    const boundary = Math.max(0, this.radius - enemy.radius);
    if (distance <= boundary || distance === 0) return;
    const normal = offset.div(distance);
    enemy.pos = this.center.copy().add(normal.copy().mult(boundary));
    const outwardSpeed = enemy.vel.x * normal.x + enemy.vel.y * normal.y;
    if (outwardSpeed > 0) enemy.vel.sub(normal.mult(outwardSpeed));
  }

  show() {
    if (typeof SpriteCache !== 'undefined') {
      const context = drawingContext;
      context.save(); context.translate(this.center.x, this.center.y);
      context.rotate(frameCount * 0.003);
      context.globalAlpha = 0.8 + Math.sin(frameCount * 0.04) * 0.12;
      const rendered = SpriteCache.draw('ring-singularity', 0, 0, this.radius * 2.4);
      context.restore();
      if (rendered) return;
    }
    push(); noFill(); stroke('#bcb0f3'); strokeWeight(2);
    circle(this.center.x, this.center.y, this.radius * 2); pop();
  }
}
