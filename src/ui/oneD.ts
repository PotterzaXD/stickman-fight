import { t, type Key } from '../i18n';
import { playMusic } from '../music';
import { save } from '../save';
import { sfx } from '../sfx';
import { confirmBox, h, toast } from './dom';
import { go, register } from './router';

/*
 * 1D (a small tab that opens with the Tome Key, offline only): everything happens on one line.
 * Stickmen are coloured segments that only move left and right (no jumping); a weapon is a thinner segment
 * sticking out in front, and a stickman gets shorter as it loses HP. Knock someone off either end of the line
 * and they're out. It has its own coins (1D coins) and its own shop: the sword is free; the spear, hammer
 * and axe are bought with 1D coins. Nothing here touches the normal game's coins.
 */

type OneDWeapon = 'sword' | 'spear' | 'hammer' | 'axe';
interface WDef {
  id: OneDWeapon;
  price: number;
  /** How far it reaches past the body, its damage, seconds between hits, knockback, and seconds between skills. */
  reach: number;
  dmg: number;
  every: number;
  push: number;
  skillCd: number;
  color: string;
}

export const ONE_D_WEAPONS: WDef[] = [
  { id: 'sword', price: 0, reach: 40, dmg: 12, every: 0.4, push: 260, skillCd: 3, color: '#cfd8dc' },
  { id: 'spear', price: 40, reach: 75, dmg: 10, every: 0.5, push: 220, skillCd: 3, color: '#a1887f' },
  { id: 'hammer', price: 80, reach: 32, dmg: 20, every: 0.75, push: 420, skillCd: 5, color: '#757575' },
  { id: 'axe', price: 120, reach: 46, dmg: 15, every: 0.5, push: 300, skillCd: 4, color: '#ef6c00' },
];
const wdef = (id: string) => ONE_D_WEAPONS.find((w) => w.id === id) ?? ONE_D_WEAPONS[0];

const LINE = 1000;
const HP = 100;
const SPEED = 260;
const COLORS = ['#42a5f5', '#ef5350', '#66bb6a', '#ffca28'];

interface Dot {
  name: string;
  color: string;
  x: number;
  vx: number;
  facing: number;
  hp: number;
  alive: boolean;
  w: WDef;
  human: boolean;
  hitCd: number;
  skillCd: number;
  /** Showing a swing / a skill (seconds left). */
  swingT: number;
  thrustT: number;
  stun: number;
  think: number;
  want: number;
}

/** A thrown axe flying along the line (and back). */
interface Shot {
  owner: Dot;
  x: number;
  v: number;
  t: number;
  hit: Set<Dot>;
}

