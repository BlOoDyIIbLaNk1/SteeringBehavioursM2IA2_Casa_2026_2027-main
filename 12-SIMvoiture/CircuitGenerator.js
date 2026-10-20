// Données de circuit uniquement : ne pilote jamais une voiture.
// Extraction de setupTrack/findLoop du TP 9b : recherche en profondeur d'une
// boucle sur grille. RNG local + contrôles géométriques ajoutés pour le labo.
const CircuitGenerator = {
  id(seed, difficulty = 2) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647 || ![1,2,3].includes(difficulty)) throw new Error('Graine ou difficulté du circuit invalide.');
    return `random:${seed}:${difficulty}`;
  },
  parse(id) {
    const match = /^random:(0|[1-9]\d{0,9}):([123])$/.exec(id);
    if (!match || Number(match[1]) > 2147483647) return null;
    return {seed:Number(match[1]), difficulty:Number(match[2])};
  },
  validId(id) { return ['aurora','lagune','sierra'].includes(id) || Boolean(this.parse(id)); },
  rng(seed) {
    // Générateur indépendant : créer une piste ne change pas les mutations p5.
    let state = seed >>> 0;
    return () => { state = (Math.imul(1664525,state) + 1013904223) >>> 0; return state / 4294967296; };
  },
  gridLoop(width, difficulty, random) {
    const cellSize = Math.max(120,width * 1.5);
    const cols = Math.floor(1200 / cellSize), rows = Math.floor(760 / cellSize);
    const grid = Array.from({length:cols},() => Array(rows).fill(false));
    const start = [Math.floor(cols/2),Math.floor(rows/2)], path = [start];
    let attempts = 0;
    const targetLength = Math.min(cols*rows-2,10+(difficulty-1)*8);
    function findLoop(x,y) {
      if (++attempts > 50000) return false;
      if (path.length >= targetLength && Math.abs(x-start[0])+Math.abs(y-start[1]) === 1) return true;
      if (path.length >= cols*rows*.98) return false;
      const directions = [[0,1],[0,-1],[1,0],[-1,0]];
      // Même exploration de voisins que le TP ; permutation uniforme plutôt
      // que sort(random-.5), pour un résultat stable et reproductible.
      for (let i=directions.length-1;i>0;i--) {
        const j=Math.floor(random()*(i+1));
        [directions[i],directions[j]]=[directions[j],directions[i]];
      }
      for (const [dx,dy] of directions) {
        const nx=x+dx,ny=y+dy;
        if (nx>=0 && nx<cols && ny>=0 && ny<rows && !grid[nx][ny]) {
          grid[nx][ny]=true;path.push([nx,ny]);
          if(findLoop(nx,ny)) return true;
          path.pop();grid[nx][ny]=false;
        }
      }
      return false;
    }
    grid[start[0]][start[1]]=true;
    if (!findLoop(...start)) return null;
    return path.map(([x,y]) => [(x+.5)*1200/cols,(y+.5)*760/rows]);
  },
  path(points) {
    const path = resamplePoints(interpolatePoints(points,15),42);
    // Sens positif : les normales intérieures gardent le contrat de SimTrack.
    const area = path.reduce((sum,p,i) => {const q=path[(i+1)%path.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
    return area < 0 ? path.reverse() : path;
  },
  safe(path,width) {
    const {inner,outer} = SimTrack.geometry(path,width);
    if ([...inner,...outer].some(([x,y]) => !Number.isFinite(x+y) || x<8 || x>1192 || y<8 || y>752)) return false;
    const crosses = polygon => polygon.some((p,i) => polygon.some((q,j) => {
      if (j<=i+1 || (i===0 && j===polygon.length-1)) return false;
      return doSegmentsIntersect(p,polygon[(i+1)%polygon.length],q,polygon[(j+1)%polygon.length]);
    }));
    if (crosses(inner) || crosses(outer)) return false;
    for (let i=0;i<inner.length;i++) for (let j=0;j<outer.length;j++) {
      if (doSegmentsIntersect(inner[i],inner[(i+1)%inner.length],outer[j],outer[(j+1)%outer.length])) return false;
    }
    // Assez d'espace pour le rayon de collision du véhicule, y compris aux
    // virages. Le centre du couloir ne doit pas traverser un autre mur.
    for (let i=0;i<path.length;i++) {
      const pos=createVector(...path[i]),next=path[(i+1)%path.length];
      for (let j=0;j<path.length;j++) for (const border of [inner,outer]) {
        const a=border[j],b=border[(j+1)%border.length];
        if (distPointToSegment(pos,createVector(...a),createVector(...b))<10 || doSegmentsIntersect(path[i],next,a,b)) return false;
      }
    }
    return true;
  },
  generate(seed,difficulty,width) {
    this.id(seed,difficulty);
    if (!Number.isFinite(width) || width<70 || width>140) throw new Error('Largeur du circuit invalide.');
    const random=this.rng(seed);
    for(let attempt=0;attempt<20;attempt++) {
      const points=this.gridLoop(width,difficulty,random);
      if (!points) continue;
      const path=this.path(points);
      if(this.safe(path,width)) return {path,method:'grille TP 9b'};
    }
    // Repli borné : coque convexe du TP sur un nouveau nuage ALÉATOIRE.
    // Aucun tracé enregistré / ovale fixe n'est substitué à la génération.
    for(let attempt=0;attempt<20;attempt++) {
      const points=Array.from({length:12},(_,i) => {
        const angle=i*Math.PI/6, radius=.82+random()*.16;
        return [600+Math.cos(angle)*425*radius,380+Math.sin(angle)*235*radius];
      });
      const path=this.path(getConvexHull(points));
      if(this.safe(path,width)) return {path,method:'coque convexe TP 9b'};
    }
    throw new Error('Impossible de construire une piste sûre. Choisis une autre graine.');
  },
  knownTracks(entries) {
    const known=new Map();
    for (const entry of entries) for (const item of [
      ...entry.config.tracks.map(track=>({track,width:entry.config.width})),
      ...(entry.training?.seenTracks || [])
    ]) known.set(`${item.track}/${item.width}`,item);
    return [...known.values()];
  },
  signature(track) {
    return JSON.stringify(track.path.map(([x,y])=>[Math.round(x*100),Math.round(y*100)]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
  },
  freshId(entries,width,difficulty,random = Math.random) {
    const known=this.knownTracks(entries);
    const shapes=new Set(known.map(item=>this.signature(new SimTrack(item.track,item.width))));
    let seed=Math.floor(random()*2147483648);
    for(let attempt=0;attempt<100;attempt++,seed=(seed+1)%2147483648) {
      const id=this.id(seed,difficulty);
      // Une graine déjà apprise est exclue, même à une autre difficulté.
      if (!known.some(item=>this.parse(item.track)?.seed===seed)) {
        const track=new SimTrack(id,width);
        if (!shapes.has(this.signature(track))) return track;
      }
    }
    throw new Error('Choisis une autre graine pour le test inédit.');
  }
};
