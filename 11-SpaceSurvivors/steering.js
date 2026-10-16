const Steering = {
  observe(agent, target, radius = 0) {
    if (!agent.game?.debug) return;
    agent.debugTarget = target.copy();
    agent.debugRadius = radius;
  },
  seek(agent, target, maxSpeed = agent.maxSpeed, maxForce = agent.maxForce) {
    Steering.observe(agent, target);
    if (p5.Vector.sub(target, agent.pos).magSq() === 0) return createVector(0, 0);
    // Adaptateur sans mutation des limites : même seek que dans le TP.
    // Les limites spécifiques aux tirs restent inchangées.
    return Vehicle.prototype.seek.call({
      pos: agent.pos, vel: agent.vel, maxSpeed, maxForce
    }, target);
  },

  arrive(agent, target, slowingRadius = 120) {
    Steering.observe(agent, target, slowingRadius);
    const offset = p5.Vector.sub(target, agent.pos);
    const distance = offset.mag();
    if (distance === 0) return agent.vel.copy().mult(-1).limit(agent.maxForce);
    const speed = agent.maxSpeed * constrain(distance / slowingRadius, 0, 1);
    offset.setMag(speed);
    return p5.Vector.sub(offset, agent.vel).limit(agent.maxForce);
  },

  flee(agent, threat, safeRadius = Infinity) {
    const offset = p5.Vector.sub(agent.pos, threat);
    if (offset.magSq() === 0 || offset.mag() > safeRadius) return createVector(0, 0);
    offset.setMag(agent.maxSpeed);
    return p5.Vector.sub(offset, agent.vel).limit(agent.maxForce);
  },

  pursue(agent, target, prediction = 0.45) {
    const future = target.pos.copy().add(target.vel.copy().mult(prediction));
    return Steering.seek(agent, future);
  },

  separation(agent, neighbors, radius = 46) {
    const force = createVector(0, 0);
    let count = 0;
    const radiusSq = radius * radius;
    for (const other of neighbors) {
      if (other === agent) continue;
      const dx = agent.pos.x - other.pos.x;
      const dy = agent.pos.y - other.pos.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > 0 && distanceSq < radiusSq) {
        force.x += dx / distanceSq;
        force.y += dy / distanceSq;
        count++;
      }
    }
    if (count === 0) return force;
    force.div(count).setMag(agent.maxSpeed);
    return p5.Vector.sub(force, agent.vel).limit(agent.maxForce);
  },

  bounceFromEdges(agent, margin = 60) {
    const force = createVector(0, 0);
    const bounds = agent.game?.cameraBounds || { left: 0, right: width, top: 0, bottom: height };
    if (agent.pos.x < bounds.left + margin) force.x = agent.maxSpeed;
    if (agent.pos.x > bounds.right - margin) force.x = -agent.maxSpeed;
    if (agent.pos.y < bounds.top + margin) force.y = agent.maxSpeed;
    if (agent.pos.y > bounds.bottom - margin) force.y = -agent.maxSpeed;
    return force.magSq() ? p5.Vector.sub(force, agent.vel).limit(agent.maxForce) : force;
  }
};
