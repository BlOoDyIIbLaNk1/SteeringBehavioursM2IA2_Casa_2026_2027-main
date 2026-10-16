// Indicateur DOM : repère écran uniquement, distinct des véhicules du monde.
class NavigationHud {
  constructor(root) {
    this.marker = document.createElement('div');
    this.marker.className = 'navigation-marker';
    this.marker.hidden = true;
    this.marker.setAttribute('role', 'status');
    this.marker.innerHTML = `
      <div class="navigation-pointer"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 8 38 24 10 40 18 24Z"/></svg></div>
      <div class="navigation-caption"><span>DESTINATION</span><strong></strong><div class="navigation-progress"><i></i></div></div>`;
    root.append(this.marker);
  }

  static project(player, target, viewWidth, viewHeight) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    const sideMargin = Math.min(88, viewWidth * 0.22);
    const topMargin = Math.min(210, viewHeight * 0.34);
    const bottomMargin = Math.min(240, viewHeight * 0.34);
    const xLimit = Math.max(1, centerX - sideMargin);
    const yLimit = Math.max(1, dy < 0 ? centerY - topMargin : centerY - bottomMargin);
    const edgeScale = Math.min(1, dx ? xLimit / Math.abs(dx) : 1, dy ? yLimit / Math.abs(dy) : 1);
    const nearScale = distance ? Math.max(0.25, 1 - 110 / distance) : 0;
    const scale = Math.min(edgeScale, nearScale);
    return {
      x: centerX + dx * scale,
      y: centerY + dy * scale,
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
      distance,
      offscreen: Math.abs(dx) > centerX || Math.abs(dy) > centerY
    };
  }

  update(game) {
    const target = game.destination;
    this.marker.hidden = !target || !game.started || game.gameOver || game.paused || game.levelUp || game.sectorComplete;
    if (this.marker.hidden) return;
    const marker = NavigationHud.project(game.player.pos, target.pos, width, height);
    this.marker.style.left = `${marker.x}px`;
    this.marker.style.top = `${marker.y}px`;
    this.marker.querySelector('svg').style.transform = `rotate(${marker.angle}deg)`;
    this.marker.querySelector('strong').textContent = `${Math.round(marker.distance)} m`;
    const progress = Math.max(0, Math.min(1, 1 - marker.distance / game.routeLength));
    this.marker.querySelector('.navigation-progress i').style.transform = `scaleX(${progress})`;
    this.marker.setAttribute('aria-label', `Destination à ${Math.round(marker.distance)} mètres`);
  }
}
