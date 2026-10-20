let game;
let spaceBackground;
let enemyArt;
let playerArt;
let weaponArt;
let flightHud;
let upgradeMenu;
let sectorMenu;
let ambientStars = [];

function preload() {
  spaceBackground = loadImage("assets/space-arena.png");
  enemyArt = loadImage("assets/enemy-sprites.png");
  playerArt = loadImage("assets/player-ship.png");
  weaponArt = loadImage("assets/weapon-sprites.png");
}

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  SpriteCache.build(enemyArt, weaponArt, playerArt);
  resetAmbientStars();
  game = new SpaceSurvivorsGame();
  textFont("monospace");
  flightHud = new Hud();
  upgradeMenu = new UpgradeMenu();
  sectorMenu = new SectorMenu();
  document.getElementById('sector-continue').addEventListener('click', () => {
    game.audio.start();
    game.continueSector();
    document.getElementById('sector-continue').blur();
  });
  document.getElementById('debug-toggle').addEventListener('change', event => {
    setDebug(event.target.checked);
    event.target.blur();
  });
  document.getElementById('session-action').addEventListener('click', () => {
    game.audio.start();
    if (game.gameOver) game.reset();
    game.started = true;
    game.paused = false;
    document.getElementById('session-action').blur();
  });
  document.getElementById('sound-toggle').addEventListener('click', toggleSound);
}

function resetAmbientStars() {
  ambientStars = Array.from({ length: 64 }, () => ({
    x: random(width), y: random(height), depth: random(0.08, 0.72),
    size: random(0.6, 2.1), phase: random(TWO_PI), speed: random(0.12, 0.8)
  }));
}

function draw() {
  drawSpaceBackground();
  game.update();
  game.audio.syncMusic(game);
  push();
  translate(-game.cameraOffsetX, -game.cameraOffsetY);
  game.draw();
  pop();
  drawHud();
  flightHud.updatePerformance(frameRate());
  updateSessionMenu();
  sectorMenu.update(game);
}

function drawSpaceBackground() {
  push();
  background('#080b18');
  noStroke();
  if (spaceBackground) {
    imageMode(CORNER);
    const t = frameCount * 0.003;
    const backdrop = SpaceBackdrop.layout(width, height, spaceBackground.width, spaceBackground.height,
      game?.cameraOffsetX || 0, game?.cameraOffsetY || 0, t);
    image(spaceBackground, backdrop.x, backdrop.y, backdrop.width, backdrop.height);
    fill(4, 7, 19, 74);
    rect(0, 0, width, height);
    for (const star of ambientStars) {
      const travelX = game ? game.player.pos.x * star.depth * 0.11 : 0;
      const travelY = game ? game.player.pos.y * star.depth * 0.11 : 0;
      const x = ((star.x - travelX - frameCount * star.speed + width * 2) % width + width) % width;
      const y = ((star.y - travelY + height * 2) % height + height) % height;
      const shimmer = 0.45 + (Math.sin(frameCount * 0.035 + star.phase) + 1) * 0.27;
      fill(171, 207, 224, 115 * shimmer);
      circle(x, y, star.size);
      if (star.depth > 0.58 && star.size > 1.65) {
        fill(149, 194, 223, 30 * shimmer);
        ellipse(x - 2.5, y, 7, 1.2);
      }
    }
  }
  pop();
}

function drawHud() {
  flightHud.update(game);
  upgradeMenu.update(game);
}

function optionName(option) {
  return UpgradeCatalog[option]?.name || option;
}

function mousePressed() {
  game.audio.start();
}

function keyPressed(event) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
  game.audio.start();
  if (keyCode === ESCAPE && game.started && !game.gameOver && !game.sectorComplete) game.paused = !game.paused;
  if (key.toLowerCase() === 'd' && !event?.repeat && !event?.ctrlKey && !event?.metaKey) setDebug(!game.debug);
  if (keyCode === ENTER && game.sectorComplete) game.continueSector();
  if (key.toLowerCase() === 'm') toggleSound();
  if (game.levelUp && !game.paused && !game.gameOver && ["1", "2", "3"].includes(key)) game.choose(Number(key) - 1);
  if ((key === "r" || key === "R") && game.player.dead) game.reset();
}

function setDebug(enabled) {
  game.debug = enabled;
  document.getElementById('debug-toggle').checked = enabled;
  document.getElementById('debug-legend').hidden = !enabled;
}

function updateSessionMenu() {
  const menu = document.getElementById('session-menu');
  menu.hidden = game.started && !game.paused && !game.gameOver;
  const title = document.getElementById('session-title');
  const description = document.getElementById('session-description');
  const action = document.getElementById('session-action');
  document.getElementById('session-results').hidden = !game.gameOver;
  document.querySelector('.session-facts').hidden = game.gameOver;
  if (game.gameOver && !game.resultsRendered) {
    document.getElementById('session-results-grid').innerHTML = ProgressStats.markup(game.stats.snapshot());
    document.getElementById('session-results-caption').textContent =
      `${game.stats.total.sectors} / 15 SECTEURS · ${game.stats.total.bosses} GARDIENS VAINCUS`;
    game.resultsRendered = true;
  }
  if (game.gameOver) {
    title.textContent = game.victory ? 'Némésis vaincue.' : 'Signal perdu.';
    description.textContent = game.victory ? 'Les quinze secteurs sont terminés. La galaxie respire à nouveau.' : `Secteur ${game.wave} · Niveau ${game.player.level}. Reconstruis ton arsenal et repars au combat.`;
    action.textContent = 'NOUVELLE EXPÉDITION';
  } else if (game.paused) {
    title.textContent = 'En orbite.';
    description.textContent = `Secteur ${String(game.wave).padStart(2, '0')} / 15 · Pilote niveau ${game.player.level}. Choisis ta prochaine trajectoire, puis retourne au combat.`;
    action.textContent = 'REPRENDRE';
  } else {
    title.textContent = 'Entre dans le néant.';
    description.textContent = 'Combat et boss, puis traversée vers une balise. Quinze secteurs pour atteindre le Cœur du Néant.';
    action.textContent = 'DÉCOLLER';
  }
}

function toggleSound() {
  game.audio.start();
  game.audio.setMuted(!game.audio.muted);
  document.getElementById('sound-toggle').textContent = game.audio.muted ? 'SON : COUPÉ' : 'SON : ACTIF';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetAmbientStars();
}
