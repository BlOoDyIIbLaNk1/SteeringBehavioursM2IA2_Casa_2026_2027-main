class AttackEffect extends SpaceVehicle {
  constructor(x, y, colorValue = "#8be9fd", size = 24) {
    super(x, y, size);
    this.colorValue = colorValue;
    this.size = size;
    this.life = 22;
    this.maxLife = 22;
    this.spawned = false;
  }

  updateEffect() {
    this.life--;
    if (!this.spawned) {
      this.spawned = true;
      const count = this.game ? Math.min(7, Math.max(0, 360 - this.game.particles.length)) : 7;
      for (let index = 0; index < count; index++) {
        const angle = index * TWO_PI / count;
        this.game?.particles.push(new Particle(this.pos.x, this.pos.y, this.colorValue, p5.Vector.fromAngle(angle).setMag(random(1, 4))));
      }
    }
  }

  show() {
    const progress = 1 - this.life / this.maxLife;
    push();
    noFill();
    stroke(this.colorValue);
    strokeWeight(Math.max(1, 5 * (1 - progress)));
    circle(this.pos.x, this.pos.y, this.size * (1 + progress * 2));
    pop();
  }
}
