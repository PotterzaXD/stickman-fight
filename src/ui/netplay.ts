import { Game, type MatchResult } from '../game/game';
import { JoystickManager } from '../game/input';
import { t } from '../i18n';
import { ONLINE_SNOWMEN, RoomHost, session, setSession, type NetResult, type StartPayload } from '../net/room';
import { Mirror, encodeSnapshot } from '../net/snapshot';
import { sfx } from '../sfx';
import { h } from './dom';
import { startLoop } from './loop';
import { giveReward, resultTitle } from './play';
import { onRoomClosed } from './roomScreen';
import { go, register } from './router';

const STEP = 1 / 120;

register('netplay', (root) => {
  const s = session();
  if (!s || !s.lastStart) {
    go(s ? 'room' : 'online');
    return;
  }
  const host = s instanceof RoomHost ? s : null;
  let game!: Game;
  let mirror: Mirror | null = null;
  let sticks: JoystickManager | null = null;
  let localIdx: number[] = [];
  let acc = 0;
  let menuOpen = false;

  const canvas = h('canvas', { class: 'game-canvas' });
  const overlay = h('div', { class: 'overlay hidden' });
  const banner = h('div', { class: 'watch-banner hidden' }, `👀 ${t('watching')}`);
  root.append(h('div', { class: 'play' }, canvas, banner, overlay));

  const leave = () => {
    setSession(null);
    go('online');
  };

  const hideOverlay = () => {
    menuOpen = false;
    overlay.classList.add('hidden');
  };

  const showMenu = () => {
    if (menuOpen) return;
    menuOpen = true;
    sfx.click();
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal' },
        h('h2', {}, `${t('room')} ${s.state?.code ?? ''}`),
        h(
          'div',
          { class: 'col gap' },
          h('button', { class: 'btn big primary', onclick: hideOverlay }, `▶ ${t('resume')}`),
          host ? h('button', { class: 'btn', onclick: () => host.toLobby() }, `🏠 ${t('backToRoom')}`) : null,
          h('button', { class: 'btn ghost', onclick: leave }, `🚪 ${t('leave')}`),
        ),
      ),
    );
    overlay.classList.remove('hidden');
  };

  const showResult = (r: Pick<MatchResult, 'mode' | 'winnerTeam' | 'winners'>) => {
    menuOpen = true;
    // Coins only for devices that had someone in this match: win 3-5 (beating the bosses: 500 per boss), otherwise 1.
    // Grandfather Cat: 1,000 coins and the Treasure for every device that played.
    let coinLine: HTMLElement[] = [];
    const bosses = game.bosses.length;
    if (localIdx.length) {
      const won = r.winners.some((f) => localIdx.includes(game.fighters.indexOf(f))) && r.winnerTeam !== 99;
      coinLine = giveReward(r.mode, won, bosses);
      if (won) sfx.win();
    }
    const ranked = [...game.fighters].sort((a, b) => Number(b.alive) - Number(a.alive) || b.kos - a.kos);
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal result' },
        h('h2', {}, resultTitle(r, bosses)),
        ...coinLine,
        h('ul', { class: 'scores' }, ...ranked.map((f) => h('li', {}, h('span', { class: 'dot', style: `background:${f.color}` }), h('b', {}, f.name), h('span', { class: 'muted' }, `${f.alive ? '🏆' : '💀'}${host ? ` ${f.kos} KO` : ''}`)))),
        host
          ? h('div', { class: 'row gap center' }, h('button', { class: 'btn ghost', onclick: () => host.toLobby() }, `🏠 ${t('backToRoom')}`), h('button', { class: 'btn big primary', onclick: () => host.start() }, `🔄 ${t('playAgain')}`))
          : h('div', { class: 'col gap' }, h('p', { class: 'muted' }, `⏳ ${t('waitingHost')}`), h('button', { class: 'btn ghost', onclick: leave }, `🚪 ${t('leave')}`)),
      ),
    );
    overlay.classList.remove('hidden');
  };

  const build = (start: StartPayload) => {
    hideOverlay();
    sticks?.destroy();
    acc = 0;
    game = new Game(start.map, start.specs, {
      mode: start.mode,
      fallMode: start.fallMode,
      maxSnowmen: ONLINE_SNOWMEN,
      record: !!host,
      bossName: t(start.mode === 'cat' ? 'cat_name' : 'boss_name'),
      bosses: start.bosses,
      bossWeapons: start.bossWeapons,
    });
    mirror = host ? null : new Mirror(game);
    if (import.meta.env.DEV) (window as unknown as { __ng: Game }).__ng = game;
    // Joysticks for the players on this device, in joystick order.
    localIdx = start.specs.map((sp, i) => (sp.device === s.device && sp.human ? i : -1)).filter((i) => i >= 0).sort((a, b) => start.specs[a].local - start.specs[b].local);
    sticks = new JoystickManager(
      canvas,
      localIdx.map((i) => ({ color: game.fighters[i].color, label: `P${start.specs[i].local + 1}`, name: game.fighters[i].name, hp: () => game.fighters[i].hp / game.fighters[i].maxHp })),
    );
    if (host) {
      localIdx.forEach((fi, k) => (game.fighters[fi].ctrl = sticks!.sticks[k].state));
      start.specs.forEach((sp, i) => {
        const c = host.remoteCtrl.get(sp.memberId);
        if (c) game.fighters[i].ctrl = c;
      });
      game.onOver = (r) => {
        host.endMatch(r, game.fighters);
        host.sendSnapshot(encodeSnapshot(game));
        showResult(r);
      };
    }
    sticks.onPause = showMenu;
    banner.classList.toggle('hidden', localIdx.length > 0);
    const { w, h: hh } = loop.size();
    if (w) layout(w, hh);
  };

  const layout = (w: number, hh: number) => {
    sticks?.layout(w, hh);
    if (sticks) sticks.pauseRect = { x: w / 2 - 26, y: 4, w: 52, h: 46 };
  };

  const loop = startLoop(canvas, () => game, {
    onResize: layout,
    step: (dt) => {
      if (host) {
        // The host runs the real match (it never pauses: other people are playing).
        acc += dt;
        while (acc >= STEP) {
          game.update(STEP);
          acc -= STEP;
        }
        if (host.leftIds.length) {
          for (const id of host.leftIds) {
            const i = host.lastStart?.specs.findIndex((sp) => sp.memberId === id) ?? -1;
            if (i >= 0 && game.fighters[i]) game.handToBot(game.fighters[i]);
          }
          host.leftIds = [];
        }
      } else mirror?.tick(dt);
    },
    overlay: (ctx, w) => {
      sticks?.draw(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 22, 8, 44, 38, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 20px "Baloo 2", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☰', w / 2, 34);
    },
  });
  build(s.lastStart);

  // Host: send the match to everyone 20 times a second. Joining device: send joysticks 30 times a second.
  const timer = host
    ? window.setInterval(() => host.sendSnapshot(encodeSnapshot(game)), 50)
    : window.setInterval(() => {
        if (!sticks || !localIdx.length || s.role !== 'client') return;
        const n = Math.max(...localIdx.map((i) => s.lastStart!.specs[i].local)) + 1;
        const ctrls = Array.from({ length: n }, () => ({ x: 0, y: 0, active: false }));
        localIdx.forEach((fi, k) => (ctrls[s.lastStart!.specs[fi].local] = sticks!.sticks[k].state));
        s.sendInput(ctrls);
      }, 33);

  const offs = [
    s.on('start', (st) => build(st)),
    s.on('snapshot', (snap) => mirror?.apply(snap)),
    s.on('over', (r: NetResult) => showResult({ mode: r.mode, winnerTeam: r.winnerTeam, winners: r.winners.map((i) => game.fighters[i]).filter(Boolean) })),
    s.on('state', (st) => st.phase === 'lobby' && go('room')),
    s.on('closed', onRoomClosed),
  ];
  const noMenu = (e: Event) => e.preventDefault();
  canvas.addEventListener('contextmenu', noMenu);

  return () => {
    loop.stop();
    sticks?.destroy();
    clearInterval(timer);
    offs.forEach((f) => f());
  };
});
