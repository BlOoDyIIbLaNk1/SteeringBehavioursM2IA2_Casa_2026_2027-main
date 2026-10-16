class SnakeWander extends Snake {
    constructor(x, y, length, taille, couleur) {
        super(x, y, length, taille, couleur);

        this.wanderWeight = 0.5;
        this.boundariesWeight = 0.2;

        //this.head.distanceCercle = 300
    }

    move() {
        // La tête erre
        let forceWander = this.head.wander();
        // la tete ne peut sortir de la fenetre, on applique boundaries
        let forceBoundaries = this.head.boundaries(0, 0, width, height, 50);
        
        // On applique des poids aux forces
        forceWander.mult(this.wanderWeight);
        forceBoundaries.mult(this.boundariesWeight);

        // On applique les forces
        this.head.applyForce(forceWander);
        this.head.applyForce(forceBoundaries);

        this.head.update();

        // Chaque anneau suit l'anneau précédent
        for (let i = 1; i < this.anneaux.length; i++) {
            let anneau = this.anneaux[i];
            let anneauPrecedent = this.anneaux[i - 1];
            let forceSuivi = anneau.arrive(anneauPrecedent.pos, 15);
            anneau.applyForce(forceSuivi);
            anneau.update();
        }
    }
}