import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../cloud';
import { TEAM_COLORS, randomBossWeapons, type FighterSpec, type MatchResult } from '../game/game';
import type { Controller, Difficulty, FallMode, MapDef, Mode } from '../game/types';
import { cleanName } from '../save';
import type { Snapshot } from './snapshot';

export const PROTO = 2;
export const MIN_ROOM = 2;
export const MAX_ROOM = 20;
export const MAX_LOCAL = 6;
export const ONLINE_SNOWMEN = 5;

const ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

/** 20 easy-to-tell-apart colours for online FFA. */
export const ONLINE_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#ec407a', '#00acc1', '#7cb342', '#6d4c41',
  '#3949ab', '#f4511e', '#00897b', '#c0ca33', '#5e35b1', '#d81b60', '#039be5', '#ffb300', '#546e7a', '#9e9d24',
];

export interface Member {
  id: string;
  /** 'host' or the joining device's id. */
  device: string;
  /** Which joystick on that device (0-5). */
  local: number;
  kind: 'human' | 'bot';
  name: string;
  weapon: string;
  team: number;
  difficulty: Difficulty;
  /** Joined during a match: plays from the next round. */
  waiting?: boolean;
}

export interface RoomState {
  code: string;
  size: number;
  mode: Mode;
  mapId: string;
  map: MapDef | null;
  fallMode: FallMode;
  /** Boss Fight: how many bosses (1-3). */
  bosses: number;
  hostWeapons: string[];
  phase: 'lobby' | 'playing';
  members: Member[];
}

export interface NetSpec extends FighterSpec {
  memberId: string;
  device: string;
  local: number;
}

export interface StartPayload {
  map: MapDef;
  mode: Mode;
  fallMode: FallMode;
  specs: NetSpec[];
  bosses: number;
  /** Each boss's two weapons, so every device draws the same bosses. */
  bossWeapons: string[][];
}

export interface NetResult {
  mode: Mode;
  winnerTeam: number | null;
  /** Indexes into the match's fighters. */
  winners: number[];
}

type Msg =
  | { t: 'hello'; v: number; players: string[] }
  | { t: 'welcome'; device: string }
  | { t: 'reject'; reason: 'full' | 'version' }
  | { t: 'lobby'; state: RoomState }
  | { t: 'start'; start: StartPayload }
  | { t: 'over'; result: NetResult }
  | { t: 'set'; id: string; weapon?: string; team?: number; name?: string }
  | { t: 'in'; s: number[][] }
  | { t: 'closed'; reason: 'host-left' | 'kicked' }
  | { t: 'bye' }
  | Snapshot;

