// Catalogue commun aux cartes, au HUD et au système de combat.
const UpgradeCatalog = {
  laser: { name: 'Canon orbital', description: 'Tourne autour du vaisseau et accélère ses tirs à chaque niveau.', icon: 'M6 26 26 6M8 18l6 6M18 8l6 6', type: 'weapon' },
  missile: { name: 'Missile chercheur', description: 'Un missile corrige sa trajectoire vers sa cible.', icon: 'M12 23 9 14 23 5l4 4-9 14zM10 22l-5 5', type: 'weapon' },
  sword: { name: 'Lames solaires', description: 'Des lames courbes frappent à courte portée.', icon: 'M8 26 25 9l2-5-5 2L5 23M5 18l9 9', type: 'weapon' },
  ricochet: { name: 'Prisme ricochet', description: 'Ses projectiles gagnent en vitesse et rebondissent sur les bords.', icon: 'M5 8h22v18H5M9 21l8-8 6 6', type: 'weapon' },
  orbit: { name: 'Essaim de lames', description: 'Émet régulièrement des lames autour du vaisseau.', icon: 'M7 23c-7-7 3-18 13-15s12 13 3 17-20-1-16-8', type: 'weapon' },
  pulse: { name: 'Impulsion radiale', description: 'Une salve de huit projectiles dans toutes les directions.', icon: 'M16 3v7M16 22v7M3 16h7M22 16h7M6 6l5 5M21 21l5 5', type: 'weapon' },
  nova: { name: 'Nova solaire', description: 'Un cercle de seize projectiles repousse la pression.', icon: 'M16 3l3 9 10 4-10 3-3 10-3-10-10-3 10-4z', type: 'weapon' },
  rail: { name: 'Canon rail', description: 'Un tir rapide traverse plusieurs adversaires.', type: 'weapon', interval: 90, damage: 30, speed: 14, sprite: 'laser', pierce: 4 },
  scatter: { name: 'Éventail stellaire', description: 'Cinq éclats couvrent un large cône devant la cible.', type: 'weapon', interval: 110, damage: 12, speed: 7, sprite: 'laser', count: 5, spread: 0.2 },
  frost: { name: 'Cryolance', description: 'Un éclat de glace ralentit ses victimes pendant deux secondes.', type: 'weapon', interval: 80, damage: 12, speed: 7, sprite: 'pulse', slow: true },
  ember: { name: 'Comète ardente', description: 'Une comète inflige des dégâts de brûlure pendant trois secondes.', type: 'weapon', interval: 100, damage: 15, speed: 6, sprite: 'missile', burn: true },
  torpedo: { name: 'Torpille à fusion', description: 'Un missile guidé explose dans un rayon de 85 pixels.', type: 'weapon', interval: 150, damage: 28, speed: 4, sprite: 'missile', homing: true, splash: 85 },
  boomerang: { name: 'Croissant retour', description: 'Une lame traverse les ennemis puis revient vers toi.', type: 'weapon', interval: 100, damage: 18, speed: 6, sprite: 'sword', returning: true, pierce: 4 },
  seeker: { name: 'Nuée guidée', description: 'Trois sondes poursuivent les cibles les plus proches.', type: 'weapon', interval: 145, damage: 12, speed: 5, sprite: 'ricochet', homing: true, count: 3, spread: 0.6 },
  twin: { name: 'Double hélios', description: 'Deux faisceaux parallèles perforants frappent ensemble.', type: 'weapon', interval: 65, damage: 14, speed: 10, sprite: 'laser', count: 2, spread: 0.08, pierce: 2 },
  shrapnel: { name: 'Grêle orbitale', description: 'Douze éclats courts forment une couronne autour de toi.', type: 'weapon', interval: 150, damage: 10, speed: 5, sprite: 'pulse', count: 12, radial: true },
  disruptor: { name: 'Disrupteur ionique', description: 'Une charge perforante ralentit un groupe sur son passage.', type: 'weapon', interval: 120, damage: 22, speed: 5, sprite: 'nova', pierce: 5, slow: true },
  swarm: { name: 'SWARM · Pluie orbitale', description: 'Une nuée de missiles traverse tout le champ et frappe chaque cible sur sa trajectoire.', type: 'weapon', interval: 300, damage: 26, speed: 9, sprite: 'missile', count: 20, sweep: true, pierce: 40 },
  singularity: { name: 'Cage de singularité', description: 'Un anneau gravitationnel rassemble les ennemis visibles et se contracte autour d’eux.', type: 'weapon', interval: 420, damage: 0, field: true },
  shield: { name: 'Bouclier ionique', description: '+25 de protection maximale et recharge complète.', type: 'bonus', icon: 'M16 3 27 8v10c-1 6-11 11-11 11S6 24 5 18V8z' },
  hull: { name: 'Coque renforcée', description: '+25 de vie maximale et restaure jusqu’à 45 de vie.', type: 'bonus', icon: 'M16 27 5 16C-2 4 13 0 16 9c3-9 18-5 11 7z' },
  magnet: { name: 'Collecteur gravitationnel', description: '+45 pixels de rayon d’attraction des cristaux.', type: 'bonus', icon: 'M7 5v13a9 9 0 0 0 18 0V5h-6v13a3 3 0 0 1-6 0V5z' },
  reactor: { name: 'Réacteur surcadencé', description: '+10 % de vitesse de déplacement par niveau.', type: 'bonus', icon: 'M18 3 7 18h8l-1 11 11-17h-8z' },
  armor: { name: 'Blindage composite', description: 'Réduit les dégâts subis de 7 % par niveau, jusqu’à 56 %.', type: 'bonus', icon: 'M16 3 28 10v12L16 29 4 22V10zM10 12l6-4 6 4v8l-6 4-6-4z' },
  regen: { name: 'Nanoréparation', description: 'Restaure 0,5 point de vie par seconde et par niveau.', type: 'bonus', icon: 'M12 4h8v8h8v8h-8v8h-8v-8H4v-8h8z' },
  amplifier: { name: 'Amplificateur', description: '+12 % de dégâts pour toutes les armes par niveau.', type: 'bonus', icon: 'M5 20v-8l8 4zM17 7l9 9-9 9M17 16h9' }
};

