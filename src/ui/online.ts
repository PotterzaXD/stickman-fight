import { cloudEnabled } from '../cloud';
import { allMaps } from '../game/maps';
import { t, type Key } from '../i18n';
import { MAX_LOCAL, MAX_ROOM, MIN_ROOM, RoomClient, RoomHost, normalizeCode, setSession, type JoinError } from '../net/room';
import { save } from '../save';
import { h, toast } from './dom';
import { localName, nameInput } from './lobby';
import { go, register } from './router';

const ERR: Record<JoinError, Key> = {
  notFound: 'errNotFound',
  full: 'errFull',
  failed: 'errFailed',
  version: 'errVersion',
  offline: 'errOffline',
};

let localCount = 1;
let roomSize = 6;

register('online', (root, arg) => {
  const body = h('div', { class: 'page-body narrow' });
  const codeIn = h('input', { class: 'code-box', maxlength: 6, placeholder: 'ABC123', autocomplete: 'off', 'aria-label': t('roomCode'), value: arg?.code ?? '' });
  codeIn.addEventListener('input', () => (codeIn.value = normalizeCode(codeIn.value)));
  const status = h('p', { class: 'error' });
  let busy = false;

  const names = () => Array.from({ length: localCount }, (_, i) => localName(i));

  const setBusy = (b: boolean, msg = '') => {
    busy = b;
    body.classList.toggle('busy', b);
    status.textContent = msg;
    status.style.color = b ? 'var(--muted)' : '';
  };

  const create = async () => {
    if (busy) return;
    setBusy(true, t('creating'));
    try {
      const map = allMaps(save.data.customMaps)[0];
      const host = await RoomHost.create(Math.max(roomSize, localCount), names(), [...save.data.owned], map);
      setSession(host);
      go('room');
    } catch (e) {
      console.warn(e);
      setBusy(false, t('errOffline'));
    }
  };

  const join = async () => {
    const code = normalizeCode(codeIn.value);
    if (busy || code.length !== 6) return;
    setBusy(true, t('joining'));
    try {
      const client = await RoomClient.join(code, names());
      setSession(client);
      go('room');
    } catch (e) {
      console.warn(e);
      setBusy(false, t(ERR[(e as JoinError) in ERR ? (e as JoinError) : 'failed']));
    }
  };

  const stepper = (get: () => number, set: (v: number) => void, lo: number, hi: number) => {
    const val = h('b', {}, String(get()));
    const change = (d: number) => {
      set(Math.max(lo, Math.min(hi, get() + d)));
      val.textContent = String(get());
      render();
    };
    return h('div', { class: 'stepper' }, h('button', { class: 'btn small', onclick: () => change(-1), 'aria-label': '-' }, '−'), val, h('button', { class: 'btn small', onclick: () => change(1), 'aria-label': '+' }, '+'));
  };

  const render = () => {
    body.replaceChildren(
      h('p', { class: 'muted', style: 'color:#e3f2fd;margin:0' }, t('onlineDesc')),
      h(
        'section',
        {},
        h('div', { class: 'row between' }, h('h3', {}, `🎮 ${t('yourPlayers')}`), stepper(() => localCount, (v) => (localCount = v), 1, MAX_LOCAL)),
        h('div', { class: 'names' }, ...Array.from({ length: localCount }, (_, i) => nameInput(i))),
      ),
      h(
        'section',
        {},
        h('h3', {}, `🏠 ${t('createRoom')}`),
        h('div', { class: 'row between' }, h('span', {}, t('roomSize')), stepper(() => roomSize, (v) => (roomSize = v), Math.max(MIN_ROOM, localCount), MAX_ROOM)),
        h('p', { class: 'muted small' }, t('hostWeaponsNote')),
        h('button', { class: 'btn big primary', onclick: create }, `🏠 ${t('createRoom')}`),
      ),
      h('section', {}, h('h3', {}, `🚪 ${t('joinRoom')}`), h('div', { class: 'row gap wrap' }, codeIn, h('button', { class: 'btn big primary', onclick: join }, t('join')))),
      status,
    );
  };

  if (!cloudEnabled) toast(t('errOffline'));
  render();
  root.append(h('div', { class: 'page' }, h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, t('online')), h('div', {})), body));
  if (arg?.code && normalizeCode(arg.code).length === 6) void join();
});
