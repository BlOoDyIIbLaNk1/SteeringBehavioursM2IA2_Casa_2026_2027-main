// Animation finie, avec fragments Particle qui héritent eux aussi de Vehicle.
class BossDeathEffect extends SpaceVehicle {
  constructor(boss) {
    super(boss.pos.x, boss.pos.y, boss.radius);
    this.variant = boss.variant;
    this.life = 105;
    this.maxLife = 105;
    this.fragments = Array.from({length: 24}, (_, index) => new Particle(
      this.pos.x, this.pos.y, index % 2 ? '#f3cea0' : '#b9dfe3',
      p5.Vector.fromAngle(index * TWO_PI / 24).setMag(3 + index % 5), 2 + index % 2, 90
    ));
  }
  updateEffect() {
    if (this.life <= 0) return;
    this.life--;
    for (const fragment of this.fragments) if (fragment.life > 0) fragment.updateParticle();
    super.update();
  }
  show() {
    const progress = 1 - this.life / this.maxLife;
    const context = drawingContext;
    context.save();
    context.globalAlpha = Math.max(0, 1 - progress * 2.2);
    SpriteCache.draw(`boss-${this.variant}`, this.pos.x, this.pos.y, this.radius * 3.5 * (1 + progress * 0.12));
    context.globalAlpha = Math.max(0, 1 - progress);
    SpriteCache.draw('deathCore', this.pos.x, this.pos.y, this.radius * (2 + Math.sin(progress * Math.PI) * 2));
    SpriteCache.draw('ring-death', this.pos.x, this.pos.y, (this.radius + progress * 310) * 2.4);
    context.globalAlpha = Math.max(0, 0.6 - progress);
    SpriteCache.draw('ring-death', this.pos.x, this.pos.y, (this.radius * 0.5 + progress * 240) * 2.4);
    context.restore();
    for (const fragment of this.fragments) if (fragment.life > 0) fragment.show();
  }
}
