class BouncingBall extends Target {
    constructor(x, y) {
      super(x, y);
      this.r = 10;
    }

    update() {
        // tient compte des comportements (forces appliquées)
        super.update();

        // teste la collision avec les bords du canvas
        this.testeCollisionAvecBordsDuCanvas();
    }

    testeCollisionAvecBordsDuCanvas() {

        // si on atteint le bord droit, on rebondit
        if(this.pos.x + this.r >= width){
            // on se remet au point de contact
            this.pos.x = width - this.r;
            this.vel.x = -this.vel.x;
        }

        if(this.pos.x - this.r  <= 0) {
            this.pos.x = this.r;
            this.vel.x = -this.vel.x;
        }

        if(this.pos.y + this.r >= height){
            this.pos.y = height - this.r;
            this.vel.y = -this.vel.y;
        }

        if(this.pos.y - this.r  <= 0) {
            this.pos.y = this.r;
            this.vel.y = -this.vel.y;
        }
    }
  }