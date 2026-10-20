import { audio, midiHz, musicLevel, musicOut, noise } from './audio';

/**
 * Chiptune music made by the game itself (no audio files): a little step sequencer
 * with a lead, a bass, an arpeggio and drums. Each track is built from a seed, so it
 * always sounds the same, and every mode, map theme and secret boss has its own.
 */
export type TrackId =
  | 'menu'
  | 'sandbox'
  | 'rock'
  | 'day'
  | 'sunset'
  | 'night'
  | 'snow'
  | 'lava'
  | 'space'
  | 'beach'
  | 'war'
  | 'jungle'
  | 'haunted'
  | 'candy'
  | 'farm'
  | 'graveyard'
  | 'inferno'
  | 'pirate'
  | 'desert'
  | 'stage'
  | 'outbreak'
  | 'elephant'
  | 'boss'
  | 'pigeon'
  | 'queen'
  | 'tide'
  | 'guardian';

interface TrackDef {
  bpm: number;
  /** MIDI note of the key's root. */
  root: number;
  /** Scale steps from the root. */
  scale: number[];
  /** Chord roots as scale degrees, one per bar. */
  chords: number[];
  lead: OscillatorType;
  bass: OscillatorType;
  arp: OscillatorType | null;
  /** Drum patterns over 16 steps: k = kick, s = snare, h = hat, t = tom. */
  drums: string[];
  /** 0-1: how busy the lead is. */
  busy: number;
  /** Bass rhythm over 16 steps (x = play). */
  bassRhythm: string;
  seed: number;
  /** Lead an octave up (icy) or down (deep). */
  leadOct?: number;
  swing?: number;
  vol?: number;
  /** Hard rock: a distorted lead and power chords chugging on the bass rhythm. */
  rock?: boolean;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const HARM = [0, 2, 3, 5, 7, 8, 11];
const PHRYG = [0, 1, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PENTA = [0, 3, 5, 7, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

const FOUR = 'k...h...k...h...';
const BACK = 'k...s...k.k.s...';
const DRIVE = 'k.h.s.h.k.h.s.hh';
const HALF = 'k.......s.......';

const TRACKS: Record<TrackId, TrackDef> = {
  // Energetic synthwave to get you hyped
  menu: { bpm: 138, root: 57, scale: MINOR, chords: [0, 5, 2, 6], lead: 'square', bass: 'sawtooth', arp: 'square', drums: ['k...s...k...s...', 'k.h.s.h.k.h.s.h.'], busy: 0.65, bassRhythm: 'x.x.x.x.x.x.x.x.', seed: 11 },
  // Chill 8-bit for building and testing
  sandbox: { bpm: 92, root: 60, scale: MAJOR, chords: [0, 5, 3, 4], lead: 'triangle', bass: 'sine', arp: 'triangle', drums: ['k.....h.....h...', 'k.....h...k.h...'], busy: 0.4, bassRhythm: 'x.....x...x.....', seed: 23, swing: 0.12 },
  // Sandbox when it gets crowded: funky, hard, loud rock 🔥 (distorted guitar, power chords, pounding drums)
  rock: { bpm: 150, root: 52, scale: [0, 3, 5, 6, 7, 10], chords: [0, 0, 4, 3, 0, 0, 5, 4], lead: 'sawtooth', bass: 'sawtooth', arp: null, drums: ['k.h.s.hkk.hks.h.', 'k.kks.kks.kks.ss'], busy: 0.7, bassRhythm: 'x.xx.x.xx.xx.x.x', seed: 167, swing: 0.1, rock: true },
  // The Rock Stage map: the same band, a different riff
  stage: { bpm: 140, root: 50, scale: [0, 3, 5, 7, 10], chords: [0, 3, 4, 2], lead: 'sawtooth', bass: 'sawtooth', arp: null, drums: ['k...s.k.k.k.s...', 'k.k.s.k.k.ksss.s'], busy: 0.6, bassRhythm: 'x.x.x.xxx.x.x.xx', seed: 173, rock: true },
  day: { bpm: 128, root: 60, scale: MAJOR, chords: [0, 4, 5, 3], lead: 'square', bass: 'triangle', arp: null, drums: [BACK, 'k.h.s.h.k.h.s.h.'], busy: 0.6, bassRhythm: 'x...x.x.x...x.x.', seed: 31 },
  sunset: { bpm: 112, root: 65, scale: MAJOR, chords: [0, 3, 5, 4], lead: 'triangle', bass: 'sawtooth', arp: 'square', drums: [BACK], busy: 0.45, bassRhythm: 'x..x..x.x..x..x.', seed: 37, swing: 0.1 },
  night: { bpm: 120, root: 62, scale: DORIAN, chords: [0, 6, 5, 6], lead: 'square', bass: 'triangle', arp: 'sine', drums: ['k...h.h.s...h...', 'k...h.h.s..kh.h.'], busy: 0.5, bassRhythm: 'x.......x.x.....', seed: 41 },
  snow: { bpm: 132, root: 64, scale: MINOR, chords: [0, 3, 5, 4], lead: 'triangle', bass: 'triangle', arp: 'triangle', drums: [FOUR, 'k.h.k.h.s.h.k.h.'], busy: 0.55, bassRhythm: 'x...x...x...x...', seed: 43, leadOct: 1 },
  lava: { bpm: 152, root: 61, scale: PHRYG, chords: [0, 1, 0, 6], lead: 'sawtooth', bass: 'sawtooth', arp: null, drums: [DRIVE, 'k.k.s.h.k.k.s.ss'], busy: 0.7, bassRhythm: 'xxx.xxx.xxx.xx.x', seed: 47 },
  space: { bpm: 108, root: 62, scale: LYDIAN, chords: [0, 1, 0, 4], lead: 'sine', bass: 'triangle', arp: 'sine', drums: ['k.......h.......', 'k.....h.....s...'], busy: 0.35, bassRhythm: 'x.......x.......', seed: 53, leadOct: 1 },
  beach: { bpm: 118, root: 67, scale: MAJOR, chords: [0, 3, 4, 0], lead: 'triangle', bass: 'square', arp: 'triangle', drums: ['k..h..h.s..h..h.', 'k..h..h.s..h.hh.'], busy: 0.6, bassRhythm: 'x..x..x...x..x..', seed: 59, swing: 0.15 },
  // The War map: marching snare and a brave minor tune
  war: { bpm: 126, root: 55, scale: DORIAN, chords: [0, 5, 6, 4], lead: 'square', bass: 'triangle', arp: null, drums: ['k...s.ssk...s.s.', 'k.ssk.s.k.ssss.s'], busy: 0.55, bassRhythm: 'x...x...x.x.x...', seed: 83 },
  // Jungle Ruins: tribal toms and a bouncy pentatonic tune
  jungle: { bpm: 124, root: 62, scale: PENTA, chords: [0, 3, 2, 4], lead: 'triangle', bass: 'square', arp: 'triangle', drums: ['k..tt.s.k.t.s.tt', 'k.tt.ts.k..ts.t.'], busy: 0.6, bassRhythm: 'x..x..x.x..x.x..', seed: 101, swing: 0.1 },
  // Haunted Castle: slow, spooky minor with a creepy arp
  haunted: { bpm: 96, root: 57, scale: HARM, chords: [0, 5, 4, 0], lead: 'sine', bass: 'sawtooth', arp: 'square', drums: [HALF, 'k.......s...t.t.'], busy: 0.4, bassRhythm: 'x.......x...x...', seed: 107, leadOct: 1 },
  // Candy Land: sugary, happy and quick
  candy: { bpm: 144, root: 67, scale: MAJOR, chords: [0, 5, 3, 4], lead: 'square', bass: 'triangle', arp: 'triangle', drums: [BACK, 'k.h.s.hhk.h.s.h.'], busy: 0.7, bassRhythm: 'x.x...x.x.x...x.', seed: 113, leadOct: 1 },
  // Farm: a happy country hoedown
  farm: { bpm: 132, root: 65, scale: MAJOR, chords: [0, 3, 4, 0], lead: 'square', bass: 'triangle', arp: 'triangle', drums: ['k.h.s.h.k.h.s.h.', 'k.hhs.h.k.h.s.hh'], busy: 0.65, bassRhythm: 'x...x.x.x...x.x.', seed: 127, swing: 0.2 },
  // Graveyard: slow, creepy and a little silly
  graveyard: { bpm: 100, root: 52, scale: HARM, chords: [0, 3, 5, 4], lead: 'triangle', bass: 'square', arp: 'sine', drums: [HALF, 'k...t...s...t.t.'], busy: 0.45, bassRhythm: 'x.......x.x.....', seed: 131, leadOct: 1 },
  // The Pigeon: a silly, bouncy theme that loops for as long as the fight goes on
  inferno: { bpm: 160, root: 59, scale: PHRYG, chords: [0, 1, 5, 6], lead: 'sawtooth', bass: 'sawtooth', arp: 'square', drums: [DRIVE, 'k.hks.h.k.hks.ss'], busy: 0.75, bassRhythm: 'xx.xxx.xxx.xxx.x', seed: 137 },
  pirate: { bpm: 140, root: 62, scale: MINOR, chords: [0, 5, 6, 4], lead: 'square', bass: 'triangle', arp: 'triangle', drums: ['k..h..s.k..h..s.', 'k..hk.s.k.hh..s.'], busy: 0.65, bassRhythm: 'x..x..x.x..x..x.', seed: 139, swing: 0.18 },
  desert: { bpm: 116, root: 62, scale: HARM, chords: [0, 1, 0, 6], lead: 'triangle', bass: 'square', arp: 'sine', drums: ['k..t..t.s..t.tt.', 'k.tt..t.s..t..t.'], busy: 0.5, bassRhythm: 'x..x....x..x....', seed: 149 },
  outbreak: { bpm: 104, root: 52, scale: HARM, chords: [0, 1, 5, 4], lead: 'sawtooth', bass: 'sawtooth', arp: 'square', drums: [HALF, 'k..k..s.k.k...s.'], busy: 0.5, bassRhythm: 'x.xx..x.x.xx..x.', seed: 151, leadOct: -1 },
  elephant: { bpm: 164, root: 60, scale: LYDIAN, chords: [0, 4, 5, 1], lead: 'square', bass: 'sawtooth', arp: 'triangle', drums: [DRIVE, 'k.hks.hkk.hks.ss'], busy: 0.8, bassRhythm: 'x.xxx.xxx.xxx.xx', seed: 157, leadOct: 1 },
  pigeon: { bpm: 150, root: 62, scale: MAJOR, chords: [0, 4, 5, 3, 0, 4, 1, 4], lead: 'square', bass: 'triangle', arp: 'square', drums: ['k.h.s.h.k.k.s.h.', 'k.hks.h.k.h.s.hh'], busy: 0.75, bassRhythm: 'x.xx..x.x.xx..x.', seed: 97, swing: 0.08, leadOct: 1 },
  // Standard bosses: fast and intense
  boss: { bpm: 168, root: 57, scale: HARM, chords: [0, 5, 3, 4], lead: 'square', bass: 'sawtooth', arp: 'square', drums: [DRIVE, 'k.hks.hkk.hks.ss'], busy: 0.8, bassRhythm: 'xxxxxxxxxxxxxxxx', seed: 61 },
  // The Snow Queen: icy synths and fast arps
  queen: { bpm: 176, root: 64, scale: HARM, chords: [0, 5, 3, 4, 0, 5, 1, 4], lead: 'triangle', bass: 'square', arp: 'triangle', drums: ['k.h.s.h.k.h.s.h.', 'k.hhs.hhk.hhs.sh'], busy: 0.85, bassRhythm: 'x.x.x.x.x.x.x.x.', seed: 71, leadOct: 1 },
  // The Tide King: heavy, deep, pulsing bass
  tide: { bpm: 100, root: 50, scale: MINOR, chords: [0, 0, 5, 6], lead: 'sawtooth', bass: 'sawtooth', arp: null, drums: [HALF, 'k..k....s.....k.'], busy: 0.45, bassRhythm: 'x.xxx.xxx.xxx.xx', seed: 73, leadOct: -1, vol: 1.1 },
  // The Ancient Guardian: tribal drums and a mysterious flute
  guardian: { bpm: 124, root: 57, scale: PENTA, chords: [0, 0, 3, 4], lead: 'sine', bass: 'triangle', arp: null, drums: ['k..tt..tk.t.t.tt', 'k.ttk.t.k..tt.tk'], busy: 0.55, bassRhythm: 'x..x..x.x..x....', seed: 79 },
};

/** Small seeded random numbers, so a track's tune never changes. */
function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Lead melody: for each bar, 16 steps of scale-degree offsets (or null for a rest). */
function makeMelody(t: TrackDef): (number | null)[][] {
  const r = rng(t.seed);
  // Two phrases (A and B), played A A B A so the tune sticks.
  const phrase = () =>
    t.chords.slice(0, 4).map((chord) => {
      const bar: (number | null)[] = [];
      let deg = chord + [0, 2, 4][Math.floor(r() * 3)];
      for (let i = 0; i < 16; i++) {
        const strong = i % 4 === 0;
        if (!strong && r() > t.busy) {
          bar.push(null);
          continue;
        }
        if (strong) deg = chord + [0, 2, 4, 7][Math.floor(r() * 4)];
        else deg += [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];
        bar.push(deg);
      }
      return bar;
    });
  const a = phrase();
  const b = phrase();
  const bars = [...a, ...a, ...b, ...a];
  // Tracks with 8 chords: walk through all of them.
  return t.chords.length > 4 ? bars.map((bar, i) => bar.map((d) => (d === null ? null : d - t.chords[i % 4] + t.chords[i % t.chords.length]))) : bars;
}

function degHz(t: TrackDef, deg: number, oct: number): number {
  const n = t.scale.length;
  const o = Math.floor(deg / n);
  const step = t.scale[((deg % n) + n) % n];
  return midiHz(t.root + step + 12 * (o + oct));
}

let current: TrackId | null = null;
let gain: GainNode | null = null;
let timer = 0;
let step = 0;
let nextTime = 0;
let melody: (number | null)[][] = [];

function voice(a: AudioContext, out: AudioNode, type: OscillatorType, hz: number, at: number, dur: number, vol: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(hz, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** A fuzz pedal: clips the sound hard so a sawtooth sounds like an electric guitar. */
let fuzzCurve: Float32Array<ArrayBuffer> | null = null;
function fuzz(a: AudioContext, out: AudioNode): AudioNode {
  if (!fuzzCurve) {
    fuzzCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      fuzzCurve[i] = Math.tanh(x * 9);
    }
  }
  const ws = a.createWaveShaper();
  ws.curve = fuzzCurve;
  ws.oversample = '2x';
  const tone = a.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  ws.connect(tone).connect(out);
  return ws;
}

/** One guitar note (or power chord: root, fifth and octave) through the fuzz. */
function guitar(a: AudioContext, out: AudioNode, hzs: number[], at: number, dur: number, vol: number) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.005);
  g.gain.exponentialRampToValueAtTime(vol * 0.4, at + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const pedal = fuzz(a, g);
  g.connect(out);
  for (const hz of hzs) {
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(hz, at);
    // A little bend up for the funk
    o.detune.setValueAtTime(-30, at);
    o.detune.linearRampToValueAtTime(0, at + 0.04);
    o.connect(pedal);
    o.start(at);
    o.stop(at + dur + 0.02);
  }
}

function drum(a: AudioContext, out: AudioNode, kind: string, at: number) {
  if (kind === 'k' || kind === 't') {
    const o = a.createOscillator();
    const g = a.createGain();
    const top = kind === 'k' ? 150 : 220;
    o.frequency.setValueAtTime(top, at);
    o.frequency.exponentialRampToValueAtTime(kind === 'k' ? 40 : 90, at + 0.15);
    g.gain.setValueAtTime(kind === 'k' ? 0.5 : 0.35, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + (kind === 'k' ? 0.2 : 0.25));
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.3);
    return;
  }
  const src = a.createBufferSource();
  src.buffer = noise(a);
  const f = a.createBiquadFilter();
  // c = crash cymbal (the rock song)
  f.type = kind === 'h' || kind === 'c' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'h' ? 7000 : kind === 'c' ? 5000 : 1800;
  const g = a.createGain();
  const len = kind === 'h' ? 0.05 : kind === 'c' ? 0.9 : 0.15;
  g.gain.setValueAtTime(kind === 'h' ? 0.12 : kind === 'c' ? 0.16 : 0.28, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(f).connect(g).connect(out);
  src.start(at, Math.random() * 0.5);
  src.stop(at + len + 0.02);
}

function schedule() {
  const a = audio();
  if (!a || !gain || !current) return;
  if (a.state !== 'running') {
    nextTime = a.currentTime + 0.05;
    return;
  }
  const t = TRACKS[current];
  const s16 = 60 / t.bpm / 4;
  if (nextTime < a.currentTime - 0.2) nextTime = a.currentTime + 0.05;
  const quiet = musicLevel() <= 0;
  while (nextTime < a.currentTime + 0.15) {
    if (quiet) {
      step++;
      nextTime += s16;
      continue;
    }
    const bars = melody.length;
    const barI = Math.floor(step / 16) % bars;
    const i = step % 16;
    const chord = t.chords[barI % t.chords.length];
    const at = nextTime + (i % 2 ? (t.swing ?? 0) * s16 : 0);
    const out = gain;
    const vol = t.vol ?? 1;
    const deg = melody[barI][i];
    if (t.rock) {
      // Lead guitar screaming on top, power chords chugging underneath, and a crash on every bar.
      if (deg !== null) guitar(a, out, [degHz(t, deg, 1)], at, s16 * 1.9, 0.05 * vol);
      if (t.bassRhythm[i] === 'x') {
        const root = degHz(t, chord, -1);
        guitar(a, out, [root, root * 1.5, root * 2], at, s16 * 1.4, 0.055 * vol);
        voice(a, out, 'triangle', root / 2, at, s16 * 1.4, 0.22 * vol);
      }
      if (i === 0) drum(a, out, 'c', at);
      const pat = t.drums[barI % 4 === 3 && t.drums.length > 1 ? 1 : 0];
      if (pat[i] !== '.') drum(a, out, pat[i], at);
      step++;
      nextTime += s16;
      continue;
    }
    // Lead
    if (deg !== null) voice(a, out, t.lead, degHz(t, deg, 1 + (t.leadOct ?? 0)), at, s16 * 1.8, (t.lead === 'sine' || t.lead === 'triangle' ? 0.16 : 0.07) * vol);
    // Bass
    if (t.bassRhythm[i] === 'x') voice(a, out, t.bass, degHz(t, chord + (i >= 8 && i % 4 === 2 ? 4 : 0), -1), at, s16 * 1.6, (t.bass === 'sawtooth' ? 0.09 : 0.2) * vol);
    // Arpeggio: chord tones going up, on every other step
    if (t.arp && i % 2 === 0) voice(a, out, t.arp, degHz(t, chord + [0, 2, 4, 7][(i / 2) % 4], 1), at, s16 * 0.9, (t.arp === 'square' ? 0.03 : 0.06) * vol);
    // Drums: the second pattern every 4th bar for a fill
    const pat = t.drums[barI % 4 === 3 && t.drums.length > 1 ? 1 : 0];
    const d = pat[i];
    if (d !== '.') drum(a, out, d, at);
    step++;
    nextTime += s16;
  }
}

/** Songs with a name and cover art: a "Now playing" card pops up when one starts. */
export const SONGS: Partial<Record<TrackId, { name: string; cover: string }>> = {
  rock: { name: 'Sandbox Riot', cover: '/covers/rock.jpg' },
};
let onSong: ((id: TrackId) => void) | null = null;
export const setSongListener = (fn: (id: TrackId) => void) => (onSong = fn);

/** Start a track (keeps playing if it already is). Fades between tracks. */
export function playMusic(id: TrackId) {
  if (current === id && gain) return;
  if (current !== id && SONGS[id] && musicLevel() > 0) onSong?.(id);
  stopMusic();
  const a = audio();
  const bus = musicOut();
  if (!a || !bus) {
    current = id;
    return;
  }
  current = id;
  melody = makeMelody(TRACKS[id]);
  step = 0;
  nextTime = a.currentTime + 0.1;
  gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.linearRampToValueAtTime(1, a.currentTime + 0.6);
  gain.connect(bus);
  timer = window.setInterval(schedule, 40);
  schedule();
}

export function stopMusic() {
  window.clearInterval(timer);
  timer = 0;
  current = null;
  const a = audio();
  if (gain && a) {
    const g = gain;
    g.gain.cancelScheduledValues(a.currentTime);
    g.gain.setValueAtTime(g.gain.value, a.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, a.currentTime + 0.4);
    setTimeout(() => g.disconnect(), 600);
  }
  gain = null;
}

/** The track that should play right now (for Settings and the first tap). */
export const nowPlaying = () => current;

/** Short fanfares: winning (also for achievements) or losing. Stops the music. */
export function jingle(kind: 'victory' | 'defeat') {
  stopMusic();
  const a = audio();
  const bus = musicOut();
  if (!a || !bus || musicLevel() <= 0) return;
  const at = a.currentTime + 0.45;
  const list: [number, number, number][] =
    kind === 'victory'
      ? [[72, 0, 0.12], [76, 0.12, 0.12], [79, 0.24, 0.12], [84, 0.36, 0.3], [79, 0.7, 0.12], [84, 0.82, 0.7]]
      : [[67, 0, 0.3], [66, 0.32, 0.3], [65, 0.64, 0.3], [64, 0.96, 0.9]];
  for (const [m, t, d] of list) {
    voice(a, bus, 'square', midiHz(m), at + t, d, 0.1);
    voice(a, bus, 'triangle', midiHz(m - 12), at + t, d, 0.18);
  }
  if (kind === 'victory') for (let i = 0; i < 4; i++) drum(a, bus, i === 3 ? 's' : 'k', at + 0.82 + i * 0.001);
}
