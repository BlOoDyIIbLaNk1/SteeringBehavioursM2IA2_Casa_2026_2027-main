class Boss extends Enemy {
  constructor(x, y, wave) {
    super(x, y, 'elite');
    this.radius = wave >= 15 ? 88 : wave >= 10 ? 62 : 40; this.maxSpeed = wave >= 15 ? 0.72 : 1.05; this.maxForce = 0.08;
    this.maxHp = (wave >= 15 ? 2400 : wave >= 10 ? 1050 : 420) + wave * 120; this.hp = this.maxHp;
    this.damageValue = 30; this.xpValue = 30; this.wave = wave;
    this.fireCooldown = 0;
    this.variant = wave >= 15 ? 'final' : wave >= 10 ? 'bastion' : wave >= 5 ? 'bastion' : 'spectre';
    this.title = this.variant === 'final' ? 'NÉMÉSIS • CŒUR DU NÉANT' : this.variant === 'bastion' ? 'BASTION • CROISEUR DE SIÈGE' : 'SPECTRE • CHASSEUR ROYAL';
    this.phase = 1;
    this.attackClock = 0;
  }

  updateAgainst(player, enemies, enemyProjectiles) {
    this.tickStatus();
    if (this.dead) return;
    const normalSpeed = this.maxSpeed;
    if (this.slowFrames > 0) { this.slowFrames--; this.maxSpeed *= 0.5; }
    this.phase = this.hp <= this.maxHp * 0.3 ? 3 : this.hp <= this.maxHp * 0.65 ? 2 : 1;
    this.attackClock++;
    const distance = this.distanceTo(player);
    if (this.variant === 'spectre') {
      this.applyForce(Steering.pursue(this, player, 18));
    } else if (distance < 180) {
      this.applyForce(Steering.flee(this, player.pos));
    } else {
      this.applyForce(Steering.arrive(this, player.pos, 320));
    }
    this.applyForce(Steering.separation(this, enemies, 100));
    super.update();
    this.maxSpeed = normalSpeed;
    if (enemyProjectiles && this.attackClock >= (this.variant === 'final' ? 80 - this.phase * 12 : 120 - this.phase * 15)) {
      this.attackClock = 0;
      const count = this.variant === 'spectre' ? 3 : this.variant === 'final' ? 8 + this.phase * 4 : 6 + this.phase * 2;
      for (let index = 0; index < count; index++) {
        const angle = this.variant === 'spectre'
          ? p5.Vector.sub(player.pos, this.pos).heading() + (index - 1) * 0.2
          : index * TWO_PI / count + this.attackClock * 0.01;
        const direction = p5.Vector.fromAngle(angle).setMag(2.4 + this.phase * 0.3);
        const shot = new EnemyProjectile(this.pos.x, this.pos.y, direction, 6 + this.phase * 2);
        shot.homing = false;
        shot.game = this.game;
        enemyProjectiles.push(shot);
      }
    }
  }

  show() {
    if (typeof SpriteCache !== 'undefined' && SpriteCache.draw(`boss-${this.variant}`, this.pos.x, this.pos.y, this.radius * 3.5)) return;
    if (enemyArt) {
      push();
      imageMode(CENTER);
      const size = this.radius * 3.5;
      tint(this.variant === 'spectre' ? '#79eaff' : this.variant === 'final' ? '#e8b5ff' : '#ffce8a');
      image(enemyArt, this.pos.x, this.pos.y, size, size,
        enemyArt.width / 2, enemyArt.height / 2, enemyArt.width / 2, enemyArt.height / 2);
      pop();
      return;
    }
    push(); translate(this.pos.x, this.pos.y); rotate(frameCount * 0.008);
    noFill(); stroke('#ffca5c'); strokeWeight(4); circle(0, 0, 76);
    fill('#ff4d6d'); noStroke(); beginShape();
    for (let i = 0; i < 8; i++) { const a = i * TWO_PI / 8; vertex(cos(a) * 34, sin(a) * 34); }
    endShape(CLOSE); pop();
    noStroke(); fill('#34162b'); rect(this.pos.x - 55, this.pos.y - 58, 110, 7);
    fill('#ff4d6d'); rect(this.pos.x - 55, this.pos.y - 58, 110 * (this.hp / this.maxHp), 7);
  }
}
