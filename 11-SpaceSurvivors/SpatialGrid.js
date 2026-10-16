// Index de perception, sans mouvement ni modification des forces du TP.
class SpatialGrid {
  constructor(cellSize = 128) { this.cellSize = cellSize; this.cells = new Map(); this.maxRadius = 0; }
  rebuild(entities) {
    this.cells.clear();
    this.maxRadius = 0;
    for (const entity of entities) {
      if (entity.dead) continue;
      const key = `${Math.floor(entity.pos.x / this.cellSize)},${Math.floor(entity.pos.y / this.cellSize)}`;
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(entity);
      this.maxRadius = Math.max(this.maxRadius, entity.radius || 0);
    }
  }
  query(position, radius) {
    const result = [];
    const size = this.cellSize;
    for (let x = Math.floor((position.x - radius) / size); x <= Math.floor((position.x + radius) / size); x++) {
      for (let y = Math.floor((position.y - radius) / size); y <= Math.floor((position.y + radius) / size); y++) {
        const cell = this.cells.get(`${x},${y}`);
        if (cell) for (const entity of cell) result.push(entity);
      }
    }
    return result;
  }
}
