class BossArena extends SpaceVehicle {
  constructor(x, y, radius, boss) {
    super(x, y, radius);
    this.boss = boss;
    this.active = true;
    const count = Math.max(40, Math.ceil(TWO_PI * radius / 40));
    this.guards = Array.from({ length: count }, (_, index) => new ArenaGuard(this, index * TWO_PI / count));
  }
  updateArena() {
    if (!this.boss.dead) return;
    this.active = false;
    for (const guard of this.guards) { guard.dead = true; guard.hp = 0; }
  }
  steerInside(agent) {
    if (this.active && this.distanceTo(agent) > this.radius - agent.radius - 44) {
      agent.applyForce(Steering.seek(agent, this.pos));
    }
  }
  contain(agent) {
    if (!this.active) return;
    const offset = p5.Vector.sub(agent.pos, this.pos);
    const distance = offset.mag();
    const boundary = Math.max(0, this.radius - agent.radius - 10);
    if (!distance || distance <= boundary) return;
    // Réponse de collision du mur, distincte de la force préventive de steering.
    const normal = offset.div(distance);
    agent.pos = this.pos.copy().add(normal.copy().mult(boundary));
    const outward = agent.vel.x * normal.x + agent.vel.y * normal.y;
    if (outward > 0) agent.vel.sub(normal.mult(outward));
  }
  show() {
    if (!this.active) return;
    if (typeof SpriteCache !== 'undefined' && SpriteCache.draw('ring-arena', this.pos.x, this.pos.y, this.radius * 2.4)) return;
    push(); noFill(); stroke(222, 155, 130, 110); strokeWeight(2);
    circle(this.pos.x, this.pos.y, this.radius * 2);
    stroke(225, 192, 155, 35); strokeWeight(1);
    circle(this.pos.x, this.pos.y, (this.radius - 12) * 2);
    pop();
  }
}
