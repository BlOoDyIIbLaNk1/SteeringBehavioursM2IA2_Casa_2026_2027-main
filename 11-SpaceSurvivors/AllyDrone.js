class AllyDrone extends SpaceVehicle {
  constructor(player, index) {
    super(player.pos.x, player.pos.y, 10);
    this.player = player;
    this.game = player.game;
    this.formationIndex = index;
    this.hp = 42;
    this.maxHp = 42;
    this.maxSpeed = 6.2;
    this.maxForce = 0.32;
    this.fireCooldown = 18 + index * 7;
    this.invulnerableUntil = 0;
    this.dead = false;
  }

  takeDamage(amount) {
    if (this.game?.isSheltered?.(this.pos)) return false;
    if (this.dead || millis() < this.invulnerableUntil) return false;
    this.hp -= amount;
    this.invulnerableUntil = millis() + 260;
    if (this.hp <= 0) {
      this.dead = true;
      this.game?.stats?.add('dronesLost');
    }
    return true;
  }

  updateAlly(enemies, projectiles) {
    if (this.dead) return;
    const rank = Math.floor(this.formationIndex / 2) + 1;
    const side = this.formationIndex % 2 === 0 ? -1 : 1;
    const localOffset = createVector(-54 * rank, side * (34 + 10 * rank)).rotate(this.player.vel.heading());
    const formationTarget = this.player.pos.copy().add(localOffset);
    this.applyForce(Steering.arrive(this, formationTarget, 90));
    this.applyForce(Steering.separation(this, [this.player, ...(this.player.game?.allies || [])], 30).mult(0.75));
    super.update();

    if (this.game?.canAttack?.() === false || this.game?.isSheltered?.(this.pos)) return;

    this.fireCooldown--;
    if (this.fireCooldown > 0) return;
    let target = null;
    let nearestSq = 620 * 620;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.targetable === false) continue;
      const dx = enemy.pos.x - this.pos.x;
      const dy = enemy.pos.y - this.pos.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < nearestSq) { target = enemy; nearestSq = distanceSq; }
    }
    if (!target) { this.fireCooldown = 12; return; }
    const velocity = p5.Vector.sub(target.pos, this.pos).setMag(9);
    const shot = new Projectile(this.pos.x, this.pos.y, velocity, 12 + this.player.level, 'laser');
    shot.owner = this;
    shot.game = this.player.game;
    shot.pierce = 2;
    projectiles.push(shot);
    this.fireCooldown = 34;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading() + HALF_PI);
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = '#b8e8d2';
    noStroke();
    fill('#b7d6c4');
    beginShape();
    vertex(0, -13); vertex(8, 5); vertex(0, 2); vertex(-8, 5);
    endShape(CLOSE);
    fill('#eaf3d9');
    triangle(0, -8, -3, 3, 3, 3);
    fill('#f1bd82');
    triangle(-3, 5, 0, 11, 0, 4);
    triangle(3, 5, 0, 11, 0, 4);
    pop();
    if (this.hp < this.maxHp) {
      noStroke(); fill('#1b2630'); rect(this.pos.x - 12, this.pos.y - 19, 24, 3);
      fill('#b7d6c4'); rect(this.pos.x - 12, this.pos.y - 19, 24 * Math.max(0, this.hp / this.maxHp), 3);
    }
  }
}
