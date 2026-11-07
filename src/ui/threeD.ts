import { BOT_COLORS, Game, PLAYER_COLORS, TEAM_COLORS, type FighterSpec, type MatchResult } from '../game/game';
import { JoystickManager } from '../game/input';
import { BUILTIN_MAPS } from '../game/maps';
import type { Difficulty } from '../game/types';
import type { WeaponId } from '../game/weapons';
import { t, type Key } from '../i18n';
import { jingle, playMusic } from '../music';
import { save } from '../save';
import { sfx } from '../sfx';
import { confirmBox, h, toast } from './dom';
import { mapThumb, weaponIcon } from './icons';
import { localName } from './lobby';
import { go, register } from './router';
import type { Loop3D } from '../three/loop3d';

/*
 * 3D mode (a tab next to 1D, opened by the Tome Key; offline).
 * It is the normal game with the same camera and point of view, drawn in 3D: round shiny heads that blink and look
 * around, round arms and legs, thick blocks for platforms, real shadows. Its own coins (3D coins) and its own shop
 * with only the 8 weapons the game came out with. The 6 maps from the first version. You against bots.
 */

/** The weapons from the day the game came out (sword and spear were free then too). */
export const THREE_D_WEAPONS: { id: WeaponId; price: number }[] = [
  { id: 'sword', price: 0 },
  { id: 'spear', price: 0 },
  { id: 'hammer', price: 20 },
  { id: 'bow', price: 25 },
  { id: 'boomerang', price: 30 },
  { id: 'bomb', price: 35 },
  { id: 'katana', price: 40 },
  { id: 'snowball', price: 50 },
];
/** The maps from the first version. */
export const THREE_D_MAPS = ['arena', 'sky', 'tower', 'bridge', 'snow', 'pit'];

type Mode3D = 'ffa' | 'team';
interface Setup3D {
  mode: Mode3D;
  mapId: string;
  bots: number;
  difficulty: Difficulty;
}

const maps3D = () => BUILTIN_MAPS.filter((m) => THREE_D_MAPS.includes(m.id));
const coins3D = () => h('div', { class: 'chip coin coin-3d' }, `🧊 ${save.data.threeD.coins} ${t('threeDCoins')}`);
let setup: Setup3D = { mode: 'ffa', mapId: 'arena', bots: 3, difficulty: 'medium' };

/** Bots fighting in the background (3D, no names). */
function demo3D(): Game {
  const map = maps3D()[Math.floor(Math.random() * maps3D().length)];
  const specs: FighterSpec[] = Array.from({ length: 5 }, (_, i) => ({
    name: '',
    color: BOT_COLORS[i],
    team: i,
    human: false,
    weapon: THREE_D_WEAPONS[Math.floor(Math.random() * THREE_D_WEAPONS.length)].id,
    difficulty: i % 2 ? 'hard' : 'medium',
    playerIndex: -1,
  }));
  return new Game(map, specs, { mode: 'ffa', fallMode: 'bounce', demo: true });
}

/** Two stacked canvases: WebGL underneath, a see-through 2D layer on top. */
function canvases(cls: string) {
  const gl = h('canvas', { class: `${cls} three-gl` });
  const hud = h('canvas', { class: `${cls} three-hud` });
  return { gl, hud };
}