register('oneD', (root) => {
  playMusic('oneD');
  let tab: 'play' | 'shop' = 'play';
  let bots = 1;
  const body = h('div', { class: 'page-body' });
  const coins = h('div', { class: 'chip coin' });
  const paintCoins = () => (coins.textContent = `● ${save.data.oneD.coins} ${t('oneDCoins')}`);
  let stopMatch: (() => void) | null = null;

  const paint = () => {
    paintCoins();
    stopMatch?.();
    stopMatch = null;
    const tabs = h(
      'div',
      { class: 'segs' },
      h('button', { class: `seg ${tab === 'play' ? 'on' : ''}`, onclick: () => ((tab = 'play'), paint()) }, `— ${t('play')}`),
      h('button', { class: `seg ${tab === 'shop' ? 'on' : ''}`, onclick: () => ((tab = 'shop'), paint()) }, `— ${t('shop')}`),
    );
    if (tab === 'shop') {
      body.replaceChildren(
        h(
          'section',
          {},
          tabs,
          h('p', { class: 'muted' }, t('oneDShopNote')),
          h(
            'div',
            { class: 'shop-grid' },
            ...ONE_D_WEAPONS.map((w) => {
              const have = save.data.oneD.owned.includes(w.id);
              const using = save.data.oneD.weapon === w.id;
              const buy = async () => {
                if (save.data.oneD.coins < w.price) return toast(t('notEnough'));
                if (!(await confirmBox(t('oneDConfirm', { name: t(`w.${w.id}` as Key), price: w.price }), t('buy'), t('back')))) return;
                if (save.data.oneD.coins < w.price) return toast(t('notEnough'));
                save.update((d) => {
                  d.oneD.coins -= w.price;
                  if (!d.oneD.owned.includes(w.id)) d.oneD.owned.push(w.id);
                  d.oneD.weapon = w.id;
                });
                sfx.coin();
                paint();
              };
              return h(
                'div',
                { class: `shop-card ${have ? 'have' : ''}` },
                h('div', { class: 'shop-icon' }, lineIcon(w)),
                h('h3', {}, t(`w.${w.id}` as Key)),
                h('small', { class: 'muted' }, t(`oneD.${w.id}` as Key)),
                have
                  ? h(
                      'button',
                      { class: `btn ${using ? 'primary' : ''}`, disabled: using, onclick: () => (save.update((d) => (d.oneD.weapon = w.id)), paint()) },
                      using ? `✓ ${t('oneDUsing')}` : t('oneDUse'),
                    )
                  : h('button', { class: 'btn primary', onclick: buy }, `● ${w.price}`),
              );
            }),
          ),
        ),
      );
      return;
    }
    body.replaceChildren(
      h(
        'section',
        {},
        tabs,
        h('p', { class: 'muted' }, t('oneDDesc')),
        h(
          'div',
          { class: 'row gap wrap' },
          h('b', {}, `🤖 ${t('oneDBots')}`),
          h('div', { class: 'segs' }, ...[1, 2, 3].map((n) => h('button', { class: `seg ${bots === n ? 'on' : ''}`, onclick: () => ((bots = n), paint()) }, String(n)))),
        ),
        h('p', {}, `${t('weapon')}: `, h('b', {}, t(`w.${save.data.oneD.weapon}` as Key))),
        h('small', { class: 'muted' }, `🏆 ${t('oneDWins', { n: save.data.oneD.wins })}`),
        h('div', { class: 'row center' }, h('button', { class: 'btn big primary', onclick: () => (stopMatch = match(body, bots, () => paint())) }, `— ${t('start')} —`)),
      ),
    );
  };

  root.append(
    h(
      'div',
      { class: 'page one-d' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `🗝️ ${t('oneD')}`), coins),
      body,
    ),
  );
  paint();
  return () => stopMatch?.();
});

/** The weapon drawn as a line (for the shop). */
function lineIcon(w: WDef): HTMLCanvasElement {
  const c = h('canvas', { width: 128, height: 64, style: 'width:64px;height:32px' });
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(10, 30, 120, 2);
  ctx.fillStyle = '#42a5f5';
  ctx.fillRect(16, 26, 34, 10);
  ctx.fillStyle = w.color;
  ctx.fillRect(50, 29, Math.min(76, w.reach), w.id === 'hammer' ? 8 : 4);
  return c;
}

