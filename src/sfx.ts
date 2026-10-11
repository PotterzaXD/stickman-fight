import { audio, midiHz, noise, sfxLevel, sfxOut } from './audio';

let last: Record<string, number> = {};

/** Can this sound play now? `name` limits how often the same sound can play. */
function ready(name: string, gap = 0.04): AudioContext | null {
  if (sfxLevel() <= 0) return null;
  const a = audio();
  const out = sfxOut();
  if (!a || !out) return null;
  const now = a.currentTime;
  if ((last[name] ?? -1) > now - gap) return null;
  last[name] = now;
  return a;
}

/** Short synth blip. */
function tone(name: string, freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0) {
  const a = ready(name);
  if (!a) return;
  const now = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + dur);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(sfxOut()!);
  o.start(now);
  o.stop(now + dur);
}

/** A burst of filtered noise: swooshes, impacts, splashes, wind. */
function hiss(name: string, dur: number, vol: number, filter: BiquadFilterType, from: number, to: number, delay = 0, gap = 0.04) {
  const a = ready(name, gap);
  if (!a) return;
  const now = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noise(a);
  const f = a.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(from, now);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + dur);
  f.Q.value = 1.2;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(vol, now + Math.min(0.03, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(g).connect(sfxOut()!);
  src.start(now, Math.random() * 0.5);
  src.stop(now + dur);
}

/** A little run of notes (jingles, chimes). */
function notes(name: string, list: [number, number][], type: OscillatorType, vol: number, step = 0.1) {
  list.forEach(([m, len], i) => tone(`${name}${i}`, midiHz(m), len, type, vol, 0, i * step));
}

export const sfx = {
  /** Call from a tap so phones allow sound. */
  unlock: () => void audio(),
  // UI
  click: () => tone('click', 660, 0.06, 'square', 0.05),
  transition: () => hiss('transition', 0.18, 0.05, 'bandpass', 600, 3000),
  achievement: () => notes('ach', [[76, 0.12], [79, 0.12], [84, 0.12], [88, 0.4]], 'triangle', 0.09, 0.09),
  secret: () => {
    // A low, spooky alarm: a secret boss has woken up.
    notes('sec', [[45, 0.3], [52, 0.3], [51, 0.3], [57, 0.9]], 'sawtooth', 0.06, 0.22);
    hiss('secretw', 1.2, 0.05, 'lowpass', 300, 2000, 0.1, 0.5);
  },
  // Combat
  hit: () => {
    tone('hit', 180 + Math.random() * 60, 0.12, 'square', 0.08, -120);
    hiss('punch', 0.08, 0.06, 'lowpass', 1800, 300);
  },
  heavy: () => {
    tone('heavy', 110, 0.25, 'square', 0.1, -70);
    hiss('heavyn', 0.2, 0.1, 'lowpass', 1200, 120);
  },
  slash: () => hiss('slash', 0.14, 0.07, 'bandpass', 4000, 1200),
  block: () => tone('block', 900, 0.08, 'triangle', 0.06),
  throw: () => {
    tone('throw', 500, 0.1, 'sine', 0.06, 300);
    hiss('throwh', 0.1, 0.03, 'highpass', 2500, 6000);
  },
  boom: () => {
    tone('boom', 120, 0.4, 'sawtooth', 0.12, -90);
    hiss('boomn', 0.45, 0.12, 'lowpass', 900, 80);
  },
  ko: () => tone('ko', 440, 0.35, 'sawtooth', 0.1, -380),
  jump: () => tone('jump', 300, 0.1, 'sine', 0.04, 250),
  snowman: () => tone('snowman', 700, 0.25, 'triangle', 0.08, 500),
  win: () => notes('w', [[72, 0.15], [76, 0.15], [79, 0.3]], 'square', 0.07, 0.15),
  coin: () => tone('coin', 988, 0.15, 'square', 0.06, 400),
  glass: () => {
    tone('g1', 1800, 0.12, 'triangle', 0.06, 900);
    tone('g2', 2400, 0.1, 'triangle', 0.04, -600, 0.04);
  },
  // Secret boss skills
  shard: () => {
    tone('shard', 2200, 0.18, 'triangle', 0.07, -1200);
    hiss('shardn', 0.15, 0.04, 'highpass', 5000, 8000);
  },
  chime: () => notes('chime', [[88, 0.25], [84, 0.25], [88, 0.25], [84, 0.5]], 'triangle', 0.08, 0.16),
  wind: () => hiss('wind', 0.9, 0.06, 'bandpass', 400, 1600, 0, 0.3),
  splash: () => {
    hiss('splash', 0.5, 0.12, 'lowpass', 3000, 300);
    tone('splasht', 160, 0.3, 'sine', 0.08, -80);
  },
  whip: () => {
    hiss('whip', 0.12, 0.09, 'bandpass', 1500, 6000);
    tone('whipt', 900, 0.08, 'square', 0.03, 1200, 0.08);
  },
  roots: () => {
    tone('roots', 70, 0.35, 'sawtooth', 0.09, -30);
    hiss('rootsn', 0.35, 0.08, 'lowpass', 600, 120);
  },
};