register('threeD', (root) => {
  playMusic('oneD');
  const { gl, hud } = canvases('bg-canvas');
  let loop: Loop3D | null = null;
  let dead = false;
  let game = demo3D();
  let restartAt = 0;
  const watch = () => (game.onOver = () => (restartAt = performance.now() + 1500));
  watch();
  void import('../three/loop3d').then(({ startLoop3D }) => {
    if (dead) return;
    loop = startLoop3D(gl, hud, () => {
      if (restartAt && performance.now() > restartAt) {
        restartAt = 0;
        game = demo3D();
        watch();
      }
      return game;
    }, { bare: true });
  });

  const panel = h('div', { class: 'three-panel' });
  const coinsSlot = h('div', {});
  const paintCoins = () => coinsSlot.replaceChildren(coins3D());
  let tab: 'home' | 'play' | 'shop' = 'home';

  const btn3 = (label: string, onclick: () => void, cls = '') => h('button', { class: `btn3d ${cls}`, onclick }, label);

  const paint = () => {
    paintCoins();
    if (tab === 'home') {
      panel.replaceChildren(
        h('h1', { class: 'logo3d' }, h('span', {}, t('title')), h('b', {}, '3D')),
        h('p', { class: 'tagline' }, t('threeDTagline')),
        h(
          'div',
          { class: 'three-buttons' },
          btn3(`⚔️ ${t('play')}`, () => ((tab = 'play'), paint()), 'primary'),
          btn3(`🛒 ${t('shop')}`, () => ((tab = 'shop'), paint()), 'shop'),
          btn3(`← ${t('back')}`, () => go('menu'), 'ghost'),
        ),
        h('p', { class: 'three-note' }, `🧊 ${t('threeDNote')}`),
      );
      return;
    }
    const head = h('div', { class: 'three-head' }, btn3(`← ${t('back')}`, () => ((tab = 'home'), paint()), 'ghost small'), h('h2', {}, tab === 'play' ? `⚔️ ${t('play')} 3D` : `🛒 ${t('shop')} 3D`));
    if (tab === 'shop') {
      panel.replaceChildren(
        head,
        h('p', { class: 'muted' }, t('threeDShopNote')),
        h(
          'div',
          { class: 'three-shop' },
          ...THREE_D_WEAPONS.map((w) => {
            const have = save.data.threeD.owned.includes(w.id);
            const using = save.data.threeD.weapon === w.id;
            const buy = async () => {
              if (save.data.threeD.coins < w.price) return toast(t('notEnough'));
              if (!(await confirmBox(t('threeDConfirm', { name: t(`w.${w.id}` as Key), price: w.price }), t('buy'), t('back')))) return;
              if (save.data.threeD.coins < w.price) return toast(t('notEnough'));
              save.update((d) => {
                d.threeD.coins -= w.price;
                if (!d.threeD.owned.includes(w.id)) d.threeD.owned.push(w.id);
                d.threeD.weapon = w.id;
              });
              sfx.coin();
              paint();
            };
            return h(
              'div',
              { class: `three-card ${have ? 'have' : ''} ${using ? 'using' : ''}` },
              h('div', { class: 'three-icon' }, weaponIcon(w.id, 64)),
              h('b', {}, t(`w.${w.id}` as Key)),
              h('small', { class: 'muted' }, t(`s.${w.id}` as Key)),
              have
                ? btn3(using ? `✓ ${t('oneDUsing')}` : t('oneDUse'), () => (save.update((d) => (d.threeD.weapon = w.id)), paint()), using ? 'primary small' : 'small')
                : btn3(`🧊 ${w.price}`, buy, 'shop small'),
            );
          }),
        ),
      );
      return;
    }
    // Play: mode, map, bots and their level. You fight with the weapon picked in the 3D shop.
    const seg = <T extends string | number>(cur: T, opts: [T, string][], pick: (v: T) => void) =>
      h('div', { class: 'segs' }, ...opts.map(([v, label]) => h('button', { class: `seg ${cur === v ? 'on' : ''}`, onclick: () => (pick(v), paint()) }, label)));
    panel.replaceChildren(
      head,
      h('h3', {}, t('mode')),
      seg<Mode3D>(setup.mode, [['ffa', `🥊 ${t('ffa')}`], ['team', `🤝 ${t('team')}`]], (v) => (setup.mode = v)),
      h('h3', {}, t('map')),
      h(
        'div',
        { class: 'map-row' },
        ...maps3D().map((mp) =>
          h('button', { class: `map-card ${setup.mapId === mp.id ? 'on' : ''}`, onclick: () => ((setup.mapId = mp.id), paint()) }, mapThumb(mp), h('span', {}, t(mp.name as Key))),
        ),
      ),
      h('h3', {}, t('threeDBots')),
      seg<number>(setup.bots, [1, 2, 3, 4, 5].map((n) => [n, String(n)]), (v) => (setup.bots = v)),
      seg<Difficulty>(setup.difficulty, (['easy', 'medium', 'hard'] as Difficulty[]).map((d) => [d, t(d)]), (v) => (setup.difficulty = v)),
      h('p', { class: 'muted' }, `${t('weapon')}: ${t(`w.${save.data.threeD.weapon}` as Key)} · 🧊 ${t('threeDPay', { n: 10 + 5 * setup.bots })}`),
      btn3(`⚔️ ${t('start')}`, () => go('threeDPlay', { ...setup }), 'primary big'),
    );
  };

  root.append(
    gl,
    hud,
    h('div', { class: 'menu three-menu' }, h('div', { class: 'topbar' }, coinsSlot, h('div', { class: 'spacer' })), h('div', { class: 'menu-center' }, panel)),
  );
  paint();
  return () => {
    dead = true;
    loop?.stop();
  };
});

