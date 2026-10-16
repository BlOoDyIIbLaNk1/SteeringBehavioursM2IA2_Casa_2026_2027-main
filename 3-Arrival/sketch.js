let target;
let vehicles = [];


// Appelée avant de démarrer l'animation
function preload() {
  // en général on charge des images, des fontes de caractères etc.
  font = loadFont('./assets/inconsolata.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // La cible, ce sera la position de la souris
  target = createVector(random(width), random(height));

  // on cree des vehicules, autant que de points
  creerVehicules(1);
}

function creerVehicules(n) {
  for (let i = 0; i < n; i++) {
    let v = new Vehicle(random(width), random(height));
    vehicles.push(v);
  }
}

// appelée 60 fois par seconde
function draw() {
  // couleur pour effacer l'écran
  background(0);
  // pour effet psychedelique
  //background(0, 0, 0, 10);


  target.x = mouseX;
  target.y = mouseY;

  // dessin de la cible à la position de la souris
  push();
  fill(255, 0, 0);
  noStroke();
  ellipse(target.x, target.y, 32);
  pop();

  // si on a affaire au premier véhicule
  // alors il suit la souris (target)
  let steeringForce;
  // le premier véhicule suit la souris avec arrivée
  vehicles.forEach((vehicle, index) => {
  
    // le premier véhicule suit la souris avec arrivée
    steeringForce = vehicle.arrive(target, 0);
       vehicle.applyForce(steeringForce);
       vehicle.update();
      vehicle.show();
    })

}

function keyPressed() {
  if (key === 'd') {
    Vehicle.debug = !Vehicle.debug;
  } 
}