/** One match on the line. Returns a function that stops it. */
function match(body: HTMLElement, botCount: number, done: () => void): () => void {
  const canvas = h('canvas', { class: 'one-d-canvas' });
  const result = h('div', { class: 'one-d-result' });
  const hold = { left: false, right: false };
  let attack = false;
  let skill = false;
  const press = (k: 'left' | 'right' | 'attack' | 'skill', on: boolean) => {
    if (k === 'left' || k === 'right') hold[k] = on;
    else if (on && k === 'attack') attack = true;
    else if (on && k === 'skill') skill = true;
  };
  const pad = (k: 'left' | 'right' | 'attack' | 'skill', label: string) => {
    const b = h('button', { class: 'btn one-d-pad' }, label);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      press(k, true);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => press(k, false));
    return b;
  };
  body.replaceChildren(
    h(
      'section',
      {},
      canvas,
      result,
      h('div', { class: 'row between one-d-pads' }, h('div', { class: 'row gap' }, pad('left', '◀'), pad('right', '▶')), h('div', { class: 'row gap' }, pad('attack', '—'), pad('skill', '═'))),
      h('small', { class: 'muted' }, t('oneDKeys')),
    ),
  );
  const onKey = (e: KeyboardEvent, on: boolean) => {
    const map: Record<string, 'left' | 'right' | 'attack' | 'skill'> = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      Space: 'attack',
      KeyJ: 'attack',
      KeyK: 'skill',
      ShiftLeft: 'skill',
    };
    const k = map[e.code];
    if (!k) return;
    e.preventDefault();
    press(k, on);
  };
  const down = (e: KeyboardEvent) => onKey(e, true);
  const up = (e: KeyboardEvent) => onKey(e, false);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  const dots: Dot[] = [];
  const n = botCount + 1;
  for (let i = 0; i < n; i++) {
    const human = i === 0;
    const w = human ? wdef(save.data.oneD.weapon) : ONE_D_WEAPONS[Math.floor(Math.random() * ONE_D_WEAPONS.length)];
    const x = 150 + ((LINE - 300) * i) / Math.max(1, n - 1);
    dots.push({
      name: human ? save.data.name || t('player', { n: 1 }) : t('bot', { n: i }),
      color: COLORS[i],
      x,
      vx: 0,
      facing: x < LINE / 2 ? 1 : -1,
      hp: HP,
      alive: true,
      w,
      human,
      hitCd: 0,
      skillCd: 1,
      swingT: 0,
      thrustT: 0,
      stun: 0,
      think: 0,
      want: 0,
    });
  }
  const shots: Shot[] = [];
  let over = false;
  let raf = 0;
  let last = performance.now();
  const len = (d: Dot) => 8 + 26 * Math.max(0, d.hp / HP);

  const hit = (a: Dot, b: Dot, dmg: number, push: number) => {
    if (!b.alive) return;
    b.hp -= dmg;
    b.vx += Math.sign(b.x - a.x || a.facing) * push;
    b.stun = 0.15;
    sfx.click();
    if (b.hp <= 0) out(b);
  };
  const out = (d: Dot) => {
    d.alive = false;
    d.hp = 0;
  };
  const reachHit = (a: Dot, reach: number, dmg: number, push: number) => {
    for (const b of dots) {
      if (b === a || !b.alive) continue;
      const dx = (b.x - a.x) * a.facing;
      if (dx > 0 && dx < len(a) / 2 + reach + len(b) / 2) hit(a, b, dmg, push);
    }
  };
  const doAttack = (d: Dot) => {
    if (d.hitCd > 0 || d.stun > 0) return;
    d.hitCd = d.w.every;
    d.swingT = 0.15;
    reachHit(d, d.w.reach, d.w.dmg, d.w.push);
  };
  const doSkill = (d: Dot) => {
    if (d.skillCd > 0 || d.stun > 0) return;
    d.skillCd = d.w.skillCd;
    d.thrustT = 0.25;
    switch (d.w.id) {
      case 'sword':
        // Dash: a quick rush forward, hitting on the way.
        d.vx = d.facing * 900;
        reachHit(d, d.w.reach + 60, 22, 380);
        break;
      case 'spear':
        // Thrust: twice as far.
        reachHit(d, d.w.reach * 2, 24, 360);
        break;
      case 'hammer':
        // Slam: both sides.
        for (const b of dots) if (b !== d && b.alive && Math.abs(b.x - d.x) < 110) hit(d, b, 28, 520);
        break;
      case 'axe':
        shots.push({ owner: d, x: d.x + d.facing * 20, v: d.facing * 700, t: 0, hit: new Set() });
        break;
    }
  };

  const ctx = canvas.getContext('2d')!;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!over) step(dt);
    draw();
  };
  const step = (dt: number) => {
    for (const d of dots) {
      if (!d.alive) continue;
      d.hitCd -= dt;
      d.skillCd -= dt;
      d.swingT -= dt;
      d.thrustT -= dt;
      d.stun -= dt;
      let move = 0;
      if (d.human) {
        move = (hold.right ? 1 : 0) - (hold.left ? 1 : 0);
        if (attack) doAttack(d);
        if (skill) doSkill(d);
      } else {
        // A simple bot: go for the closest one, hit when in reach, step back now and then.
        d.think -= dt;
        const foe = dots.filter((o) => o !== d && o.alive).sort((a, b) => Math.abs(a.x - d.x) - Math.abs(b.x - d.x))[0];
        if (foe) {
          const dist = Math.abs(foe.x - d.x) - len(d) / 2 - len(foe) / 2;
          if (d.think <= 0) {
            d.think = 0.25 + Math.random() * 0.3;
            d.want = dist > d.w.reach * 0.8 ? Math.sign(foe.x - d.x) : Math.random() < 0.25 ? -Math.sign(foe.x - d.x) : 0;
            // Don't walk off the end.
            if ((d.x < 60 && d.want < 0) || (d.x > LINE - 60 && d.want > 0)) d.want = 0;
          }
          move = d.want;
          if (Math.sign(foe.x - d.x)) d.facing = Math.sign(foe.x - d.x);
          if (dist < d.w.reach && Math.random() < dt * 4) doAttack(d);
          if (dist < d.w.reach * (d.w.id === 'spear' ? 2 : d.w.id === 'axe' ? 8 : 1.5) && Math.random() < dt * 0.8) doSkill(d);
        }
      }
      if (move && d.stun <= 0) d.facing = Math.sign(move);
      const target = d.stun > 0 ? d.vx : move * SPEED;
      d.vx += (target - d.vx) * Math.min(1, dt * (d.stun > 0 ? 2 : 12));
      d.x += d.vx * dt;
      // Bodies can't pass through each other on a line.
      for (const o of dots) {
        if (o === d || !o.alive) continue;
        const gap = (len(d) + len(o)) / 2;
        if (Math.abs(o.x - d.x) < gap) d.x = o.x - Math.sign(o.x - d.x || -d.facing) * gap;
      }
      // Off either end: out.
      if (d.x < -20 || d.x > LINE + 20) out(d);
    }
    attack = false;
    skill = false;
    for (const s of shots) {
      s.t += dt;
      if (s.t > 0.5) s.v = Math.sign(s.owner.x - s.x) * 800;
      s.x += s.v * dt;
      for (const b of dots) {
        if (b === s.owner || !b.alive || s.hit.has(b) || Math.abs(b.x - s.x) > len(b) / 2 + 6) continue;
        s.hit.add(b);
        hit(s.owner, b, 20, 300);
      }
    }
    for (let i = shots.length - 1; i >= 0; i--) if ((shots[i].t > 0.5 && Math.abs(shots[i].x - shots[i].owner.x) < 20) || shots[i].t > 3) shots.splice(i, 1);
    const alive = dots.filter((d) => d.alive);
    const me = dots[0];
    if (!me.alive || alive.length <= 1) finish(me.alive);
  };
  const finish = (won: boolean) => {
    over = true;
    const got = won ? 10 + 5 * botCount : 1;
    save.update((d) => {
      d.oneD.coins += got;
      if (won) d.oneD.wins++;
    });
    if (won) sfx.win();
    result.replaceChildren(
      h('h2', {}, won ? t('oneDWon') : t('oneDLost')),
      h('p', {}, `● +${got} ${t('oneDCoins')}`),
      h('div', { class: 'row gap center' }, h('button', { class: 'btn big primary', onclick: done }, t('ok'))),
    );
  };
  const draw = () => {
    const W = canvas.clientWidth || 600;
    const H = canvas.clientHeight || 200;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);
    const k = (W - 40) / LINE;
    const y = Math.round(H / 2);
    const X = (x: number) => 20 + x * k;
    // The line (the whole world).
    ctx.fillStyle = '#555';
    ctx.fillRect(X(0), y - 1, LINE * k, 2);
    for (const d of dots) {
      if (!d.alive) continue;
      const l = len(d) * k;
      ctx.fillStyle = d.color;
      ctx.fillRect(X(d.x) - l / 2, y - 4, l, 8);
      // The weapon: a thinner line in front (longer during a skill).
      const r = d.w.reach * k * (d.thrustT > 0 && d.w.id === 'spear' ? 2 : 1);
      ctx.fillStyle = d.swingT > 0 || d.thrustT > 0 ? '#ffffff' : d.w.color;
      if (d.w.id !== 'axe' || !shots.some((s) => s.owner === d)) ctx.fillRect(d.facing > 0 ? X(d.x) + l / 2 : X(d.x) - l / 2 - r, y - (d.w.id === 'hammer' ? 3 : 2), r, d.w.id === 'hammer' ? 6 : 4);
      if (d.thrustT > 0 && d.w.id === 'hammer') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(X(d.x) - 110 * k, y - 1, 220 * k, 2);
      }
    }
    for (const s of shots) {
      ctx.fillStyle = '#ef6c00';
      ctx.fillRect(X(s.x) - 6, y - 2, 12, 4);
    }
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };
}
