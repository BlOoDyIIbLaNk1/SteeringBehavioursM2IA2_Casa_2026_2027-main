// Refuge de mission immobile : reste une entité Vehicle sans remplacer sa locomotion.
class ShelterBubble extends SpaceVehicle {
  constructor(x, y, radius = 150) {
    super(x, y, radius);
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.label = 'REFUGE IONIQUE';
  }

  protects(position) {
    return p5.Vector.dist(this.pos, position) + 18 <= this.radius;
  }

  show() {
    const pulse = 1 + Math.sin(frameCount * 0.035) * 0.025;
    push();
    translate(this.pos.x, this.pos.y);
    noStroke();
    fill(102, 211, 220, 12);
    circle(0, 0, this.radius * 2 * pulse);
    noFill();
    stroke(133, 231, 225, 118);
    strokeWeight(2);
    circle(0, 0, this.radius * 2 * pulse);
    stroke(190, 249, 233, 42);
    strokeWeight(1);
    circle(0, 0, this.radius * 1.78 * pulse);
    for (let index = 0; index < 8; index++) {
      const angle = frameCount * 0.008 + index * TWO_PI / 8;
      fill(187, 246, 228, 190);
      noStroke();
      circle(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius, 4);
    }
    fill(205, 241, 225, 190);
    textAlign(CENTER, BOTTOM);
    textSize(9);
    text(this.label, 0, -this.radius - 12);
    pop();
  }
}
