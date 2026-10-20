class OrbitalBlade extends Projectile {
  constructor(player, weaponName, index, count, level) {
    const radius = weaponName === 'orbit' ? 155 : 88;
    const offset = p5.Vector.fromAngle(index * TWO_PI / count).setMag(radius);
    super(player.pos.x + offset.x, player.pos.y + offset.y, createVector(0, 0), 1, 'sword');
    this.owner = player;
    this.game = player.game;
    this.weaponName = weaponName;
    this.orbital = true;
    this.persistent = true;
    this.life = Infinity;
    this.radius = 15;
    this.configure(level);
  }

  configure(level) {
    this.evolved = level >= 8;
    this.orbitRadius = (this.weaponName === 'orbit' ? 155 : 88) + level * 3;
    this.orbitSpeed = 3.8 + level * 0.65;
    this.maxSpeed = this.orbitSpeed + this.owner.maxSpeed + 2;
    this.maxForce = 1.2 + level * 0.12;
    this.damage = (this.weaponName === 'orbit' ? 8 + level * 3 : 14 + level * 4)
      * (this.owner.damageMultiplier || 1) * (this.evolved ? 1.6 : 1);
  }

  steer() {
    const force = Steering.orbit(this, this.owner, this.orbitRadius,
      this.weaponName === 'orbit' ? -1 : 1, this.orbitSpeed);
    const neighbors = (this.game?.projectiles || []).filter(shot => shot.orbital && shot.weaponName === this.weaponName);
    force.add(Steering.separation(this, neighbors, 28).mult(0.25)).limit(this.maxForce);
    this.applyForce(force);
  }
}
