// Un garde lié au boss. Sa place dans la formation est un objectif d'arrive.
class ArenaGuard extends Enemy {
  constructor(arena, angle) {
    const anchor = arena.pos.copy().add(p5.Vector.fromAngle(angle).setMag(arena.radius));
    super(anchor.x, anchor.y, 'sentinel');
    this.arena = arena;
    this.anchor = anchor;
    this.radius = 17;
    this.maxSpeed = 2.6;
    this.maxForce = 0.18;
    this.hp = Infinity;
    this.invulnerable = true;
    this.targetable = false;
    this.xpValue = 0;
    this.damageValue = 12;
    this.dropDone = true;
  }
  updateAgainst() {
    if (!this.arena.active || this.arena.boss.dead) { this.dead = true; this.hp = 0; return; }
    this.applyForce(Steering.arrive(this, this.anchor, 70));
    super.update();
  }
  tryShoot() {}
  show() {
    if (typeof SpriteCache !== 'undefined' && SpriteCache.draw('sentinel', this.pos.x, this.pos.y, 52)) return;
    super.show();
  }
}
