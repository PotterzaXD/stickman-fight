import QRCode from 'qrcode';
import { TEAM_COLORS } from '../game/game';
import { allMaps } from '../game/maps';
import type { Difficulty, FallMode, Mode } from '../game/types';
import { WEAPONS } from '../game/weapons';
import { t, teamName, type Key } from '../i18n';
import { MAX_ROOM, MIN_ROOM, ONLINE_COLORS, RoomHost, session, setSession, type Member, type RoomState } from '../net/room';
import { cloudEnabled } from '../cloud';
import { canUseFriends, friendList, onFriendsChange, refreshFriends } from '../friends';
import { save } from '../save';
import { h, shareLink, toast } from './dom';
import { friendRow, inviteButton } from './friends';
import { mapThumb } from './icons';
import { bossPicker, keepScroll, mapLabel } from './lobby';
import { go, register } from './router';

export function roomLink(code: string) {
  return `${location.origin}${location.pathname}?room=${code}`;
}

/** Show why the room ended and go back to the Online screen. */
export function onRoomClosed(reason: 'host-left' | 'kicked' | 'connection') {
  toast(t(reason === 'kicked' ? 'kicked' : reason === 'host-left' ? 'hostLeft' : 'connLost'));
  setSession(null);
  go('online');
}

register('room', (root) => {
  const s = session();
  if (!s) {
    go('online');
    return;
  }
  const isHost = s instanceof RoomHost;
  const page = h('div', { class: 'page' });
  root.append(page);
  let botDiff: Difficulty = 'medium';
  const qr = h('canvas', { width: 132, height: 132 });
  let qrFor = '';

  const leave = () => {
    setSession(null);
    go('online');
  };

  // Invite friends: its own box, so friend updates don't redraw the whole room.
  const friendsBox = h('section', {});
  const paintFriends = () => {
    const code = s.state?.code;
    if (!cloudEnabled || !code) return friendsBox.replaceChildren();
    if (!canUseFriends()) return friendsBox.replaceChildren(h('h3', {}, `👥 ${t('inviteFriends')}`), h('p', { class: 'muted small' }, t('inviteNeedGoogle')));
    const online = friendList().filter((f) => f.online);
    friendsBox.replaceChildren(
      h('div', { class: 'row between' }, h('h3', {}, `👥 ${t('inviteFriends')}`), h('button', { class: 'btn small', onclick: () => go('friends') }, `👥 ${t('friends')}`)),
      online.length ? h('div', { class: 'slots' }, ...online.map((f) => friendRow(f, inviteButton(f, code)))) : h('p', { class: 'muted small' }, t('noFriendsOnline')),
    );
  };

  // Redraw without jumping back to the top (adding a bot or picking a weapon kept your place).
  const render = (st: RoomState | null) => keepScroll(page, () => paint(st));

  const paint = (st: RoomState | null) => {
    if (!st) {
      page.replaceChildren(h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: leave }, `← ${t('leave')}`), h('h2', {}, t('room')), h('div', {})), h('div', { class: 'page-body narrow' }, h('section', {}, h('p', {}, t('joining')))));
      return;
    }
    if (qrFor !== st.code) {
      qrFor = st.code;
      void QRCode.toCanvas(qr, roomLink(st.code), { width: 132, margin: 1 });
    }
    const mine = (m: Member) => m.device === s.device;
    const canEdit = (m: Member) => mine(m) || (isHost && m.kind === 'bot');
    const set = (m: Member, p: { weapon?: string; team?: number; difficulty?: Difficulty }) => (isHost ? (s as RoomHost).setMember(m.id, p) : s.setMember(m.id, p));
    const host = isHost ? (s as RoomHost) : null;

    const seg = <T extends string>(value: T, opts: [T, string][], pick: (v: T) => void) =>
      h('div', { class: 'segs' }, ...opts.map(([v, label]) => h('button', { class: `seg ${value === v ? 'on' : ''}`, disabled: !host, onclick: () => pick(v) }, label)));

    const weaponSel = (m: Member) => {
      const sel = h(
        'select',
        { disabled: !canEdit(m), 'aria-label': t('weapon'), onchange: (e: Event) => set(m, { weapon: (e.target as HTMLSelectElement).value }) },
        h('option', { value: 'random' }, `🎲 ${t('random')}`),
        ...WEAPONS.filter((w) => st.hostWeapons.includes(w.id)).map((w) => h('option', { value: w.id }, t(`w.${w.id}` as Key))),
      );
      sel.value = m.weapon;
      return sel;
    };

    const rows = st.members.map((m, i) => {
      const color = st.mode === 'team' ? TEAM_COLORS[m.team] : ONLINE_COLORS[i % ONLINE_COLORS.length];
      const diff = h(
        'select',
        { disabled: !host, 'aria-label': 'CPU', onchange: (e: Event) => set(m, { difficulty: (e.target as HTMLSelectElement).value as Difficulty }) },
        ...(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => h('option', { value: d }, t(d))),
      );
      diff.value = m.difficulty;
      return h(
        'div',
        { class: 'slot' },
        h('span', { class: 'member-name', style: `--c:${color}` }, m.kind === 'bot' ? '🤖 ' : '🎮 ', m.name),
        m.device === 'host' && m.kind === 'human' ? h('span', { class: 'tag' }, t('host')) : null,
        mine(m) && m.kind === 'human' ? h('span', { class: 'tag you' }, t('you')) : null,
        m.waiting ? h('span', { class: 'tag wait' }, `⏳ ${t('waitingNext')}`) : null,
        weaponSel(m),
        m.kind === 'bot' ? diff : null,
        st.mode === 'team'
          ? h(
              'div',
              { class: 'team-pick' },
              ...TEAM_COLORS.map((c, ti) =>
                h('button', { class: `team-dot ${m.team === ti ? 'on' : ''}`, style: `background:${c}`, disabled: !(canEdit(m) || host), 'aria-label': teamName(ti), onclick: () => set(m, { team: ti }) }),
              ),
            )
          : null,
        host && m.device !== 'host' ? h('button', { class: 'icon-btn', 'aria-label': 'remove', onclick: () => host.remove(m.id) }, '✕') : host && m.kind === 'bot' ? h('button', { class: 'icon-btn', 'aria-label': 'remove', onclick: () => host.remove(m.id) }, '✕') : null,
      );
    });

    const full = st.members.length >= st.size;
    const maps = host ? allMaps(save.data.customMaps) : [];
    page.replaceChildren(
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: leave }, `← ${t('leave')}`), h('h2', {}, `${t('room')} ${st.code}`), h('div', {})),
      h(
        'div',
        { class: 'page-body' },
        h(
          'section',
          {},
          h(
            'div',
            { class: 'room-top' },
            qr,
            h(
              'div',
              { class: 'col gap' },
              h('small', { class: 'muted' }, t('roomCode')),
              h('div', { class: 'room-code' }, st.code),
              h('small', { class: 'muted' }, t('scanToJoin')),
              h('button', { class: 'btn small', onclick: () => void shareLink(roomLink(st.code), t('title'), t('inviteText'), t('linkCopied')) }, `🔗 ${t('shareRoom')}`),
            ),
          ),
        ),
        h(
          'section',
          {},
          h('h3', {}, t('mode')),
          seg<Mode>(st.mode, [['ffa', `🥊 ${t('ffa')}`], ['team', `🤝 ${t('team')}`], ['boss', `👹 ${t('boss')}`]], (v) => host?.setRoom({ mode: v })),
          st.mode === 'boss' ? bossPicker(st.bosses ?? 1, host ? (n) => host.setRoom({ bosses: n }) : null) : null,
          h('h3', {}, `${t('map')}: ${st.map ? mapLabel(st.map) : ''}`),
          host ? h('div', { class: 'map-row' }, ...maps.map((mp) => h('button', { class: `map-card ${st.mapId === mp.id ? 'on' : ''}`, onclick: () => host.setRoom({ map: mp }) }, mapThumb(mp), h('span', {}, mapLabel(mp))))) : st.map ? mapThumb(st.map) : null,
          h('h3', {}, `🕳️ ${t('fallOff')}`),
          seg<FallMode>(st.fallMode, [['ko', t('fallKO')], ['bounce', t('fallBounce')]], (v) => host?.setRoom({ fallMode: v })),
        ),
        h(
          'section',
          {},
          h(
            'div',
            { class: 'row between' },
            h('h3', {}, `${t('fighters')} ${st.members.length}/${st.size}`),
            host
              ? h(
                  'div',
                  { class: 'row gap wrap' },
                  h('span', {}, t('roomSize')),
                  h('button', { class: 'btn small', onclick: () => host.setRoom({ size: st.size - 1 }), disabled: st.size <= Math.max(MIN_ROOM, st.members.length) }, '−'),
                  h('b', {}, String(st.size)),
                  h('button', { class: 'btn small', onclick: () => host.setRoom({ size: st.size + 1 }), disabled: st.size >= MAX_ROOM }, '+'),
                )
              : null,
          ),
          h('p', { class: 'muted small' }, t('hostWeaponsNote')),
          h('div', { class: 'slots' }, ...rows),
          host
            ? (() => {
                const sel = h(
                  'select',
                  { 'aria-label': 'CPU', onchange: (e: Event) => (botDiff = (e.target as HTMLSelectElement).value as Difficulty) },
                  ...(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => h('option', { value: d }, t(d))),
                );
                sel.value = botDiff;
                return h('div', { class: 'row gap' }, h('button', { class: 'btn small', disabled: full, onclick: () => host.addBot(botDiff) }, full ? t('roomFull') : t('addBot')), sel);
              })()
            : null,
        ),
        friendsBox,
      ),
      h(
        'footer',
        { class: 'page-foot' },
        host ? h('button', { class: 'btn big primary', disabled: !host.canStart(), onclick: () => host.start() }, `⚔️ ${t('start')}`) : h('p', { style: 'color:#fff;margin:0;flex:1' }, `⏳ ${t('waitingHost')}`),
      ),
    );
  };

  render(s.state);
  paintFriends();
  const refresh = () => canUseFriends() && void refreshFriends().catch((e) => console.warn(e));
  refresh();
  const friendTimer = window.setInterval(refresh, 20_000);
  const offs = [
    onFriendsChange(paintFriends),
    () => clearInterval(friendTimer),
    s.on('state', paintFriends),
    s.on('state', render),
    s.on('start', () => go('netplay')),
    s.on('closed', onRoomClosed),
  ];
  // Joined while a match is running: watch it.
  if (s.state?.phase === 'playing' && s.lastStart) setTimeout(() => go('netplay'), 0);
  return () => offs.forEach((f) => f());
});
