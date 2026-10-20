class SimTrack extends Vehicle {
  static layouts = {
    aurora: { name: 'Aurora', subtitle: 'Courbes larges · découverte', points: [[270,160],[850,160],[1010,300],[1010,490],[850,600],[290,600],[170,490],[170,300]] },
    lagune: { name: 'Lagune', subtitle: 'Virages enchaînés · adaptation', points: [[270,170],[540,200],[830,150],[1010,300],[910,500],[680,580],[580,440],[380,580],[190,440],[180,280]] },
    sierra: { name: 'Sierra', subtitle: 'Épingles douces · précision', points: [[230,180],[550,150],[970,180],[1000,370],[830,580],[650,540],[620,340],[450,360],[420,580],[210,530],[170,350]] }
  };

  constructor(id = 'aurora', roadWidth = 110) {
    super(600, 380);
    const recipe = CircuitGenerator.parse(id);
    if (!SimTrack.layouts[id] && !recipe) throw new Error('Circuit inconnu.');
    this.id = id;
    this.name = recipe ? `Circuit #${recipe.seed}` : SimTrack.layouts[id].name;
    this.subtitle = recipe ? `Généré · difficulté ${recipe.difficulty}/3` : SimTrack.layouts[id].subtitle;
    this.recipe = recipe;
    this.roadWidth = roadWidth;
    this.maxSpeed = 0;
    this.maxForce = 0;
    // Interpolation Catmull-Rom et ré-échantillonnage directement fournis dans 9b.
    const generated = recipe ? CircuitGenerator.generate(recipe.seed,recipe.difficulty,roadWidth) : null;
    this.path = generated ? generated.path : resamplePoints(interpolatePoints(SimTrack.layouts[id].points, 10), 42);
    this.method = generated?.method;
    Object.assign(this,SimTrack.geometry(this.path,roadWidth));
    this.walls = []; this.checkpoints = [];
    this.path.forEach((point, index) => {
      const next = (index + 1) % this.path.length;
      this.walls.push(new TrackWall(this.inner[index], this.inner[next]), new TrackWall(this.outer[index], this.outer[next]));
      this.checkpoints.push(new TrackWall(this.inner[index], this.outer[index], 'checkpoint'));
    });
    this.start = createVector(...this.path[0]);
    this.startAngle = p5.Vector.sub(createVector(...this.path[1]), this.start).heading();
    this.length = this.path.reduce((sum, point, i) => sum + dist(...point, ...this.path[(i + 1) % this.path.length]), 0);
  }

  static geometry(path,width) {
    const inner=[],outer=[];
    path.forEach((point,index) => {
      const before=path[(index-1+path.length)%path.length],after=path[(index+1)%path.length];
      const normal=createVector(-(after[1]-before[1]),after[0]-before[0]).normalize().mult(width/2);
      inner.push([point[0]+normal.x,point[1]+normal.y]);
      outer.push([point[0]-normal.x,point[1]-normal.y]);
    });
    return {inner,outer};
  }

  hit(start, end, radius = 6) {
    return this.wallCandidates(start.x,start.y,end.x,end.y,radius).some(wall => distPointToSegment(end, wall.a, wall.b) <= radius
      || doSegmentsIntersect([start.x,start.y], [end.x,end.y], [wall.a.x,wall.a.y], [wall.b.x,wall.b.y]));
  }

  wallCandidates(x1,y1,x2,y2,padding=0) {
    if(!this.wallIndex || this.wallIndex.walls!==this.walls || this.wallIndex.length!==this.walls.length)this.wallIndex=new WallIndex(this.walls);
    return this.wallIndex.query(x1,y1,x2,y2,padding);
  }

  show(checkpointsVisible) {
    const context = drawingContext;
    const polygon = (points, begin = true) => {
      if (begin) context.beginPath();
      points.forEach((p, i) => i ? context.lineTo(...p) : context.moveTo(...p)); context.closePath();
    };
    context.save();
    // Marquages statiques : la géométrie de collision du TP reste inchangée.
    context.strokeStyle = '#486056'; context.lineWidth = 14;
    polygon(this.outer); context.stroke(); polygon(this.inner); context.stroke();
    polygon(this.outer); polygon(this.inner, false);
    context.fillStyle = '#303b43'; context.fill('evenodd');
    for (const edge of [this.outer, this.inner]) {
      context.lineWidth = 6; context.strokeStyle = '#d8d4bf';
      polygon(edge); context.stroke();
      context.setLineDash([12,12]); context.strokeStyle = '#a95751'; context.stroke();
      context.setLineDash([]);
    }
    context.setLineDash([8, 13]); context.lineWidth = 1; context.strokeStyle = '#e0d8b83a';
    polygon(this.path); context.stroke(); context.setLineDash([]);
    // Flèches peintes : donnent le sens de lecture à l'humain, pas au réseau.
    context.strokeStyle = '#d8d4bf65'; context.lineWidth = 2;
    for (let i=3;i<this.path.length;i+=8) {
      const point=this.path[i], next=this.path[(i+1)%this.path.length];
      context.save(); context.translate(...point);
      context.rotate(Math.atan2(next[1]-point[1],next[0]-point[0]));
      context.beginPath(); context.moveTo(-4,-4); context.lineTo(1,0); context.lineTo(-4,4); context.stroke();
      context.restore();
    }
    if (checkpointsVisible) {
      context.strokeStyle = '#8ec5b62e'; context.lineWidth = 1;
      for (const cp of this.checkpoints) { context.beginPath(); context.moveTo(cp.a.x,cp.a.y); context.lineTo(cp.b.x,cp.b.y); context.stroke(); }
    }
    const cp = this.checkpoints[0];
    context.strokeStyle = '#111e25'; context.lineWidth = 10;
    context.beginPath(); context.moveTo(cp.a.x,cp.a.y); context.lineTo(cp.b.x,cp.b.y); context.stroke();
    context.strokeStyle = '#ece0be'; context.lineWidth = 7; context.setLineDash([5,5]); context.stroke();
    context.setLineDash([]);
    context.restore();
  }
}
