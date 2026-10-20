// Contrat a/b/type de Boundary (9b), entité visible dérivée de Vehicle.
class TrackWall extends Vehicle {
  constructor(a, b, type = 'wall') {
    super((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    this.a = createVector(...a);
    this.b = createVector(...b);
    this.type = type;
    this.maxSpeed = 0;
    this.maxForce = 0;
  }
}
