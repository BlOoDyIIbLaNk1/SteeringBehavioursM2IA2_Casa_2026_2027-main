class SectorMenu {
  constructor() { this.root = document.getElementById('sector-menu'); }
  update(game) {
    this.root.hidden = !game.sectorComplete;
    if (this.root.hidden) return;
    const next = game.sectorComplete.next;
    document.getElementById('sector-complete-label').textContent = `SECTEUR ${String(game.wave).padStart(2, '0')} TERMINÉ`;
    document.getElementById('sector-next-title').textContent = `Cap sur le secteur ${String(next.sector).padStart(2, '0')}.`;
    document.getElementById('sector-next-mode').textContent = next.mode === 'sanctuary' ? 'TRAVERSÉE · REJOINDRE LA BALISE' : 'COMBAT · VAGUE ET GARDIEN';
    document.getElementById('sector-next-description').textContent = next.hint;
    document.getElementById('sector-loadout-summary').textContent = `Pilote niveau ${game.player.level} · Votre arsenal et vos ailiers vous accompagnent.`;
  }
}
