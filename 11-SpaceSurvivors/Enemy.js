class Enemy extends SpaceVehicle {
  constructor(x, y, kind = 'drone') {
    super(x, y, kind === 'elite' || kind === 'hunter' ? 20 : 13);
    this.kind = kind;
    this.maxSpeed = kind === 'swift' || kind === 'charger' ? 3.2 : kind === 'elite' ? 1.7 : kind === 'hunter' ? 1.45 : kind === 'encircler' ? 2.4 : 2.1;
    this.maxForce = kind === 'elite' ? 0.11 : 0.16;
    this.hp = kind === 'elite' || kind === 'hunter' ? 35 : kind === 'swift' || kind === 'charger' ? 10 : 18;
    this.damageValue = kind === 'elite' || kind === 'charger' ? 18 : 10;
    this.xpValue = kind === 'elite' || kind === 'hunter' ? 5 : 2;
    this.shootCooldown = floor(random(40, 120));
  }

  tickStatus() {
    if (this.burnFrames > 0) {
      this.burnFrames--;
      if (this.game?.canAttack?.() === false) return;
      this.game?.stats?.recordDamage(this, this.burnDamage / 60);
      this.hp -= this.burnDamage / 60;
      if (this.hp <= 0) this.dead = true;
    }
  }

  updateAgainst(player, enemies) {
    this.tickStatus();
    if (this.dead) return;
    const normalSpeed = this.maxSpeed;
    if (this.game?.debug) this.debugPerception = this.radius * 3;
    if (this.slowFrames > 0) { this.slowFrames--; this.maxSpeed *= 0.5; }
    if (this.caged) {
      // A singularity overrides the enemy's current objective until the cage ends.
    } else if (this.kind === 'charger') {
      this.applyForce(Steering.seek(this, player.pos, this.maxSpeed * 1.4, this.maxForce));
    } else if (this.kind === 'encircler') {
      const orbit = player.pos.copy().add(p5.Vector.fromAngle(frameCount * 0.02 + this.orbitOffset).setMag(160));
      this.applyForce(Steering.arrive(this, orbit, 100));
    } else if (this.kind === 'swarm' && this.formationLeader && !this.formationLeader.dead) {
      const offset = this.formationOffset.copy().rotate(this.formationLeader.vel.heading());
      const formationPoint = this.formationLeader.pos.copy().add(offset);
      this.applyForce(Steering.arrive(this, formationPoint, 80));
    } else if (this.kind === 'swarm') {
      this.applyForce(Steering.pursue(this, player, 0.2));
      this.applyForce(Steering.separation(this, enemies, 24).mult(0.25));
    } else {
      this.applyForce(Steering.pursue(this, player, this.kind === 'hunter' ? 0.75 : 0.35));
    }
    this.applyForce(Steering.separation(this, enemies, this.radius * 3).mult(0.7));
    this.applyForce(Steering.bounceFromEdges(this, 30).mult(0.2));
    super.update();
    this.maxSpeed = normalSpeed;
  }

  tryShoot(player, enemyProjectiles) {
    if (this.dead) return;
    if (!['hunter', 'elite', 'encircler'].includes(this.kind)) return;
    this.shootCooldown--;
    if (this.shootCooldown > 0) return;
    const direction = p5.Vector.sub(player.pos, this.pos).setMag(4.2);
    const shot = new EnemyProjectile(this.pos.x, this.pos.y, direction, this.kind === 'elite' ? 14 : 8);
    shot.game = this.game;
    enemyProjectiles.push(shot);
    this.shootCooldown = this.kind === 'elite' ? 75 : 115;
  }

  show() {
    if (enemyArt) {
      const column = this.kind === 'swift' || this.kind === 'charger' ? 1 : this.kind === 'elite' || this.kind === 'hunter' ? 0 : 0;
      const row = this.kind === 'swarm' ? 1 : 0;
      if (typeof SpriteCache !== 'undefined' && SpriteCache.draw(`enemy-${column}-${row}`, this.pos.x, this.pos.y, this.radius * 3)) return;
      imageMode(CENTER);
      image(enemyArt, this.pos.x, this.pos.y, this.radius * 3, this.radius * 3, column * enemyArt.width / 2, row * enemyArt.height / 2, enemyArt.width / 2, enemyArt.height / 2);
      imageMode(CORNER);
      return;
    }
    push(); translate(this.pos.x, this.pos.y); rotate(this.vel.heading());
    noStroke(); fill(this.kind === 'elite' ? '#ff9f43' : this.kind === 'swift' ? '#ff5c8a' : '#d85cff');
    ellipse(0, 0, this.radius * 2, this.radius * 1.35);
    fill('#27123b'); ellipse(4, 0, 5, 5); pop();
  }
}
