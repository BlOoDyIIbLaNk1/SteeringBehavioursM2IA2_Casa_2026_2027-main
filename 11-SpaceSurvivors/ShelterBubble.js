// Refuge de mission immobile : reste une entité Vehicle sans remplacer sa locomotion.
class ShelterBubble extends SpaceVehicle {
  constructor(x, y, radius = 150) {
    super(x, y, radius);
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.label = 'REFUGE IONIQUE';
    this.healUsed = false;
  }

  protects(position) {
    return p5.Vector.dist(this.pos, position) + 18 <= this.radius;
  }

  heal(player) {
    if (this.healUsed || player.dead || !this.protects(player.pos) || player.hp >= player.maxHp) return 0;
    const amount = Math.min(10, player.maxHp - player.hp);
    player.hp += amount;
    this.healUsed = true;
    return amount;
  }

  steerAway(agent) {
    if (agent.dead) return;
    agent.applyForce(Steering.flee(agent, this.pos, this.radius + agent.radius + 70));
  }

  keepOutside(agent) {
    const normal = p5.Vector.sub(agent.pos, this.pos);
    const distance = normal.mag();
    const limit = this.radius + agent.radius + 1;
    if (distance >= limit) return;
    if (distance === 0) { normal.x = 1; normal.y = 0; }
    else normal.div(distance);
    // Collision de la paroi, indépendante de la force de fuite préventive.
    agent.pos = this.pos.copy().add(normal.copy().mult(limit));
    const inward = agent.vel.x * normal.x + agent.vel.y * normal.y;
    if (inward < 0) agent.vel.sub(normal.mult(inward));
  }

  intersectsSegment(start, end, margin = 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? constrain(((this.pos.x - start.x) * dx + (this.pos.y - start.y) * dy) / lengthSq, 0, 1) : 0;
    const x = start.x + t * dx - this.pos.x;
    const y = start.y + t * dy - this.pos.y;
    return x * x + y * y <= (this.radius + margin) ** 2;
  }

  blockProjectile(shot, start) {
    if (!this.intersectsSegment(start, shot.pos, shot.radius)) return false;
    if (!shot.persistent) shot.life = 0;
    else {
      const incoming = shot.vel.copy();
      shot.pos = start.copy();
      this.keepOutside(shot);
      const normal = p5.Vector.sub(shot.pos, this.pos).normalize();
      const inward = incoming.x * normal.x + incoming.y * normal.y;
      shot.vel = inward < 0 ? incoming.sub(normal.mult(2 * inward)) : incoming;
    }
    return true;
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
    textSize(10);
    text(this.healUsed ? 'ZONE NEUTRE · SOIN UTILISÉ' : 'ZONE NEUTRE · +10 PV', 0, this.radius - 28);
    pop();
  }
}
