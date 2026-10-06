import { save } from './save';

let ctx: AudioContext | null = null;
let last: Record<string, number> = {};

function ac(): AudioContext | null {
  if (!save.data.settings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Short synth blip. `name` limits how often the same sound can play. */
function tone(name: string, freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
  const a = ac();
  if (!a) return;
  const now = a.currentTime;
  if ((last[name] ?? -1) > now - 0.04) return;
  last[name] = now;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + dur);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(a.destination);
  o.start(now);
  o.stop(now + dur);
}

export const sfx = {
  /** Call from a tap so phones allow sound. */
  unlock: () => void ac(),
  click: () => tone('click', 660, 0.06, 'square', 0.05),
  hit: () => tone('hit', 180 + Math.random() * 60, 0.12, 'square', 0.08, -120),
  block: () => tone('block', 900, 0.08, 'triangle', 0.06),
  throw: () => tone('throw', 500, 0.1, 'sine', 0.06, 300),
  boom: () => tone('boom', 120, 0.4, 'sawtooth', 0.12, -90),
  ko: () => tone('ko', 440, 0.35, 'sawtooth', 0.1, -380),
  jump: () => tone('jump', 300, 0.1, 'sine', 0.04, 250),
  snowman: () => tone('snowman', 700, 0.25, 'triangle', 0.08, 500),
  win: () => {
    tone('w1', 523, 0.15, 'square', 0.07);
    setTimeout(() => tone('w2', 659, 0.15, 'square', 0.07), 150);
    setTimeout(() => tone('w3', 784, 0.3, 'square', 0.07), 300);
  },
  coin: () => tone('coin', 988, 0.15, 'square', 0.06, 400),
  glass: () => {
    tone('g1', 1800, 0.12, 'triangle', 0.06, 900);
    setTimeout(() => tone('g2', 2400, 0.1, 'triangle', 0.04, -600), 40);
  },
};
