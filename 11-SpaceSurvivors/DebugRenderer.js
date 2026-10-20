// Diagnostic de l'état enregistré, ne calcule et n'applique aucun steering.
const DebugRenderer = {
  arrow(x, y, vector, scale, color) {
    if (!vector || vector.magSq() < 0.0001) return;
    push(); translate(x, y); stroke(color); strokeWeight(1.5);
    line(0, 0, vector.x * scale, vector.y * scale);
    translate(vector.x * scale, vector.y * scale); rotate(vector.heading());
    fill(color); noStroke(); triangle(0, 0, -7, -3, -7, 3); pop();
  },
  show(agent) {
    push(); noFill(); stroke(107, 220, 226, 170); strokeWeight(1);
    circle(agent.pos.x, agent.pos.y, agent.radius * 2);
    if (agent.debugPerception) {
      drawingContext.setLineDash([3, 6]); stroke(171, 149, 229, 45);
      circle(agent.pos.x, agent.pos.y, agent.debugPerception * 2);
      drawingContext.setLineDash([]);
    }
    if (agent.debugTarget && agent.debugRadius) {
      drawingContext.setLineDash([5, 6]); stroke(218, 198, 124, 65);
      circle(agent.debugTarget.x, agent.debugTarget.y, agent.debugRadius * 2);
      drawingContext.setLineDash([]);
    }
    if (agent.debugTarget) {
      drawingContext.setLineDash([3, 5]); stroke(218, 198, 124, 100);
      line(agent.pos.x, agent.pos.y, agent.debugTarget.x, agent.debugTarget.y);
      drawingContext.setLineDash([]);
      circle(agent.debugTarget.x, agent.debugTarget.y, 7);
    }
    pop();
    this.arrow(agent.pos.x, agent.pos.y, agent.vel, 16, '#9ae6a0');
    this.arrow(agent.pos.x, agent.pos.y, agent.debugForce, 130, '#ffae70');
  }
};
