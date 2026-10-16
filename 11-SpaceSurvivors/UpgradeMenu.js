class UpgradeMenu {
  constructor() {
    this.root = document.getElementById('upgrade-menu');
    this.cards = document.getElementById('upgrade-cards');
    this.signature = '';
  }

  update(game) {
    this.root.hidden = !game.levelUp || game.paused || game.gameOver;
    if (this.root.hidden) { this.signature = ''; return; }
    const signature = `${game.player.level}:${game.options.join(',')}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.cards.replaceChildren();
    game.options.forEach((name, index) => {
      const item = UpgradeCatalog[name];
      const level = game.weaponSystem.levels[name] || 0;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `upgrade-card ${item.type}`;
      card.innerHTML = `
        <div class="choice-top"><span>${item.type === 'weapon' ? 'SYSTÈME D’ARMEMENT' : 'MODULE DE SOUTIEN'}</span><kbd>${index + 1}</kbd></div>
        <div class="choice-icon">${upgradeIcon(name)}</div>
        <div class="choice-level">${level === 8 ? 'NIVEAU MAXIMUM · RESTAURATION' : level ? `NIVEAU ${level} <span>→</span> ${level + 1}` : 'NOUVEL ÉQUIPEMENT'}</div>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="choice-footer"><span>${level === 8 ? 'RESTAURER' : level === 7 && item.type === 'weapon' ? 'ÉVOLUTION' : level ? 'AMÉLIORER' : 'ÉQUIPER'}</span><span>↗</span></div>`;
      card.addEventListener('click', () => {
        game.choose(index);
        card.blur();
      });
      this.cards.append(card);
    });
  }
}
