// Rendu uniquement : aucun pilote, aucune force, aucune nouvelle entité.
// Les livrées sont rasterisées une fois puis réutilisées pour toute la population.
class CarRenderer {
  static palette = ['#edbb70', '#82c9bd', '#84b8ec', '#ed8e88', '#bf9fe6', '#d8d897',
    '#80b8a0', '#e49abb', '#94a8df', '#c6d9dc', '#e6a674', '#a9c685'];
  static sprites = new Map();

  static color(id) {
    return this.palette[((id % this.palette.length) + this.palette.length) % this.palette.length];
  }

  static sprite(id) {
    const color = this.color(id);
    if (this.sprites.has(color)) return this.sprites.get(color);
    const canvas = document.createElement('canvas');
    canvas.width = 88;
    canvas.height = 64;
    const c = canvas.getContext('2d');
    c.scale(2, 2);
    c.translate(22, 16);
    const polygon = (points, fill) => {
      c.beginPath();
      points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.closePath();
      c.fillStyle = fill;
      c.fill();
    };
    // Ombre, quatre pneus, aileron et carrosserie dessinés à la main.
    c.fillStyle = '#00000055';
    c.beginPath(); c.ellipse(1, 2, 16, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#080e13';
    for (const x of [-9, 6]) for (const y of [-8, 5]) c.fillRect(x, y, 6, 3);
    c.fillStyle = '#c0cbd0'; c.fillRect(-12, -7, 2, 14);
    polygon([[-12,-5],[-7,-7],[6,-7],[13,-4],[14,0],[13,4],[6,7],[-7,7],[-12,5]], color);
    polygon([[-6,-5],[3,-5],[7,-3],[7,3],[3,5],[-6,5],[-8,3],[-8,-3]], '#132631');
    polygon([[-4,-4],[2,-4],[5,-2],[-4,-2]], '#92c7d3');
    c.fillStyle = color; c.fillRect(-4, -1.8, 5, 3.6);
    c.fillStyle = '#f3ecce'; c.fillRect(8,-1,5,2);
    c.fillRect(10,-5,2,2); c.fillRect(10,3,2,2);
    c.fillStyle = '#ec6e66'; c.fillRect(-12,-5,2,2); c.fillRect(-12,3,2,2);
    c.fillStyle = '#ffffff55'; c.fillRect(-6,-6,12,1);
    this.sprites.set(color, canvas);
    return canvas;
  }

  static draw(c, car, selected, leader, debug) {
    c.save();
    c.translate(car.pos.x, car.pos.y);
    c.rotate(car.vel.heading());
    c.globalAlpha = car.dead ? 0.22 : 1;
    if (selected || leader) {
      c.strokeStyle = selected ? '#f6d48d' : '#88c4b0';
      c.lineWidth = selected ? 2 : 1;
      c.beginPath(); c.ellipse(0,0,20,12,0,0,Math.PI*2); c.stroke();
    }
    c.drawImage(this.sprite(car.id), -22, -16, 44, 32);
    c.restore();
    if (selected) {
      c.save(); c.font = 'bold 10px system-ui'; c.textAlign = 'center';
      c.fillStyle = '#0b171e'; c.fillRect(car.pos.x-20,car.pos.y-32,40,14);
      c.fillStyle = car.dead ? '#ec9a8b' : '#f6d48d';
      c.fillText(`#${String(car.id+1).padStart(2,'0')}`,car.pos.x,car.pos.y-22);
      c.restore();
      if (debug) this.debug(c, car);
    }
  }

  static preview(canvas, id) {
    // Aperçu de la même livrée, pas un deuxième véhicule simulé.
    const c=canvas.getContext('2d');
    c.clearRect(0,0,canvas.width,canvas.height);
    c.fillStyle='#0f1c24'; c.fillRect(0,0,canvas.width,canvas.height);
    c.strokeStyle='#b9c5c61c'; c.setLineDash([10,12]);
    for (const y of [14,82]) {
      c.beginPath();c.moveTo(12,y);c.lineTo(canvas.width-12,y);c.stroke();
    }
    c.setLineDash([]);
    c.drawImage(this.sprite(id),canvas.width/2-66,0,132,96);
    c.fillStyle=this.color(id);c.font='bold 12px monospace';
    c.fillText(`#${String(id+1).padStart(2,'0')}`,12,52);
  }

  static debug(c, car) {
    c.save(); c.lineWidth = 1;
    car.rays.forEach((ray, index) => {
      if (!ray.end) return;
      const near = car.inputs[index] > 0.8;
      c.strokeStyle = near ? '#f19280bb' : '#e4c78b80';
      c.beginPath(); c.moveTo(car.pos.x,car.pos.y); c.lineTo(ray.end.x,ray.end.y); c.stroke();
      c.fillStyle = near ? '#f19280' : '#e4c78b';
      c.fillRect(ray.end.x-2,ray.end.y-2,4,4);
    });
    // Checkpoint = information de progression, jamais une force d'autopilote.
    const cp = car.track.checkpoints[car.checkpointIndex];
    if (cp && !car.finished) {
      c.strokeStyle = '#98d7c2'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cp.a.x,cp.a.y); c.lineTo(cp.b.x,cp.b.y); c.stroke();
    }
    for (const [vector, scale, color] of [[car.vel,18,'#8bd8a2'],[car.lastForce,100,'#ef9e7d']]) {
      const x=car.pos.x+vector.x*scale, y=car.pos.y+vector.y*scale;
      c.strokeStyle=color; c.lineWidth=2;
      c.beginPath(); c.moveTo(car.pos.x,car.pos.y); c.lineTo(x,y); c.stroke();
      if (vector.mag() > 0.0001) {
        const angle=vector.heading();
        c.beginPath(); c.moveTo(x-6*Math.cos(angle-.5),y-6*Math.sin(angle-.5));
        c.lineTo(x,y); c.lineTo(x-6*Math.cos(angle+.5),y-6*Math.sin(angle+.5)); c.stroke();
      }
    }
    c.restore();
  }
}