export type JoinError = 'notFound' | 'full' | 'failed' | 'version' | 'offline';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}
export function normalizeCode(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
const rid = () => Math.random().toString(36).slice(2, 10);

class Emitter<E extends Record<string, unknown>> {
  private ls: { [K in keyof E]?: ((v: E[K]) => void)[] } = {};
  on<K extends keyof E>(k: K, fn: (v: E[K]) => void): () => void {
    (this.ls[k] ??= []).push(fn);
    return () => (this.ls[k] = this.ls[k]!.filter((f) => f !== fn));
  }
  emit<K extends keyof E>(k: K, v: E[K]) {
    for (const fn of this.ls[k] ?? []) fn(v);
  }
}

export type RoomEvents = {
  state: RoomState;
  start: StartPayload;
  snapshot: Snapshot;
  over: NetResult;
  closed: 'host-left' | 'kicked' | 'connection';
};

// ---------- signalling over Supabase Realtime (only used to connect) ----------

interface SigMsg {
  type: 'offer' | 'answer';
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
}

interface Sig {
  readonly id: string;
  onMsg: (m: SigMsg) => void;
  findHost(ms: number): Promise<string | null>;
  trackHost(): Promise<void>;
  send(m: SigMsg): void;
  close(): void;
}

/** Development only: connect windows of the same browser without Supabase (localStorage 'sf-localsig' = '1'). */
class LocalSignal implements Sig {
  onMsg: (m: SigMsg) => void = () => {};
  private bc: BroadcastChannel;
  private host: string | null = null;
  private isHost = false;
  constructor(code: string, readonly id: string) {
    this.bc = new BroadcastChannel(`sf-room-${code}`);
    this.bc.onmessage = (e) => {
      const d = e.data;
      if (d.k === 'who' && this.isHost) this.bc.postMessage({ k: 'host', id: this.id });
      else if (d.k === 'host') this.host = d.id;
      else if (d.k === 'sig' && d.m.to === this.id) this.onMsg(d.m);
    };
  }
  async findHost(ms: number) {
    this.bc.postMessage({ k: 'who' });
    await new Promise((r) => setTimeout(r, Math.min(ms, 500)));
    return this.host;
  }
  async trackHost() {
    this.isHost = true;
  }
  send(m: SigMsg) {
    this.bc.postMessage({ k: 'sig', m });
  }
  close() {
    this.bc.close();
  }
}

function openSignal(code: string, id: string): Promise<Sig> {
  let local = false;
  try {
    local = import.meta.env.DEV && localStorage.getItem('sf-localsig') === '1';
  } catch {
    /* ignore */
  }
  return local ? Promise.resolve(new LocalSignal(code, id)) : Signal.open(code, id);
}

class Signal implements Sig {
  private synced = false;
  onMsg: (m: SigMsg) => void = () => {};

  private constructor(
    private ch: RealtimeChannel,
    readonly id: string,
  ) {}

  static async open(code: string, id: string): Promise<Signal> {
    const ch = supabase().channel(`sf-room-${code}`, { config: { broadcast: { self: false }, presence: { key: id } } });
    const sig = new Signal(ch, id);
    ch.on('broadcast', { event: 'sig' }, ({ payload }) => {
      if ((payload as SigMsg).to === id) sig.onMsg(payload as SigMsg);
    });
    ch.on('presence', { event: 'sync' }, () => (sig.synced = true));
    await new Promise<void>((res, rej) => {
      const timer = setTimeout(() => rej(new Error('timeout')), 10000);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          res();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer);
          rej(new Error(status));
        }
      });
    });
    return sig;
  }

  /** Wait for the list of who is in the channel, then return the host's id (if any). */
  async findHost(ms: number): Promise<string | null> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const h = this.hostId();
      if (h) return h;
      if (this.synced && Date.now() > end - ms + 1500) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    return this.hostId();
  }

  private hostId(): string | null {
    const st = this.ch.presenceState() as Record<string, { role?: string }[]>;
    for (const [key, metas] of Object.entries(st)) if (key !== this.id && metas.some((m) => m.role === 'host')) return key;
    return null;
  }

  async trackHost() {
    await this.ch.track({ role: 'host' });
  }

  send(m: SigMsg) {
    void this.ch.send({ type: 'broadcast', event: 'sig', payload: m });
  }

  close() {
    void supabase().removeChannel(this.ch);
  }
}

function waitIce(pc: RTCPeerConnection, ms = 2500): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((res) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      res();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, ms);
  });
}

function opened(ch: RTCDataChannel, ms: number): Promise<void> {
  if (ch.readyState === 'open') return Promise.resolve();
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('open timeout')), ms);
    ch.addEventListener('open', () => {
      clearTimeout(timer);
      res();
    });
  });
}

function sendJson(ch: RTCDataChannel | undefined, m: Msg) {
  if (ch && ch.readyState === 'open') ch.send(JSON.stringify(m));
}

