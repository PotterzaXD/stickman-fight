import { save } from './save';

/**
 * The audio engine: one AudioContext with a music bus and a sound effects bus.
 * Volumes and mutes come from Settings (saved with the rest of the save on this device).
 */
let ctx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

export function audio(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      musicBus = ctx.createGain();
      sfxBus = ctx.createGain();
      musicBus.connect(ctx.destination);
      sfxBus.connect(ctx.destination);
      applyVolumes();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export const musicOut = () => (audio(), musicBus);
export const sfxOut = () => (audio(), sfxBus);

/** 0..1 from a 0-100 slider, on a curve so the low end of the slider is usable. */
const curve = (v: number) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 1.6);

export function musicLevel(): number {
  const s = save.data.settings;
  return s.musicMute ? 0 : curve(s.musicVol);
}

export function sfxLevel(): number {
  const s = save.data.settings;
  return s.sfxMute ? 0 : curve(s.sfxVol);
}

/** Call after the volume settings change. */
export function applyVolumes() {
  if (!ctx || !musicBus || !sfxBus) return;
  const now = ctx.currentTime;
  musicBus.gain.setTargetAtTime(musicLevel() * 0.55, now, 0.05);
  sfxBus.gain.setTargetAtTime(sfxLevel(), now, 0.02);
}

let noiseBuf: AudioBuffer | null = null;
/** One second of white noise (drums, wind, splashes). */
export function noise(a: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
  const b = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return b;
}

export const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
