// Préparation unique des textures, y compris les teintes et halos coûteux.
const SpriteCache = {
  sprites: {},
  build(enemies, weapons, player) {
    const crop = (source, x, y, width, height, size) => {
      const sprite = source.get(x, y, width, height);
      sprite.resize(size, size);
      return sprite;
    };
    this.sprites.player = crop(player, 0, 0, player.width, player.height, 96);
    for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
      this.sprites[`enemy-${column}-${row}`] = crop(enemies, column * enemies.width / 2, row * enemies.height / 2, enemies.width / 2, enemies.height / 2, 128);
    }
    const styles = ['laser', 'missile', 'sword', 'ricochet', 'pulse', 'nova'];
    styles.forEach((style, index) => {
      this.sprites[style] = crop(weapons, index % 3 * weapons.width / 3, Math.floor(index / 3) * weapons.height / 2, weapons.width / 3, weapons.height / 2, 48);
    });
    const boss = crop(enemies, enemies.width / 2, enemies.height / 2, enemies.width / 2, enemies.height / 2, 336);
    const sentinel = createGraphics(64, 64);
    sentinel.pixelDensity(1);
    sentinel.tint('#e9cc91');
    sentinel.image(this.sprites['enemy-1-0'], 4, 4, 56, 56);
    sentinel.noFill(); sentinel.stroke('#d7c28b'); sentinel.strokeWeight(1);
    sentinel.circle(32, 32, 60);
    this.sprites.sentinel = sentinel.get();
    sentinel.remove();
    for (const [variant, color] of Object.entries({spectre: '#79eaff', bastion: '#ffce8a', final: '#e8b5ff'})) {
      const surface = createGraphics(336, 336);
      surface.pixelDensity(1);
      surface.tint(color);
      surface.image(boss, 0, 0, 336, 336);
      this.sprites[`boss-${variant}`] = surface.get();
      surface.remove();
    }
    const glow = createGraphics(48, 48);
    glow.pixelDensity(1);
    glow.translate(24, 24);
    glow.drawingContext.shadowBlur = 12;
    glow.drawingContext.shadowColor = '#e9a497';
    glow.noStroke();
    glow.fill('#9d5979'); glow.quad(-14, 0, 0, -6, 10, 0, 0, 6);
    glow.fill('#f5c5af'); glow.quad(-5, 0, 1, -3, 10, 0, 1, 3);
    glow.fill('#fff1d6'); glow.ellipse(3, 0, 6, 2);
    this.sprites.hostile = glow.get();
    glow.remove();
    this.buildRing('ring-singularity', '#bcb0f3', '#9ddcdd');
    this.buildRing('ring-arena', '#dbb984', '#e7b49e');
    this.buildRing('ring-death', '#ffe4b6', '#c3dcdf');
    const flare = createGraphics(256, 256);
    flare.pixelDensity(1);
    const gradient = flare.drawingContext.createRadialGradient(128, 128, 0, 128, 128, 125);
    gradient.addColorStop(0, 'rgba(255,249,222,1)');
    gradient.addColorStop(0.12, 'rgba(255,224,166,0.8)');
    gradient.addColorStop(0.42, 'rgba(214,161,109,0.18)');
    gradient.addColorStop(1, 'rgba(214,161,109,0)');
    flare.drawingContext.fillStyle = gradient;
    flare.drawingContext.fillRect(0, 0, 256, 256);
    this.sprites.deathCore = flare.get();
    flare.remove();
  },
  buildRing(name, main, accent) {
    const surface = createGraphics(768, 768);
    surface.pixelDensity(1);
    const context = surface.drawingContext;
    context.translate(384, 384);
    context.strokeStyle = main;
    context.shadowColor = main;
    context.shadowBlur = 16;
    context.lineWidth = 2;
    context.beginPath(); context.arc(0, 0, 320, 0, Math.PI * 2); context.stroke();
    context.shadowBlur = 0;
    context.globalAlpha = 0.4;
    context.lineWidth = 1;
    context.beginPath(); context.arc(0, 0, 310, 0, Math.PI * 2); context.stroke();
    context.globalAlpha = 0.8;
    context.strokeStyle = accent;
    for (let index = 0; index < 24; index++) {
      const angle = index * Math.PI * 2 / 24;
      context.lineWidth = index % 3 === 0 ? 3 : 1;
      context.beginPath(); context.arc(0, 0, 328, angle, angle + 0.12); context.stroke();
      if (index % 3 === 0) {
        context.save(); context.rotate(angle);
        context.fillStyle = accent;
        context.beginPath(); context.moveTo(320, -4); context.lineTo(325, 0);
        context.lineTo(320, 4); context.lineTo(315, 0); context.closePath(); context.fill();
        context.restore();
      }
    }
    this.sprites[name] = surface.get();
    surface.remove();
  },
  draw(name, x, y, width, height = width) {
    const sprite = this.sprites[name];
    if (!sprite) return false;
    drawingContext.drawImage(sprite.canvas, x - width / 2, y - height / 2, width, height);
    return true;
  }
};
