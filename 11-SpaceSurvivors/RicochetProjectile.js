class RicochetProjectile extends Projectile {
  constructor(player, level, direction) {
    super(player.pos.x, player.pos.y, direction.copy().setMag(6 + level * 0.75), 1, 'ricochet');
    this.owner = player;
    this.game = player.game;
    this.persistent = true;
    this.life = Infinity;
    this.bounces = Infinity;
    this.maxForce = 0.18;
    this.configure(level);
  }

  configure(level) {
    this.maxSpeed = 6 + level * 0.75;
    this.evolved = level >= 8;
    this.damage = (18 + level * 5) * (this.owner.damageMultiplier || 1) * (this.evolved ? 1.6 : 1);
  }

  steer() {
    const desired = this.vel.copy().setMag(this.maxSpeed);
    const acceleration = desired.sub(this.vel);
    const avoidance = Steering.bounceFromEdges(this, 18);
    this.applyForce(acceleration.add(avoidance).limit(this.maxForce));
  }
}
