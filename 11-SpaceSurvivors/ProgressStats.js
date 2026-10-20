// Comptabilité de la partie : aucune force, entité graphique ou locomotion.
class ProgressStats {
  constructor() {
    this.total = this.empty();
    this.sector = this.empty();
  }

  empty() {
    return { frames: 0, kills: 0, damage: 0, hullLost: 0, levels: 0, dronesLost: 0, bosses: 0, sectors: 0 };
  }

  add(name, value = 1) {
    if (!Number.isFinite(value) || value <= 0) return;
    this.total[name] += value;
    this.sector[name] += value;
  }

  startSector() {
    this.sector = this.empty();
  }

  recordDamage(enemy, amount) {
    if (enemy.dead || enemy.invulnerable || !Number.isFinite(enemy.hp)) return;
    this.add('damage', Math.min(Math.max(0, enemy.hp), amount));
  }

  snapshot(scope = 'total') {
    return { ...this[scope] };
  }

  static duration(frames) {
    const seconds = Math.floor(frames / 60);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  static markup(stats) {
    const entries = [
      ['TEMPS DE COMBAT', ProgressStats.duration(stats.frames)],
      ['ENNEMIS DÉTRUITS', stats.kills],
      ['DÉGÂTS INFLIGÉS', Math.round(stats.damage).toLocaleString('fr-FR')],
      ['COQUE PERDUE', Math.round(stats.hullLost)],
      ['NIVEAUX GAGNÉS', `+${stats.levels}`],
      ['DRONES PERDUS', stats.dronesLost]
    ];
    return entries.map(([label, value]) => `<div class="result-stat"><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  }
}
