class Pickup extends SpaceVehicle {
  constructor(x, y, type, value = 1) {
    super(x, y, 8);
    this.type = type;
    this.value = value;
    this.life = Infinity;
    this.maxSpeed = 14;
    this.maxForce = 0.9;
  }

  updateToward(player) {
    const distance = this.distanceTo(player);
    if (distance <= (player.magnetRadius || 190)) {
      this.applyForce(Steering.seek(this, player.pos));
    } else {
      // Freinage hérité : un cristal lointain ne traverse pas toute l'arène.
      this.applyForce(this.vel.copy().mult(-1).limit(this.maxForce));
    }
    super.update();
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    const pulse = 1 + Math.sin(frameCount * 0.05 + this.pos.x) * 0.1;
    scale(pulse);
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = '#a5e8d5';
    noStroke();
    fill('#599c9b');
    quad(0, -9, 6, 0, 0, 9, -6, 0);
    fill('#c1f4de');
    triangle(0, -9, 0, 9, -6, 0);
    fill('#effff1');
    triangle(0, -9, 6, 0, 0, -1);
    pop();
  }
}