register('threeDPlay', (root, s) => {
  setup = { ...s };
  const map = maps3D().find((m) => m.id === s.mapId) ?? maps3D()[0];
  const { gl, hud } = canvases('game-canvas');
  const overlay = h('div', { class: 'overlay hidden' });
  root.append(h('div', { class: 'play' }, gl, hud, overlay));
  let paused = false;
  let dead = false;
  let loop: Loop3D | null = null;
  let sticks: JoystickManager | null = null;
  let game!: Game;

  const specs = (): FighterSpec[] => {
    const team = s.mode === 'team';
    const me: FighterSpec = { name: localName(0), color: team ? TEAM_COLORS[0] : PLAYER_COLORS[0], team: 0, human: true, weapon: save.data.threeD.weapon, difficulty: 'medium', playerIndex: 0 };
    const bots = Array.from({ length: s.bots }, (_, i): FighterSpec => {
      // Teams: you and every other bot against the rest.
      const tm = team ? (i % 2 ? 0 : 1) : i + 1;
      return {
        name: t('bot', { n: i + 1 }),
        color: team ? TEAM_COLORS[tm] : BOT_COLORS[i],
        team: tm,
        human: false,
        weapon: THREE_D_WEAPONS[Math.floor(Math.random() * THREE_D_WEAPONS.length)].id,
        difficulty: s.difficulty,
        playerIndex: -1,
      };
    });
    return [me, ...bots];
  };

  const showPause = () => {
    if (!game || game.over) return;
    paused = true;
    sfx.click();
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal three-modal' },
        h('h2', {}, `⏸ ${t('pause')}`),
        h('p', { class: 'muted small' }, t('howToText')),
        h('div', { class: 'col gap' }, h('button', { class: 'btn3d primary', onclick: hidePause }, `▶ ${t('resume')}`), h('button', { class: 'btn3d', onclick: () => start() }, `🔄 ${t('restart')}`), h('button', { class: 'btn3d ghost', onclick: () => go('threeD') }, `🚪 ${t('quit')}`)),
      ),
    );
    overlay.classList.remove('hidden');
  };
  const hidePause = () => {
    paused = false;
    overlay.classList.add('hidden');
  };

  const showResult = (r: MatchResult) => {
    const won = r.humanWon;
    const got = won ? 10 + 5 * s.bots : 1;
    save.update((d) => {
      d.threeD.coins += got;
      if (won) d.threeD.wins++;
    });
    if (won) sfx.win();
    jingle(won ? 'victory' : 'defeat');
    const ranked = game.fighters.filter((f) => !f.cloneOf).sort((a, b) => Number(b.alive) - Number(a.alive) || b.kos - a.kos);
    overlay.replaceChildren(
      h(
        'div',
        { class: 'modal result three-modal' },
        h('h2', {}, won ? t('threeDWon') : t('threeDLost')),
        h('p', { class: 'coins-earned' }, `🧊 +${got} ${t('threeDCoins')}`, h('small', {}, ` (${save.data.threeD.coins})`)),
        h('ul', { class: 'scores' }, ...ranked.map((f) => h('li', {}, h('span', { class: 'dot', style: `background:${f.color}` }), h('b', {}, f.name), h('span', { class: 'muted' }, `${f.alive ? '🏆' : '💀'} ${f.kos} KO`)))),
        h('div', { class: 'row gap center' }, h('button', { class: 'btn3d ghost', onclick: () => go('threeD') }, t('menu')), h('button', { class: 'btn3d primary', onclick: () => start() }, `🔄 ${t('playAgain')}`)),
      ),
    );
    overlay.classList.remove('hidden');
  };

  const layout = (w: number, hh: number) => {
    sticks?.layout(w, hh);
    if (sticks) sticks.pauseRect = { x: w / 2 - 26, y: 4, w: 52, h: 46 };
  };

  const start = () => {
    hidePause();
    sticks?.destroy();
    game = new Game(map, specs(), { mode: s.mode, fallMode: save.data.settings.fallMode, juice: save.data.settings.juice });
    game.onOver = showResult;
    game.focus = [0];
    playMusic(map.theme);
    const me = game.fighters[0];
    sticks = new JoystickManager(hud, [{ color: me.color, label: me.name, hp: () => me.hp / me.maxHp }]);
    me.ctrl = sticks.sticks[0].state;
    sticks.onPause = showPause;
    const size = loop?.size();
    if (size?.w) layout(size.w, size.h);
  };
  start();

  void import('../three/loop3d').then(({ startLoop3D }) => {
    if (dead) return;
    loop = startLoop3D(gl, hud, () => game, {
      paused: () => paused,
      onResize: layout,
      overlay: (ctx, w) => {
        sticks?.draw(ctx);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - 22, 8, 44, 38, 10);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(w / 2 - 8, 17, 5, 20);
        ctx.fillRect(w / 2 + 3, 17, 5, 20);
      },
    });
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyP') (paused ? hidePause : showPause)();
  };
  const onHide = () => {
    if (document.hidden && !game.over) showPause();
  };
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    dead = true;
    loop?.stop();
    sticks?.destroy();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
  };
});
