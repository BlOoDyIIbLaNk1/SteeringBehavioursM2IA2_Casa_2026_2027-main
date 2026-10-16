class AudioSystem {
  constructor(createContext, createAudio) {
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.muted = false;
    this.createContext = createContext || (() => new (window.AudioContext || window.webkitAudioContext)());
    this.createAudio = createAudio || (path => new Audio(path));
    this.tracks = {};
    this.musicMode = null;
    this.musicPlaying = false;
    this.musicRequestId = 0;
  }

  start() {
    if (this.enabled) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    this.context = this.createContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.08;
    this.master.connect(this.context.destination);
    this.enabled = true;
    this.startMusic();
  }

  startMusic() {
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = this.muted ? 0 : 0.28;
    this.musicGain.connect(this.context.destination);
    for (const [mode, path] of Object.entries({ normal: 'Music/normal.mp3', boss: 'Music/bossfight.mp3' })) {
      const audio = this.createAudio(path);
      audio.loop = true;
      audio.preload = 'none';
      const source = this.context.createMediaElementSource(audio);
      source.connect(this.musicGain);
      this.tracks[mode] = audio;
    }
  }

  syncMusic(game) {
    if (!this.enabled) return;
    const mode = game.boss && (!game.boss.dead || game.bossDeath) ? 'boss' : 'normal';
    const playing = game.started && !game.paused && !game.levelUp && !game.gameOver && !game.sectorComplete;
    if (mode === this.musicMode && playing === this.musicPlaying) return;
    const requestId = ++this.musicRequestId;
    for (const audio of Object.values(this.tracks)) audio.pause();
    this.musicMode = mode;
    this.musicPlaying = playing;
    if (playing) {
      // Un refus de lecture ne doit jamais interrompre la boucle du jeu.
      this.tracks[mode].play().catch(() => {
        // L'annulation d'une ancienne piste ne doit pas relancer celle du nouveau secteur.
        if (requestId === this.musicRequestId) this.musicPlaying = false;
      });
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.enabled) return;
    this.master.gain.value = muted ? 0 : 0.08;
    this.musicGain.gain.value = muted ? 0 : 0.28;
  }

  resetMusic() {
    this.musicRequestId++;
    for (const audio of Object.values(this.tracks)) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.musicMode = null;
    this.musicPlaying = false;
  }

  tone(frequency, duration = 0.08, type = "sine", volume = 0.2) {
    if (!this.enabled) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  shot(style) {
    const frequencies = { laser: 720, missile: 180, sword: 430, ricochet: 980 };
    this.tone(frequencies[style] || 500, style === "missile" ? 0.18 : 0.05, "sawtooth", 0.18);
  }

  levelUp() {
    this.tone(440, 0.12, "triangle", 0.3);
    setTimeout(() => this.tone(880, 0.2, "triangle", 0.25), 90);
  }

  hit() { this.tone(95, 0.08, "square", 0.2); }
  boss() { this.tone(55, 0.7, "sawtooth", 0.3); }
  bossDefeated() { this.tone(180, 1.1, 'triangle', 0.35); }
}
