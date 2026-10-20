// Interface : activations réelles du modèle sélectionné, sans changer ses poids.
const NetworkView = {
  draw(canvas, car) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0,0,width,height);
    if (!car) return;
    const trace = car.brain.traceFast ? car.brain.traceFast(car.inputs) : car.brain.trace(car.inputs);
    const positions = trace.layers.map((layer, column) => layer.map((value, row) => ({
      x: 24 + column * (width - 48) / (trace.layers.length - 1),
      y: 18 + (row + 0.5) * (height - 36) / layer.length, value
    })));
    for (let layer = 0; layer < positions.length - 1; layer++) {
      const weights = trace.weights[layer * 2].values;
      const count = positions[layer + 1].length;
      positions[layer].forEach((from,i) => positions[layer + 1].forEach((to,j) => {
        const weight = weights[i * count + j];
        const strength = Math.min(1, Math.abs(weight * from.value));
        ctx.strokeStyle = weight >= 0 ? `rgba(142,209,184,${0.06 + strength * 0.65})` : `rgba(233,158,142,${0.06 + strength * 0.65})`;
        ctx.lineWidth = 0.5 + strength;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
      }));
    }
    positions.forEach(layer => layer.forEach(node => {
      ctx.fillStyle = `rgba(237,210,154,${0.15 + Math.min(1,Math.abs(node.value)) * 0.85})`;
      ctx.beginPath(); ctx.arc(node.x,node.y, Math.min(7, (height - 36) / layer.length / 2.7),0,Math.PI*2); ctx.fill();
    }));
    return trace;
  },
  history(canvas, history) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0,0,width,height);
    if (!history.length) return;
    const highest = Math.max(1,...history.map(item => item.best));
    for (const [key,color] of [['mean','#7b9f9b'],['best','#e6ca91']]) {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
      history.forEach((item,i) => {
        const x = 4 + i * (width - 8) / Math.max(1,history.length - 1);
        const y = height - 5 - item[key] / highest * (height - 10);
        if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
      });
      ctx.stroke();
      if (history.length === 1) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(4,height-5-history[0][key]/highest*(height-10),3,0,Math.PI*2); ctx.fill();
      }
    }
  }
};
