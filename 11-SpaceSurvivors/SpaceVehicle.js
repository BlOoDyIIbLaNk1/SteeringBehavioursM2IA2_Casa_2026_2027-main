// La locomotion et applyForce viennent directement du Vehicle fourni au TP.
class SpaceVehicle extends Vehicle {
  constructor(x, y, radius = 16) {
    super(x, y);
    this.radius = radius;
    this.r = radius;
    this.maxSpeed = 4;
    this.maxForce = 0.18;
    this.mass = 1;
    this.dead = false;
  }

  update() {
    if (this.game?.debug) this.debugForce = this.acc.copy();
    super.update();
  }

  distanceTo(other) { return p5.Vector.dist(this.pos, other.pos || other); }
}
