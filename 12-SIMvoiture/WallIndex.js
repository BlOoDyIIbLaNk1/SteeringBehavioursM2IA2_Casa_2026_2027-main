// Préfiltre géométrique conservatif. Ray.cast et les tests de collision du TP
// sont toujours les tests exacts : aucune approximation des distances.
class WallIndex {
  constructor(walls,cellSize=80) {
    this.walls=walls;this.length=walls.length;this.cellSize=cellSize;
    this.cells=new Map();this.marks=new Uint32Array(walls.length);this.stamp=0;this.result=[];
    walls.forEach((wall,index)=>{
      const minX=Math.floor(Math.min(wall.a.x,wall.b.x)/cellSize),maxX=Math.floor(Math.max(wall.a.x,wall.b.x)/cellSize);
      const minY=Math.floor(Math.min(wall.a.y,wall.b.y)/cellSize),maxY=Math.floor(Math.max(wall.a.y,wall.b.y)/cellSize);
      for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++) {
        const key=`${x},${y}`;
        if(!this.cells.has(key))this.cells.set(key,[]);
        this.cells.get(key).push(index);
      }
    });
  }
  query(x1,y1,x2,y2,padding=0) {
    this.result.length=0;
    if(++this.stamp>=4294967295) {this.marks.fill(0);this.stamp=1;}
    const cell=this.cellSize;
    const minX=Math.floor((Math.min(x1,x2)-padding)/cell),maxX=Math.floor((Math.max(x1,x2)+padding)/cell);
    const minY=Math.floor((Math.min(y1,y2)-padding)/cell),maxY=Math.floor((Math.max(y1,y2)+padding)/cell);
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++) {
      const bucket=this.cells.get(`${x},${y}`);
      if(!bucket)continue;
      for(const index of bucket)if(this.marks[index]!==this.stamp) {
        this.marks[index]=this.stamp;this.result.push(this.walls[index]);
      }
    }
    return this.result;
  }
}
