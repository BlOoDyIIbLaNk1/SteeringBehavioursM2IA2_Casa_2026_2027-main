// Interface DOM uniquement : aucune logique de combat ni entité du monde.
class Hud {
  constructor() {
    this.root = document.getElementById('flight-hud');
    this.root.innerHTML = `
      <div class="hud-mission">
        <div class="mission-mark">S<span> / </span>S</div>
        <div><span class="hud-label">EXPÉDITION NÉMÉSIS</span><div class="mission-wave">SECTEUR <strong id="hud-wave">01</strong><span> / 15</span></div></div>
        <div class="wave-track" id="hud-wave-track" aria-hidden="true">${'<i></i>'.repeat(15)}</div>
        <div class="hud-objective"><span class="objective-glyph">✦</span><div><strong id="hud-objective-title">DERIVE</strong><small id="hud-objective-detail">Secteur en cours</small></div><span id="hud-objective-status" class="objective-status"></span></div>
      </div>
      <div class="hud-boss" hidden>
        <div class="boss-caption"><span id="hud-boss-name"></span><span id="hud-phase"></span></div>
        <div class="hud-meter boss-meter" role="progressbar" aria-label="Vie du boss" aria-valuemin="0" aria-valuemax="100"><i></i></div>
      </div>
      <div class="hud-vitals">
        <div class="pilot-label"><span class="status-light"></span> ASTRÉE <span class="pilot-code">01 / PILOTE</span></div>
        <div class="vital-caption"><span>INTÉGRITÉ</span><strong id="hud-hp-text"></strong></div>
        <div class="hud-meter hull-meter" role="progressbar" aria-label="Vie" aria-valuemin="0"><i></i></div>
        <div class="vital-caption shield-caption"><span>BOUCLIER</span><span id="hud-shield-text"></span></div>
        <div class="hud-meter shield-meter" role="progressbar" aria-label="Bouclier" aria-valuemin="0"><i></i></div>
      </div>
      <div class="hud-loadout">
        <div class="loadout-caption"><span>ARSENAL</span><span id="hud-equipped"></span></div>
        <div class="weapon-dock"></div>
      </div>
      <div class="hud-experience">
        <div class="experience-caption"><span id="hud-level"></span><span>EXPÉRIENCE DU PILOTE</span><span id="hud-xp"></span></div>
        <div class="hud-meter xp-meter" role="progressbar" aria-label="Expérience" aria-valuemin="0"><i></i></div>
      </div>`;
    this.nodes = new Map();
    this.loadoutSignature = '';
    this.lastWave = -1;
    this.navigation = new NavigationHud(this.root);
    this.names = Object.keys(UpgradeCatalog);
    this.slots = this.names.map(name => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.setAttribute('role', 'img');
      slot.innerHTML = `${upgradeIcon(name)}<span class="weapon-rank"></span>`;
      this.root.querySelector('.weapon-dock').append(slot);
      return slot;
    });
  }

  meter(selector, value, maximum) {
    const node = this.find(selector);
    const ratio = maximum > 0 ? Math.min(1, Math.max(0, value / maximum)) : 0;
    node.firstElementChild.style.transform = `scaleX(${ratio})`;
    node.setAttribute('aria-valuenow', Math.max(0, Math.round(value)));
    node.setAttribute('aria-valuemax', maximum || 1);
  }

  find(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, this.root.querySelector(selector));
    return this.nodes.get(selector);
  }

  update(game) {
    this.root.hidden = !game.started || game.gameOver || game.levelUp || !!game.sectorComplete;
    this.navigation.update(game);
    if (this.root.hidden) return;
    const player = game.player;
    const set = (id, value) => { const node = this.find(`#${id}`); if (node.textContent !== value) node.textContent = value; };
    set('hud-wave', String(game.wave).padStart(2, '0'));
    if (game.wave !== this.lastWave) {
      this.lastWave = game.wave;
      [...this.root.querySelectorAll('.wave-track i')].forEach((step, index) => step.classList.toggle('complete', index < game.wave));
    }
    set('hud-hp-text', `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`);
    set('hud-shield-text', player.maxShield ? `${Math.ceil(player.shield)} / ${player.maxShield}` : 'NON ÉQUIPÉ');
    const sector = game.sector;
    set('hud-objective-title', sector?.title?.toLocaleUpperCase('fr') || 'EN ATTENTE');
    const sheltered = game.isSheltered?.(player.pos) || false;
    const refuge = game.routeShelters?.find(bubble => bubble.protects(player.pos));
    const objectiveDetail = sheltered ? `Zone neutre · armes suspendues · ${refuge?.healUsed ? 'soin utilisé' : '+10 PV disponibles'}`
      : game.destination
      ? `Suivez la flèche · ${Math.round(game.destination.distanceTo(player))} m`
      : game.bossDeath ? 'Gardien détruit · onde de choc.' : game.bossSpawned ? 'Cercle verrouillé · abattez le boss.' : `Vague ennemie · ${game.enemies.length} signatures`;
    set('hud-objective-detail', objectiveDetail);
    set('hud-objective-status', sheltered ? 'À L’ABRI' : game.bossDeath ? 'VICTOIRE' : game.destination ? 'TRAVERSÉE' : game.bossSpawned ? 'BOSS' : 'COMBAT');
    this.root.querySelector('.hud-objective')?.classList.toggle('sheltered', sheltered);
    this.meter('.hull-meter', player.hp, player.maxHp);
    this.meter('.shield-meter', player.shield, player.maxShield);
    this.root.querySelector('.hud-vitals').classList.toggle('critical', player.hp / player.maxHp <= 0.25);
    set('hud-level', `NIV. ${String(player.level).padStart(2, '0')}`);
    set('hud-xp', `${player.xp} / ${10 + player.level * 8}`);
    this.meter('.xp-meter', player.xp, 10 + player.level * 8);
    const signature = Object.values(game.weaponSystem.levels).join(',') + [...game.weaponSystem.evolved].join(',');
    if (signature !== this.loadoutSignature) {
      this.loadoutSignature = signature;
      let equipped = 0;
      this.slots.forEach((slot, index) => {
        const name = this.names[index];
        const level = game.weaponSystem.levels[name] || 0;
        const evolved = game.weaponSystem.evolved.has(name);
        slot.hidden = level === 0;
        slot.classList.toggle('bonus-slot', UpgradeCatalog[name].type === 'bonus');
        if (level) equipped++;
        slot.classList.toggle('equipped', level > 0);
        slot.classList.toggle('evolved', evolved);
        slot.querySelector('.weapon-rank').textContent = level ? evolved ? 'MAX' : level : '–';
        slot.title = `${optionName(name)} · ${level ? `niveau ${level}` : 'verrouillé'}`;
        slot.setAttribute('aria-label', slot.title);
      });
      set('hud-equipped', `${equipped} ÉQUIPEMENT${equipped > 1 ? 'S' : ''}`);
    }
    const boss = game.boss;
    this.root.querySelector('.hud-boss').hidden = !boss || boss.dead;
    if (boss && !boss.dead) {
      set('hud-boss-name', boss.title);
      set('hud-phase', `PHASE ${boss.phase}`);
      this.meter('.boss-meter', boss.hp / boss.maxHp * 100, 100);
    }
  }

  updatePerformance(fps) {
    const value = Math.max(0, Math.round(fps || 0));
    const node = document.getElementById('hud-fps');
    if (node && node.textContent !== `${value} FPS`) node.textContent = `${value} FPS`;
    document.querySelector('.hud-performance')?.classList.toggle('performance-low', value < 55);
  }
}
