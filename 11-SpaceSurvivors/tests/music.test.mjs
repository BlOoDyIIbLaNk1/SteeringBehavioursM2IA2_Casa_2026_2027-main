import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

function fixture() {
  const scope = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../AudioSystem.js', import.meta.url), 'utf8'), scope);
  const AudioSystem = vm.runInContext('AudioSystem', scope);
  const tracks = [];
  const context = {
    destination: {},
    createGain: () => ({ gain: { value: 1 }, connect() {} }),
    createMediaElementSource: () => ({ connect() {} })
  };
  const audio = new AudioSystem(() => context, path => {
    const track = {
      path, paused: true, currentTime: 0, plays: 0,
      play() { this.paused = false; this.plays++; return Promise.resolve(); },
      pause() { this.paused = true; }
    };
    tracks.push(track);
    return track;
  });
  audio.start();
  const game = { started: true, paused: false, levelUp: false, gameOver: false, boss: null };
  return { audio, tracks, game };
}

test('les deux pistes locales existent, bouclent et ne jouent pas au chargement', () => {
  const { tracks } = fixture();
  assert.equal(tracks.length, 2);
  for (const track of tracks) {
    assert.ok(existsSync(new URL(`../${track.path}`, import.meta.url)));
    assert.equal(track.loop, true);
    assert.equal(track.paused, true);
  }
});

test('vagues → boss → vagues : une seule piste active sans relance par image', () => {
  const { audio, tracks: [normal, boss], game } = fixture();
  audio.syncMusic(game);
  audio.syncMusic(game);
  assert.equal(normal.plays, 1);
  assert.equal(boss.paused, true);
  game.boss = { dead: false };
  audio.syncMusic(game);
  assert.equal(normal.paused, true);
  assert.equal(boss.paused, false);
  game.boss.dead = true;
  audio.syncMusic(game);
  assert.equal(normal.paused, false);
  assert.equal(boss.paused, true);
});

test('pause, choix, fin de partie et son coupé respectent les deux canaux', () => {
  const { audio, tracks, game } = fixture();
  for (const flag of ['paused', 'levelUp', 'gameOver', 'sectorComplete']) {
    game[flag] = true;
    audio.syncMusic(game);
    assert.ok(tracks.every(track => track.paused));
    game[flag] = false;
    audio.syncMusic(game);
    assert.equal(tracks[0].paused, false);
  }
  audio.setMuted(true);
  assert.equal(audio.master.gain.value, 0);
  assert.equal(audio.musicGain.gain.value, 0);
  audio.setMuted(false);
  assert.equal(audio.musicGain.gain.value, 0.28);
  tracks[0].currentTime = 123;
  audio.resetMusic();
  assert.ok(tracks.every(track => track.paused && track.currentTime === 0));
});

test('une annulation tardive de l’ancienne piste ne perturbe pas la nouvelle', async () => {
  const { audio, tracks: [normal, boss], game } = fixture();
  let cancelOldTrack;
  normal.play = () => new Promise((resolve, reject) => { cancelOldTrack = reject; });
  audio.syncMusic(game);
  game.boss = { dead: false };
  audio.syncMusic(game);
  cancelOldTrack(new Error('Ancienne lecture annulée'));
  await Promise.resolve();
  assert.equal(audio.musicMode, 'boss');
  assert.equal(audio.musicPlaying, true);
  audio.syncMusic(game);
  assert.equal(boss.plays, 1);
});

test('la musique du boss reste pendant son explosion, puis se suspend au menu suivant', () => {
  const { audio, tracks: [normal, boss], game } = fixture();
  game.boss = {dead: false};
  audio.syncMusic(game);
  game.boss.dead = true;
  game.bossDeath = {};
  audio.syncMusic(game);
  assert.equal(boss.paused, false);
  assert.equal(boss.plays, 1);
  assert.equal(normal.plays, 0);
  game.bossDeath = null;
  game.sectorComplete = {};
  audio.syncMusic(game);
  assert.equal(boss.paused, true);
  assert.equal(normal.paused, true);
});