/** Give every name in the room a unique version: "Potter", "Potter 2"... */
function uniqueName(base: string, taken: Set<string>) {
  const b = base || 'Player';
  if (!taken.has(b)) return b;
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`;
    const cand = Array.from(b).slice(0, 12 - suffix.length).join('') + suffix;
    if (!taken.has(cand)) return cand;
  }
}

// ---------- host ----------

interface Peer {
  id: string;
  pc: RTCPeerConnection;
  rel?: RTCDataChannel;
  fast?: RTCDataChannel;
}

export class RoomHost extends Emitter<RoomEvents> {
  readonly role = 'host' as const;
  readonly device = 'host';
  state: RoomState;
  lastStart: StartPayload | null = null;
  /** Joystick state for every remote human, by member id. */
  remoteCtrl = new Map<string, Controller>();
  private peers = new Map<string, Peer>();
  private sig: Sig;
  private closed = false;

  private constructor(sig: Sig, state: RoomState) {
    super();
    this.sig = sig;
    this.state = state;
    sig.onMsg = (m) => void this.onSignal(m);
  }

  static async create(size: number, names: string[], hostWeapons: string[], map: MapDef): Promise<RoomHost> {
    for (let tries = 0; tries < 5; tries++) {
      const code = newCode();
      const id = 'h' + rid();
      const sig = await openSignal(code, id);
      if (await sig.findHost(1200)) {
        sig.close();
        continue;
      }
      await sig.trackHost();
      const taken = new Set<string>();
      const members: Member[] = names.map((n, i) => {
        const name = uniqueName(cleanName(n), taken);
        taken.add(name);
        return { id: rid(), device: 'host', local: i, kind: 'human', name, weapon: 'sword', team: i % 4, difficulty: 'medium' };
      });
      return new RoomHost(sig, {
        code,
        size: Math.max(MIN_ROOM, Math.min(MAX_ROOM, size)),
        mode: 'ffa',
        mapId: map.id,
        map,
        fallMode: 'ko',
        bosses: 1,
        hostWeapons,
        phase: 'lobby',
        members,
      });
    }
    throw new Error('no free code');
  }

  get myMembers() {
    return this.state.members.filter((m) => m.device === 'host');
  }

  private async onSignal(m: SigMsg) {
    if (m.type !== 'offer' || this.closed) return;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer: Peer = { id: m.from, pc };
    this.peers.set(m.from, peer);
    pc.ondatachannel = (e) => {
      const ch = e.channel;
      if (ch.label === 'rel') {
        peer.rel = ch;
        ch.onmessage = (ev) => this.onPeerMessage(peer, JSON.parse(ev.data));
        ch.onclose = () => this.dropDevice(peer.id);
      } else {
        peer.fast = ch;
        ch.onmessage = (ev) => this.onPeerMessage(peer, JSON.parse(ev.data));
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.dropDevice(peer.id);
    };
    await pc.setRemoteDescription(m.sdp);
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIce(pc);
    this.sig.send({ type: 'answer', from: this.sig.id, to: m.from, sdp: pc.localDescription!.toJSON() });
  }

  private onPeerMessage(peer: Peer, m: Msg) {
    const st = this.state;
    switch (m.t) {
      case 'hello': {
        if (m.v !== PROTO) return sendJson(peer.rel, { t: 'reject', reason: 'version' });
        const players = m.players.slice(0, MAX_LOCAL);
        if (!players.length || st.members.length + players.length > st.size) return sendJson(peer.rel, { t: 'reject', reason: 'full' });
        const taken = new Set(st.members.map((x) => x.name));
        players.forEach((n, i) => {
          const name = uniqueName(cleanName(n), taken);
          taken.add(name);
          const counts = [0, 0, 0, 0];
          for (const x of st.members) counts[x.team]++;
          st.members.push({
            id: rid(),
            device: peer.id,
            local: i,
            kind: 'human',
            name,
            weapon: 'sword',
            team: counts.indexOf(Math.min(...counts)),
            difficulty: 'medium',
            waiting: st.phase === 'playing',
          });
        });
        sendJson(peer.rel, { t: 'welcome', device: peer.id });
        this.changed();
        if (st.phase === 'playing' && this.lastStart) sendJson(peer.rel, { t: 'start', start: this.lastStart });
        break;
      }
      case 'set': {
        const mem = st.members.find((x) => x.id === m.id && x.device === peer.id);
        if (!mem) return;
        this.patch(mem, m);
        break;
      }
      case 'in': {
        st.members
          .filter((x) => x.device === peer.id)
          .forEach((x) => {
            const s = m.s[x.local];
            const c = this.remoteCtrl.get(x.id);
            if (!s || !c) return;
            c.x = s[0];
            c.y = s[1];
            c.active = s[2] === 1;
          });
        break;
      }
      case 'bye':
        this.dropDevice(peer.id);
        break;
    }
  }

  private patch(mem: Member, p: { weapon?: string; team?: number; name?: string; difficulty?: Difficulty }) {
    if (p.weapon && (p.weapon === 'random' || this.state.hostWeapons.includes(p.weapon))) mem.weapon = p.weapon;
    if (typeof p.team === 'number' && p.team >= 0 && p.team < TEAM_COLORS.length) mem.team = p.team;
    if (p.difficulty) mem.difficulty = p.difficulty;
    if (p.name !== undefined) {
      const taken = new Set(this.state.members.filter((x) => x !== mem).map((x) => x.name));
      mem.name = uniqueName(cleanName(p.name), taken);
    }
    this.changed();
  }

  /** Host changes any member (team, weapon, bot difficulty). */
  setMember(id: string, p: { weapon?: string; team?: number; name?: string; difficulty?: Difficulty }) {
    const mem = this.state.members.find((x) => x.id === id);
    if (mem) this.patch(mem, p);
  }

  setRoom(p: Partial<Pick<RoomState, 'mode' | 'fallMode' | 'size' | 'bosses'>> & { map?: MapDef }) {
    if (p.mode) this.state.mode = p.mode;
    if (p.bosses) this.state.bosses = Math.max(1, Math.min(3, Math.round(p.bosses)));
    if (p.fallMode) this.state.fallMode = p.fallMode;
    if (p.size) this.state.size = Math.max(Math.max(MIN_ROOM, this.state.members.length), Math.min(MAX_ROOM, p.size));
    if (p.map) {
      this.state.map = p.map;
      this.state.mapId = p.map.id;
    }
    this.changed();
  }

  addBot(difficulty: Difficulty) {
    const st = this.state;
    if (st.members.length >= st.size) return;
    const bots = st.members.filter((m) => m.kind === 'bot').length;
    const counts = [0, 0, 0, 0];
    for (const x of st.members) counts[x.team]++;
    st.members.push({ id: rid(), device: 'host', local: -1, kind: 'bot', name: `Bot ${bots + 1}`, weapon: 'random', team: counts.indexOf(Math.min(...counts)), difficulty });
    this.changed();
  }

  /** Remove a bot, or send a whole device out of the room. */
  remove(id: string) {
    const mem = this.state.members.find((m) => m.id === id);
    if (!mem) return;
    if (mem.kind === 'bot') {
      this.state.members = this.state.members.filter((m) => m !== mem);
      this.changed();
    } else if (mem.device !== 'host') {
      sendJson(this.peers.get(mem.device)?.rel, { t: 'closed', reason: 'kicked' });
      this.dropDevice(mem.device);
    }
  }

  private dropDevice(device: string) {
    const peer = this.peers.get(device);
    if (!peer) return;
    this.peers.delete(device);
    try {
      peer.pc.close();
    } catch {
      /* ignore */
    }
    const gone = this.state.members.filter((m) => m.device === device);
    this.state.members = this.state.members.filter((m) => m.device !== device);
    for (const m of gone) this.remoteCtrl.delete(m.id);
    this.leftIds.push(...gone.map((m) => m.id));
    this.changed();
  }

  /** Member ids whose device left (the match screen hands their stickmen to bots). */
  leftIds: string[] = [];

  private changed() {
    for (const p of this.peers.values()) sendJson(p.rel, { t: 'lobby', state: this.state });
    this.emit('state', this.state);
  }

  canStart(): boolean {
    const ms = this.state.members;
    if (this.state.mode === 'boss') return ms.length >= 1;
    if (ms.length < 2) return false;
    return this.state.mode !== 'team' || new Set(ms.map((m) => m.team)).size >= 2;
  }

  start() {
    const st = this.state;
    if (!st.map || !this.canStart()) return;
    for (const m of st.members) m.waiting = false;
    const specs: NetSpec[] = st.members.map((m, i) => ({
      name: m.name,
      color: st.mode === 'team' ? TEAM_COLORS[m.team] : ONLINE_COLORS[i % ONLINE_COLORS.length],
      team: st.mode === 'team' ? m.team : st.mode === 'boss' ? 0 : i,
      human: m.kind === 'human',
      weapon: m.weapon === 'random' ? st.hostWeapons[Math.floor(Math.random() * st.hostWeapons.length)] : m.weapon,
      difficulty: m.difficulty,
      playerIndex: m.kind === 'human' ? m.local : -1,
      memberId: m.id,
      device: m.device,
      local: m.local,
    }));
    this.remoteCtrl.clear();
    for (const m of st.members) if (m.kind === 'human' && m.device !== 'host') this.remoteCtrl.set(m.id, { x: 0, y: 0, active: false });
    this.leftIds = [];
    st.phase = 'playing';
    const bosses = st.mode === 'boss' ? st.bosses : 0;
    this.lastStart = { map: st.map, mode: st.mode, fallMode: st.fallMode, specs, bosses, bossWeapons: Array.from({ length: bosses }, randomBossWeapons) };
    for (const p of this.peers.values()) sendJson(p.rel, { t: 'start', start: this.lastStart });
    this.changed();
    this.emit('start', this.lastStart);
  }

  sendSnapshot(s: Snapshot) {
    const data = JSON.stringify(s);
    for (const p of this.peers.values()) {
      // Skip a frame for slow connections instead of piling up old ones.
      if (p.fast && p.fast.readyState === 'open' && p.fast.bufferedAmount < 200_000) p.fast.send(data);
    }
  }

  endMatch(r: MatchResult, fighters: unknown[]) {
    const result: NetResult = { mode: r.mode, winnerTeam: r.winnerTeam, winners: r.winners.map((f) => fighters.indexOf(f)) };
    for (const p of this.peers.values()) sendJson(p.rel, { t: 'over', result });
  }

  toLobby() {
    this.state.phase = 'lobby';
    this.changed();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const p of this.peers.values()) {
      sendJson(p.rel, { t: 'closed', reason: 'host-left' });
      setTimeout(() => p.pc.close(), 300);
    }
    this.peers.clear();
    this.sig.close();
  }
}

// ---------- joining device ----------

export class RoomClient extends Emitter<RoomEvents> {
  readonly role = 'client' as const;
  device = '';
  state: RoomState | null = null;
  lastStart: StartPayload | null = null;
  private leaving = false;

  private constructor(
    private pc: RTCPeerConnection,
    private rel: RTCDataChannel,
    private fast: RTCDataChannel,
  ) {
    super();
  }

  get myMembers(): Member[] {
    return this.state?.members.filter((m) => m.device === this.device) ?? [];
  }

  static async join(code: string, names: string[]): Promise<RoomClient> {
    const id = 'c' + rid();
    let sig: Sig;
    try {
      sig = await openSignal(code, id);
    } catch {
      throw 'offline' as JoinError;
    }
    try {
      const hostId = await sig.findHost(4000);
      if (!hostId) throw 'notFound' as JoinError;
      const pc = new RTCPeerConnection({ iceServers: ICE });
      const rel = pc.createDataChannel('rel', { ordered: true });
      const fast = pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 });
      const client = new RoomClient(pc, rel, fast);
      const answered = new Promise<void>((res) => {
        sig.onMsg = async (m) => {
          if (m.type === 'answer' && m.from === hostId) {
            await pc.setRemoteDescription(m.sdp);
            res();
          }
        };
      });
      await pc.setLocalDescription(await pc.createOffer());
      await waitIce(pc);
      sig.send({ type: 'offer', from: id, to: hostId, sdp: pc.localDescription!.toJSON() });
      await Promise.race([answered, new Promise((_, rej) => setTimeout(() => rej(new Error('no answer')), 10000))]);
      await Promise.all([opened(rel, 12000), opened(fast, 12000)]).catch(() => {
        throw 'failed' as JoinError;
      });
      const welcome = await new Promise<string>((res, rej) => {
        const timer = setTimeout(() => rej('failed' as JoinError), 8000);
        rel.onmessage = (ev) => {
          const m = JSON.parse(ev.data) as Msg;
          if (m.t === 'welcome') {
            clearTimeout(timer);
            res(m.device);
          } else if (m.t === 'reject') {
            clearTimeout(timer);
            rej(m.reason as JoinError);
          } else client.onMessage(m);
        };
        sendJson(rel, { t: 'hello', v: PROTO, players: names });
      });
      client.device = welcome;
      rel.onmessage = (ev) => client.onMessage(JSON.parse(ev.data));
      fast.onmessage = (ev) => client.onMessage(JSON.parse(ev.data));
      rel.onclose = () => !client.leaving && client.emit('closed', 'host-left');
      pc.onconnectionstatechange = () => {
        if (!client.leaving && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) client.emit('closed', 'connection');
      };
      return client;
    } catch (e) {
      throw typeof e === 'string' ? e : ('failed' as JoinError);
    } finally {
      // Connected (or failed): the signalling channel is no longer needed.
      sig.close();
    }
  }

  private onMessage(m: Msg) {
    switch (m.t) {
      case 'lobby':
        this.state = m.state;
        this.emit('state', m.state);
        break;
      case 'start':
        this.lastStart = m.start;
        this.emit('start', m.start);
        break;
      case 's':
        this.emit('snapshot', m);
        break;
      case 'over':
        this.emit('over', m.result);
        break;
      case 'closed':
        this.leaving = true;
        this.emit('closed', m.reason);
        this.pc.close();
        break;
    }
  }

  setMember(id: string, p: { weapon?: string; team?: number; name?: string }) {
    sendJson(this.rel, { t: 'set', id, ...p });
  }

  sendInput(ctrls: Controller[]) {
    if (this.fast.readyState !== 'open') return;
    this.fast.send(JSON.stringify({ t: 'in', s: ctrls.map((c) => [Math.round(c.x * 100) / 100, Math.round(c.y * 100) / 100, c.active ? 1 : 0]) }));
  }

  close() {
    if (this.leaving) return;
    this.leaving = true;
    sendJson(this.rel, { t: 'bye' });
    setTimeout(() => this.pc.close(), 200);
  }
}

// ---------- the room this device is in ----------

export type Session = RoomHost | RoomClient;
let current: Session | null = null;

export function session() {
  return current;
}

export function setSession(s: Session | null) {
  if (current && current !== s) current.close();
  current = s;
}
