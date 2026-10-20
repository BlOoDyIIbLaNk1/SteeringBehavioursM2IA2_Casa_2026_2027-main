const SimApp = {
  sim: null, preview: null, selectedId: 0, clock:new SimulationClock(),renderer:new TrackRenderer(),
  ready: false, lastUI: 0, measuredSteps: 0, measureTime: 0, actualRate: 0,
  replace(simulation, mode) {
    this.sim?.dispose(); this.sim = simulation;
    if(simulation instanceof Evolution)simulation.deferGenerations=true;
    this.selectedId = 0; this.clock.reset(); this.measuredSteps = 0;this.measureTime=performance.now();
    SimUI.switchMode(mode); SimUI.update();
  }
};

async function setup() {
  const canvas = createCanvas(1200,760);
  canvas.parent('track-canvas'); pixelDensity(1); frameRate(60);
  try {
    await tf.setBackend('cpu'); await tf.ready();
    // Le banc de tests navigateur possède son propre espace de sauvegarde.
    if (new URLSearchParams(location.search).has('qa')) BrainStore.key = 'simvoiture.brains.qa.v1';
    SimApp.preview = new SimTrack(CircuitGenerator.id(42,2));
    SimUI.init(); SimApp.ready = true; SimApp.measureTime = performance.now();
  } catch(error) {
    document.getElementById('message').textContent = `Initialisation impossible : ${error.message}. Ouvre le dossier avec Live Server depuis le dépôt complet.`;
    document.getElementById('engine-status').textContent = 'Erreur moteur';
  }
}

function draw() {
  if (!SimApp.ready) return;
  const now = performance.now(), sim = SimApp.sim;
  const requested=SimUI.el('time-scale').value;
  SimApp.measuredSteps+=SimApp.clock.run(sim,deltaTime,requested==='max'?'max':Number(requested));
  if (now - SimApp.measureTime >= 1000) {
    SimApp.actualRate = SimApp.measuredSteps / ((now-SimApp.measureTime)/1000) / 60;
    SimApp.measuredSteps = 0; SimApp.measureTime = now;
    const fps=Math.round(frameRate());
    SimUI.text('performance',`${fps} FPS · ${SimApp.actualRate.toFixed(1)}× réel / ${requested==='max'?'MAX':requested+'×'} demandé`);
    const counter=SimUI.el('performance');counter.dataset.fps=fps;counter.dataset.rate=SimApp.actualRate.toFixed(2);
    counter.title=`Calcul du dernier rendu : ${SimApp.clock.lastComputeMs.toFixed(2)} ms. Le multiplicateur réel dépend du nombre de voitures et de la machine.`;
  }
  const track = sim?.track || SimApp.preview;
  SimApp.renderer.draw(drawingContext,track,SimUI.el('checkpoints').checked,sim);
  if (sim) {
    const leader = sim.bestCar();
    // Dessiner la voiture sélectionnée en dernier, même au départ du groupe.
    for (const car of sim.cars) if (car.id !== SimApp.selectedId) car.show(false,car === leader,false);
    sim.cars.find(car => car.id === SimApp.selectedId)?.show(true,false,SimUI.el('debug').checked);
  }
  if (now - SimApp.lastUI > 160) { SimUI.update(); SimApp.lastUI = now; }
}

function mousePressed() {
  if (!SimApp.ready || !SimApp.sim || mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) return;
  const point = createVector(mouseX,mouseY);
  const cars = [...SimApp.sim.cars].sort((a,b) => p5.Vector.dist(a.pos,point)-p5.Vector.dist(b.pos,point));
  if (cars[0] && p5.Vector.dist(cars[0].pos,point) < 26) {
    SimApp.selectedId = cars[0].id; SimUI.update();
  }
}