function upgradeIcon(name) {
  const item = UpgradeCatalog[name];
  const weaponIcons = {
    rail: 'M4 26 26 4M9 27 28 8M4 18l10 10M18 3l11 11',
    scatter: 'M4 28 16 4 28 28M16 28V10M7 23h18',
    frost: 'M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M5 13l5 1-1-5M23 23l-1-5 5 1',
    ember: 'M21 3c-5 13 9 12 3 22-6 10-23 0-15-10-1 8 9 8 8 1-1-5 0-8 4-13z',
    torpedo: 'M8 23 10 12 24 4l4 4-8 14-12 1M6 20l-3 9 9-3M16 12l4 4',
    boomerang: 'M5 5 27 16 5 27l10-11z',
    seeker: 'M16 3 21 12 16 10 11 12zM6 16 11 25 6 23 1 25zM26 16 31 25 26 23 21 25z',
    twin: 'M5 25 25 5M10 30 30 10M3 19l10 10M19 3l10 10',
    shrapnel: 'M16 3l3 7h-6zM29 16l-7 3v-6zM16 29l-3-7h6zM3 16l7-3v6z',
    disruptor: 'M4 16h5l4-10 5 20 4-10h6M6 6l3 3M23 23l3 3',
    swarm: 'M4 7h10l5 5-5 5H4M28 25H18l-5-5 5-5h10M8 4l3 3-3 3M24 20l-3 3 3 3',
    singularity: 'M16 2v5M16 25v5M2 16h5M25 16h5M6 6l4 4M22 22l4 4M26 6l-4 4M10 22l-4 4M16 8a8 8 0 1 0 0 16 8 8 0 0 0 0-16z'
  };
  const fallback = item?.type === 'bonus'
    ? 'M16 4v24M4 16h24M8 8l16 16M24 8 8 24'
    : 'M5 25 25 5M8 14l10 10M18 4l10 10M4 28l4-4';
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${item?.icon || weaponIcons[name] || fallback}"/></svg>`;
}
