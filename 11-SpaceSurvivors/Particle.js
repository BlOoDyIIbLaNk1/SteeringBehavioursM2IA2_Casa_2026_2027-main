class Particle extends SpaceVehicle {
  constructor(x, y, colorValue, velocity, size = 4, life = 28) {
    super(x, y, size);
    this.vel = velocity.copy();
    this.colorValue = colorValue;
    const hex = colorValue.replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map(part => part + part).join('') : hex;
    const color = parseInt(normalized, 16);
    this.channels = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
    this.life = life;
    this.maxLife = life;
    this.maxSpeed = this.vel.mag();
  }

  updateParticle() {
    this.applyForce(this.vel.copy().mult(-0.035));
    super.update();
    this.life--;
  }

  show() {
    const alpha = map(this.life, 0, this.maxLife, 0, 255);
    noStroke();
    fill(...this.channels, alpha);
    circle(this.pos.x, this.pos.y, this.radius * 2 * (0.5 + this.life / this.maxLife));
  }
}
