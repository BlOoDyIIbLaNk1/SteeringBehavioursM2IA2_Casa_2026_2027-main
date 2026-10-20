class Player extends SpaceVehicle {
  constructor(x, y) {
    super(x, y, 18);
    this.maxSpeed = 5.5;
    this.maxForce = 0.35;
    this.hp = 100;
    this.maxHp = 100;
    this.shield = 0;
    this.maxShield = 0;
    this.xp = 0;
    this.level = 1;
    this.invulnerableUntil = 0;
    this.weapons = [];
    this.game = null;
    this.magnetRadius = 190;
    this.armor = 0;
    this.regeneration = 0;
    this.damageMultiplier = 1;
  }

  steerToMouse() {
    const target = createVector(mouseX + (this.game?.cameraOffsetX || 0), mouseY + (this.game?.cameraOffsetY || 0));
    this.applyForce(Steering.arrive(this, target, 160));
  }

  damage(amount) {
    if (this.game?.isSheltered?.(this.pos) || this.game?.shelter?.protects(this.pos)) return false;
    if (millis() < this.invulnerableUntil) return false;
    amount *= 1 - this.armor;
    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    this.game?.stats?.add('hullLost', Math.min(Math.max(0, this.hp), amount - absorbed));
    this.hp -= amount - absorbed;
    this.invulnerableUntil = millis() + 450;
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  addXp(amount) {
    this.xp += amount;
    return this.consumeLevel();
  }

  consumeLevel() {
    const needed = 10 + this.level * 8;
    if (this.xp < needed) return false;
    this.xp -= needed;
    this.level++;
    this.game?.stats?.add('levels');
    if (this.level % 2 === 0) this.game?.spawnAllyDrone?.();
    return true;
  }

  show() {
    if (playerArt) {
      push();
      imageMode(CENTER);
      translate(this.pos.x, this.pos.y);
      rotate(this.vel.heading() + HALF_PI);
      if (this.dead) drawingContext.globalAlpha = 0.32;
      if (!(typeof SpriteCache !== 'undefined' && SpriteCache.draw('player', 0, 0, 70))) image(playerArt, 0, 0, 70, 70);
      imageMode(CORNER);
      pop();
      if (this.shield > 0) { noFill(); stroke('#69a7ff'); strokeWeight(2); circle(this.pos.x, this.pos.y, 58); }
      return;
    }
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading() + HALF_PI);
    noStroke(); fill(this.dead ? '#555' : '#dffcff');
    triangle(0, -27, -17, 17, 0, 10); triangle(0, -27, 17, 17, 0, 10);
    fill('#65eaff'); triangle(0, -20, -8, 11, 0, 6); triangle(0, -20, 8, 11, 0, 6);
    fill('#ffffff'); ellipse(0, -5, 8, 15); fill('#b4a6ff'); ellipse(0, -5, 4, 10);
    fill('#ffbd6b'); ellipse(-8, 14, 5, 12); ellipse(8, 14, 5, 12); pop();
    if (this.shield > 0) { noFill(); stroke('#69a7ff'); circle(this.pos.x, this.pos.y, 48); }
  }
}
