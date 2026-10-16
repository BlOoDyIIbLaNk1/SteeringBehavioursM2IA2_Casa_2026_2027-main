class OrbitalCannon extends SpaceVehicle {
  constructor(player) {
    super(player.pos.x + 48, player.pos.y, 10);
    this.player = player;
    this.angle = 0;
    this.orbitRadius = 48;
    this.angularSpeed = 0;
    this.aimAngle = 0;
    this.targetable = false;
    this.maxSpeed = 11;
    this.maxForce = 1.25;
  }

  updateCannon(level = 1) {
    const rank = constrain(level, 1, 8);
    this.game = this.player.game;
    this.angularSpeed = 0.022 + rank * 0.0065;
    this.maxSpeed = 11 + rank * 0.65;
    this.maxForce = 1.25 + rank * 0.12;
    this.angle = (this.angle + this.angularSpeed) % TWO_PI;

    const anchor = this.player.pos.copy().add(
      p5.Vector.fromAngle(this.angle).setMag(this.orbitRadius)
    );
    this.applyForce(Steering.arrive(this, anchor, 34));
    super.update();
  }

  aimAt(target) {
    if (target) this.aimAngle = p5.Vector.sub(target.pos, this.pos).heading();
    else if (this.player.vel.magSq() > 0.01) this.aimAngle = this.player.vel.heading();
  }

  show() {
    push();
    stroke(111, 226, 255, 58);
    strokeWeight(1);
    line(this.player.pos.x, this.player.pos.y, this.pos.x, this.pos.y);
    noFill();
    stroke(185, 166, 255, 125);
    circle(this.pos.x, this.pos.y, 25);
    translate(this.pos.x, this.pos.y);
    rotate(this.aimAngle);
    noStroke();
    fill(104, 234, 255, 52);
    ellipse(-5, 0, 34, 18);
    if (!(typeof SpriteCache !== 'undefined' && SpriteCache.draw('laser', 3, 0, 29))) {
      fill('#dffcff');
      rectMode(CENTER);
      rect(3, 0, 27, 7, 3);
      fill('#72f1ff');
      circle(10, 0, 6);
    }
    pop();
  }
}
