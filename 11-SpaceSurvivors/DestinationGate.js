// Balise de destination, dessinée dans le monde et héritant du Vehicle du TP.
class DestinationGate extends SpaceVehicle {
  constructor(x, y) {
    super(x, y, 70);
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.active = false;
  }

  updateGate(active) { this.active = active; }
  reachedBy(player) { return this.active && this.distanceTo(player) <= this.radius + player.radius; }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(frameCount * (this.active ? 0.006 : 0.002));
    drawingContext.shadowBlur = this.active ? 26 : 12;
    drawingContext.shadowColor = this.active ? '#b8e9c4' : '#93abb8';
    noFill();
    stroke(this.active ? '#c8e9c4' : '#738997');
    strokeWeight(3);
    circle(0, 0, this.radius * 2);
    strokeWeight(1);
    circle(0, 0, this.radius * 1.5);
    for (let index = 0; index < 4; index++) {
      rotate(HALF_PI);
      line(-this.radius * 0.72, 0, -this.radius * 0.5, 0);
    }
    noStroke();
    rotate(-frameCount * (this.active ? 0.006 : 0.002));
    fill(this.active ? '#d4edcf' : '#92a0a8');
    textAlign(CENTER, CENTER);
    textSize(10);
    text(this.active ? 'SAUT' : 'VERROUILLÉ', 0, 0);
    drawingContext.shadowBlur = 0;
    pop();
  }
}
