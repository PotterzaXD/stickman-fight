import { DISH, DISHES, DRIVE, ITEM, ITEMS, KITCHEN_SLOTS, STAFF, STATION_ICON, TABLE_SLOTS, DECOR_SLOTS, decorBonus, needs, rating, rewardPool, type ChefSave, type Dish, type Item, type ItemKind, type StaffKind, type Step } from '../chef/data';
import { DECOR_Y, chefView, decorX, drawPeople, drawRoom, drawTickets } from '../chef/draw';
import { ChefDay, KITCHEN_X, SLOT_W, TABLE_W, WORLD, stationX, tableX, type DayResult } from '../chef/sim';
import { t, type Key } from '../i18n';
import { jingle, playMusic } from '../music';
import { save } from '../save';
import { sfx } from '../sfx';
import { confirmBox, h, toast } from './dom';
import { go, register } from './router';

/*
 * Stick Chef: run a restaurant. Its money is Chef cash, kept apart from the Stickman Fight coins.
 */

type Tab = 'home' | 'build' | 'staff' | 'menu' | 'reviews';

const chef = () => save.data.chef;
const cashChip = () => h('div', { class: 'chip coin chef-cash' }, `💵 ${chef().cash}`);
const dishName = (d: Dish | string) => {
  const dish = typeof d === 'string' ? DISH[d] : d;
  if (!dish) return '?';
  return dish.kids ? t('chefKidsMeal', { name: t(`dish.${dish.kids}` as Key) }) : t(`dish.${dish.id}` as Key);
};
const itemName = (i: Item) => t(`chefItem.${i.id}` as Key);
const starText = (s: number) => '⭐'.repeat(Math.floor(s)) + (s % 1 >= 0.5 ? '½' : '');

register('chef', (root, arg) => {
  let tab: Tab = arg?.tab ?? 'home';
  const page = h('div', { class: 'page chef-page' });
  root.append(page);
  const paint = () => {
    page.replaceChildren(
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('funModes') }, `← ${t('back')}`), h('h2', {}, `👨‍🍳 ${t('stickChef')}`), cashChip()),
      h(
        'div',
        { class: 'segs td-tabs chef-tabs' },
        ...(['home', 'build', 'staff', 'menu', 'reviews'] as Tab[]).map((id) =>
          h('button', { class: `seg ${tab === id ? 'on' : ''}`, onclick: () => ((tab = id), paint()) }, t(`chefTab.${id}` as Key)),
        ),
      ),
      h('div', { class: 'page-body chef-body' }, ...(tab === 'home' ? homeTab(paint) : tab === 'build' ? buildTab(paint) : tab === 'staff' ? staffTab(paint) : tab === 'menu' ? menuTab() : reviewsTab())),
    );
  };
  paint();
  let stop = () => {};
  // The Build tab draws the restaurant; keep it animated.
  const tick = () => {
    const c = page.querySelector('canvas.chef-build') as HTMLCanvasElement | null;
    if (c) paintBuild(c);
    raf = requestAnimationFrame(tick);
  };
  let raf = requestAnimationFrame(tick);
  stop = () => cancelAnimationFrame(raf);
  return () => stop();
});

// ---------- Home ----------

function homeTab(repaint: () => void): HTMLElement[] {
  const c = chef();
  const r = rating(c);
  const canDrive = c.day >= DRIVE.day && !c.drive;
  return [
    h(
      'section',
      { class: 'chef-card' },
      h('h3', {}, t('chefDay', { n: c.day })),
      h('p', {}, `${t('chefRating')}: ${starText(Math.round(r * 2) / 2)} (${r.toFixed(1)})`),
      h('p', { class: 'muted' }, t('chefStats', { served: c.served, dishes: c.dishes.length })),
      h('button', { class: 'btn big primary', onclick: () => go('chefDay') }, `▶ ${t('chefStart', { n: c.day })}`),
      h('small', { class: 'muted' }, t('chefHow')),
    ),
    canDrive
      ? h(
          'section',
          { class: 'chef-card chef-drive' },
          h('b', {}, `🚗 ${t('chefDriveReady')}`),
          h('button', { class: 'btn primary', onclick: () => buy(DRIVE.price, () => (chef().drive = true), repaint) }, t('chefBuild', { n: DRIVE.price })),
        )
      : !c.drive
        ? h('p', { class: 'muted' }, `🚗 ${t('chefDriveLocked', { n: DRIVE.day })}`)
        : h('p', { class: 'muted' }, `🚗 ${t('chefDriveOn')}`),
  ];
}

function buy(price: number, apply: () => void, repaint: () => void): boolean {
  if (chef().cash < price) {
    toast(t('chefNoCash'));
    return false;
  }
  save.update((d) => {
    d.chef.cash -= price;
    apply();
  });
  sfx.coin();
  repaint();
  return true;
}

// ---------- Build ----------

function paintBuild(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const hh = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
  if (canvas.height !== Math.round(hh * dpr)) canvas.height = Math.round(hh * dpr);
  const v = chefView(w, hh);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(0, 0, w, hh);
  ctx.setTransform(dpr * v.z, 0, 0, dpr * v.z, dpr * v.ox, dpr * v.oy);
  drawRoom(ctx, chef(), performance.now() / 1000, true);
}

/** Which build slot is at this spot on the Build canvas. */
function slotAt(canvas: HTMLCanvasElement, cx: number, cy: number): { kind: ItemKind; i: number } | null {
  const v = chefView(canvas.clientWidth, canvas.clientHeight);
  const x = (cx - v.ox) / v.z;
  const y = (cy - v.oy) / v.z;
  const F = WORLD.floor;
  if (Math.abs(y - DECOR_Y) < 50) for (let i = 0; i < DECOR_SLOTS; i++) if (Math.abs(x - decorX(i)) < TABLE_W / 2) return { kind: 'decor', i };
  if (y > F - 200 && y < F + 30) {
    for (let i = 0; i < KITCHEN_SLOTS; i++) if (Math.abs(x - stationX(i)) < SLOT_W / 2) return { kind: 'station', i };
    for (let i = 0; i < TABLE_SLOTS; i++) if (Math.abs(x - tableX(i)) < TABLE_W / 2) return { kind: 'table', i };
  }
  return null;
}

const slotsOf = (c: ChefSave, kind: ItemKind) => (kind === 'station' ? c.kitchen : kind === 'table' ? c.tables : c.decor);

function buildTab(repaint: () => void): HTMLElement[] {
  const canvas = h('canvas', { class: 'chef-build' }) as HTMLCanvasElement;
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const s = slotAt(canvas, e.clientX - r.left, e.clientY - r.top);
    if (s) slotSheet(s.kind, s.i, repaint);
  });
  const c = chef();
  return [
    h('p', { class: 'muted' }, t('chefBuildHint'), ' ', h('b', {}, t('chefDecorNow', { n: `+${decorBonus(c).toFixed(2)}` }))),
    canvas,
  ];
}

/** Tapped a build slot: buy something for it, or sell what's there. */
function slotSheet(kind: ItemKind, i: number, repaint: () => void) {
  const c = chef();
  const cur = slotsOf(c, kind)[i];
  const close = () => wrap.remove();
  const set = (id: string | null) => (d: typeof save.data) => (slotsOf(d.chef, kind)[i] = id);
  const items = ITEMS.filter((it) => it.kind === kind);
  const wrap: HTMLElement = h(
    'div',
    { class: 'modal-wrap', onclick: (e: Event) => e.target === wrap && close() },
    h(
      'div',
      { class: 'modal chef-sheet' },
      h('h2', {}, cur ? `${ITEM[cur].icon} ${itemName(ITEM[cur])}` : t(`chefSlot.${kind}` as Key)),
      cur
        ? h(
            'button',
            {
              class: 'btn',
              onclick: () => {
                const back = Math.floor(ITEM[cur].price / 2);
                save.update((d) => {
                  set(null)(d);
                  d.chef.cash += back;
                });
                sfx.coin();
                close();
                repaint();
              },
            },
            t('chefSell', { n: Math.floor(ITEM[cur].price / 2) }),
          )
        : null,
      h(
        'div',
        { class: 'chef-items' },
        ...items
          .filter((it) => it.id !== cur)
          .map((it) =>
            h(
              'button',
              {
                class: 'chef-item',
                onclick: () => {
                  // Swapping: what was there is sold for half.
                  const back = cur ? Math.floor(ITEM[cur].price / 2) : 0;
                  if (chef().cash + back < it.price) return toast(t('chefNoCash'));
                  save.update((d) => {
                    d.chef.cash += back - it.price;
                    set(it.id)(d);
                  });
                  sfx.coin();
                  close();
                  repaint();
                },
              },
              h('span', { class: 'chef-item-icon' }, it.icon),
              h('b', {}, itemName(it)),
              h('small', {}, `💵 ${it.price}${it.stars ? ` · +${it.stars}⭐` : ''}`),
            ),
          ),
      ),
      h('button', { class: 'btn ghost', onclick: close }, t('close')),
    ),
  );
  document.body.append(wrap);
}

// ---------- Staff ----------

function staffTab(repaint: () => void): HTMLElement[] {
  const c = chef();
  return [
    h('p', { class: 'muted' }, t('chefStaffHint')),
    ...(Object.keys(STAFF) as StaffKind[]).map((k) => {
      const have = c.staff[k];
      const price = STAFF[k][have];
      return h(
        'section',
        { class: 'chef-card' },
        h('h3', {}, `${k === 'waiter' ? '🤵' : '👨‍🍳'} ${t(`chefStaff.${k}` as Key)} ×${have}`),
        h('p', { class: 'muted' }, t(`chefStaffDesc.${k}` as Key)),
        price === undefined
          ? h('b', {}, t('chefStaffFull'))
          : h('button', { class: 'btn primary', onclick: () => buy(price, () => (chef().staff[k] = have + 1), repaint) }, t('chefHire', { n: price })),
      );
    }),
  ];
}

// ---------- Menu and reviews ----------

function menuTab(): HTMLElement[] {
  const c = chef();
  const have = new Set(c.kitchen.filter(Boolean));
  return [
    h('p', { class: 'muted' }, t('chefMenuHint')),
    h(
      'div',
      { class: 'chef-items' },
      ...DISHES.map((d) => {
        const own = c.dishes.includes(d.id);
        const missing = needs(d).filter((s) => !have.has(s));
        return h(
          'div',
          { class: `chef-item ${own ? '' : 'locked'}` },
          h('span', { class: 'chef-item-icon' }, own ? (d.kids ? `🧸${d.icon}` : d.icon) : '❓'),
          h('b', {}, own ? dishName(d) : '???'),
          own ? h('small', {}, `💵 ${d.price} · ${d.steps.map((s) => STATION_ICON[s.station]).join(' ')}`) : h('small', { class: 'muted' }, t('chefLocked')),
          own && missing.length ? h('small', { class: 'chef-warn' }, t('chefNeeds', { list: missing.map((s) => `${STATION_ICON[s]} ${t(`chefItem.${s}` as Key)}`).join(', ') })) : null,
        );
      }),
    ),
  ];
}

function reviewsTab(): HTMLElement[] {
  const list = [...chef().reviews].reverse();
  if (!list.length) return [h('p', { class: 'muted' }, t('chefNoReviews'))];
  return [
    h(
      'div',
      { class: 'chef-reviews' },
      ...list.map((r) =>
        h(
          'div',
          { class: 'chef-review' },
          h('b', {}, `${starText(r.stars)} ${r.vip ? '🎩 ' : ''}${DISH[r.dish]?.icon ?? ''}`),
          h('p', {}, reviewLine(r.stars, r.n, !!r.vip)),
          h('small', { class: 'muted' }, t('chefDay', { n: r.day })),
        ),
      ),
    ),
  ];
}

const REVIEW_COUNT = 4;
function reviewLine(stars: number, n: number, vip: boolean): string {
  const band = stars >= 4.5 ? 5 : stars >= 3.5 ? 4 : stars >= 2.5 ? 3 : stars >= 1.5 ? 2 : 1;
  return t(`chefReview.${vip ? 'vip' : ''}${band}.${n % REVIEW_COUNT}` as Key);
}

// ---------- A day in the restaurant ----------

register('chefDay', (root) => {
  playMusic('kitchen');
  const day = new ChefDay(structuredClone(chef()));
  const canvas = h('canvas', { class: 'game-canvas chef-canvas' }) as HTMLCanvasElement;
  const timer = h('b', { class: 'chef-timer' });
  const earned = h('b', { class: 'chef-earned' });
  const hint = h('div', { class: 'chef-hint' }, day.save.day === 1 ? t('chefFirstHint') : '');
  const overlay = h('div', { class: 'chef-overlay hidden' });
  let paused = false;
  const quit = async () => {
    paused = true;
    if (await confirmBox(t('chefQuitConfirm'), t('chefQuit'), t('chefStay'))) go('chef');
    else paused = false;
  };
  root.append(
    h(
      'div',
      { class: 'play chef-play' },
      canvas,
      h('div', { class: 'chef-hud' }, h('button', { class: 'btn small ghost', onclick: () => void quit() }, '✖'), timer, earned),
      hint,
      overlay,
    ),
  );
  if (day.save.day === 1) setTimeout(() => hint.classList.add('fade'), 9000);

  day.onSound = (s) => (s === 'cash' ? sfx.coin() : s === 'angry' ? sfx.block() : s === 'ding' ? sfx.chime() : s === 'bell' ? sfx.jump() : sfx.click());
  day.onHint = (k) => toast(t(`chefHint.${k}` as Key));
  day.onCook = (step, dish, done) => miniGame(overlay, step, dish, done);

  const ctx = canvas.getContext('2d')!;
  let dpr = 1;
  let w = 0;
  let hh = 0;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = canvas.clientWidth;
    hh = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hh * dpr);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  canvas.addEventListener('pointerdown', (e) => {
    if (day.over || paused || !overlay.classList.contains('hidden')) return;
    const r = canvas.getBoundingClientRect();
    const v = chefView(w, hh);
    const x = (e.clientX - r.left - v.ox) / v.z;
    const y = (e.clientY - r.top - v.oy) / v.z;
    const F = WORLD.floor;
    // A guest (or their order bubble) at a table, or a car at the drive-thru window
    const g = day.guests.find((g) => g.state !== 'walkin' && g.state !== 'leaving' && Math.abs(g.x - x) < 40 && y > F - 190 && y < F + 10);
    if (g) return day.tapGuest(g);
    const car = day.cars[0];
    if (car && x < KITCHEN_X && y > F - 200) return day.tapGuest(car);
    if (y > F - 210 && y < F + 20 && x > KITCHEN_X && x < KITCHEN_X + KITCHEN_SLOTS * SLOT_W) {
      const slot = Math.floor((x - KITCHEN_X) / SLOT_W);
      if (day.save.kitchen[slot]) return day.tapStation(slot);
    }
    day.tapFloor(x);
  });

  let last = performance.now();
  let raf = 0;
  let ended = false;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) day.update(dt);
    const left = Math.ceil(day.left);
    timer.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}${day.rush ? ` 🔥 ${t('chefRush')}` : ''}`;
    earned.textContent = `💵 +${day.result.cash}`;
    // Draw
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, w, hh);
    const v = chefView(w, hh);
    ctx.setTransform(dpr * v.z, 0, 0, dpr * v.z, dpr * v.ox, dpr * v.oy);
    drawRoom(ctx, day.save, now / 1000, false, day.hintStation(), day.stationBusy);
    drawPeople(ctx, day, now / 1000);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTickets(ctx, day, w);
    if (day.over && !ended) {
      ended = true;
      endOfDay(overlay, day.result);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
});

// ---------- mini-games ----------

/** Cook one step: a mini-game over the restaurant. The day keeps going while you cook! */
function miniGame(overlay: HTMLElement, step: Step, dish: Dish, done: (q: number) => void) {
  overlay.classList.remove('hidden');
  let finished = false;
  let raf = 0;
  const finish = (q: number) => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    const word = q >= 0.85 ? t('chefPerfect') : q >= 0.6 ? t('chefGood') : q >= 0.3 ? t('chefOk') : t('chefBurnt');
    overlay.replaceChildren(h('div', { class: 'chef-mg chef-result' }, h('h2', {}, word)));
    if (q >= 0.6) sfx.coin();
    else sfx.block();
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.replaceChildren();
      done(q);
    }, 550);
  };
  const title = h('h3', {}, `${STATION_ICON[step.station]} ${dish.icon} ${t(`chefGame.${step.game}.${step.station}` as Key)}`);
  if (step.game === 'stack') {
    const items = step.items ?? [];
    const decoys = ['🧅', '🥕', '🍌', '🧄', '🌶️', '🥚', '🍫', '🧈'].filter((x) => !items.includes(x)).slice(0, 2);
    const pool = [...new Set([...items, ...decoys])].sort(() => Math.random() - 0.5);
    let next = 0;
    let mistakes = 0;
    const start = performance.now();
    const order = h('div', { class: 'chef-order' }, ...items.map((it) => h('span', {}, it)));
    const btns = h(
      'div',
      { class: 'chef-pick' },
      ...pool.map((it) =>
        h(
          'button',
          {
            class: 'chef-ing',
            onclick: (e: Event) => {
              if (it === items[next]) {
                order.children[next].classList.add('ok');
                next++;
                if (next >= items.length) {
                  const secs = (performance.now() - start) / 1000;
                  finish(Math.max(0.15, 1 - mistakes * 0.22 - Math.max(0, secs - items.length * 0.9) * 0.05));
                }
              } else {
                mistakes++;
                (e.currentTarget as HTMLElement).classList.add('bad');
                setTimeout(() => (e.currentTarget as HTMLElement).classList.remove('bad'), 250);
              }
            },
          },
          it,
        ),
      ),
    );
    overlay.replaceChildren(h('div', { class: 'chef-mg' }, title, h('p', { class: 'muted' }, t('chefStackHint')), order, btns));
    return;
  }
  // Timing and pour: a bar with a green zone.
  const zone = step.zone ?? 0.2;
  const center = step.game === 'pour' ? 0.62 + Math.random() * 0.2 : 0.3 + Math.random() * 0.45;
  const bar = h('div', { class: 'chef-bar' }, h('div', { class: 'chef-zone', style: `left:${(center - zone / 2) * 100}%;width:${zone * 100}%` }));
  const mark = h('div', { class: step.game === 'pour' ? 'chef-fill' : 'chef-needle' });
  bar.append(mark);
  const score = (v: number) => {
    const d = Math.abs(v - center);
    return d <= zone / 2 ? 1 - 0.15 * (d / (zone / 2)) : Math.max(0.05, 0.7 - (d - zone / 2) * 2.4);
  };
  let v = 0;
  let dir = 1;
  let holding = false;
  const t0 = performance.now();
  let lastT = t0;
  const btn = h('button', { class: 'btn big primary chef-go' }, step.game === 'pour' ? t('chefHold') : t('chefStop'));
  if (step.game === 'pour') {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      holding = true;
    });
    const up = () => {
      if (holding && v > 0.02) finish(score(v));
      holding = false;
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
  } else btn.addEventListener('click', () => finish(score(v)));
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (step.game === 'pour') {
      if (holding) v += dt * 0.45;
      if (v >= 1) return finish(0.1);
      mark.style.width = `${v * 100}%`;
    } else {
      v += dir * dt * 0.75 * (step.speed ?? 1);
      if (v > 1) {
        v = 1;
        dir = -1;
      }
      if (v < 0) {
        v = 0;
        dir = 1;
      }
      mark.style.left = `${v * 100}%`;
      // Left too long: it burns.
      if ((now - t0) / 1000 > 7) return finish(0.1);
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  overlay.replaceChildren(h('div', { class: 'chef-mg' }, title, h('p', { class: 'muted' }, t(step.game === 'pour' ? 'chefPourHint' : 'chefTimingHint')), bar, btn));
}

// ---------- end of the day ----------

function endOfDay(overlay: HTMLElement, r: DayResult) {
  const c = chef();
  const dayN = c.day;
  // Good day: a new dish. A great one sometimes gives 2 or even 3 picks.
  const good = r.served >= 2 && r.stars >= 3;
  let picks = good ? 1 : 0;
  if (good && r.stars >= 4.5 && r.served >= 5 && Math.random() < 0.5) picks = 2;
  if (good && r.stars >= 4.8 && r.served >= 8 && Math.random() < 0.35) picks = 3;
  save.update((d) => {
    d.chef.cash += r.cash;
    d.chef.served += r.served;
    d.chef.day++;
    d.chef.best = Math.max(d.chef.best, r.cash);
    for (const v of r.reviews) for (let k = 0; k < (v.vip ? 3 : 1); k++) d.chef.ratings.push(v.stars);
    d.chef.ratings = d.chef.ratings.slice(-30);
    d.chef.reviews.push(...r.reviews.slice(-6).map((v) => ({ stars: v.stars, dish: v.dish, n: v.n, vip: v.vip, day: dayN })));
    d.chef.reviews = d.chef.reviews.slice(-12);
  });
  jingle(good ? 'victory' : 'defeat');
  const pool = rewardPool(chef()).sort(() => Math.random() - 0.5);
  const offer = pool.slice(0, Math.min(pool.length, Math.max(3, picks + 1)));
  picks = Math.min(picks, offer.length);
  const chosen = new Set<string>();
  const lines = r.reviews.slice(-3).map((v) => h('li', {}, `${starText(v.stars)} ${v.vip ? '🎩' : ''}${DISH[v.dish]?.icon ?? ''} “${reviewLine(v.stars, v.n, v.vip)}”`));
  const doneBtn = h('button', { class: 'btn big primary', onclick: () => finishPick() }, picks ? t('chefPickDone') : t('chefNext'));
  const finishPick = () => {
    if (picks && chosen.size < picks) return toast(t('chefPickMore', { n: picks - chosen.size }));
    if (chosen.size) save.update((d) => d.chef.dishes.push(...chosen));
    go('chef');
  };
  const cards = h(
    'div',
    { class: 'chef-items' },
    ...offer.map((d) => {
      const card = h(
        'button',
        {
          class: 'chef-item',
          onclick: () => {
            if (chosen.has(d.id)) chosen.delete(d.id);
            else if (chosen.size < picks) chosen.add(d.id);
            else if (picks === 1) {
              chosen.clear();
              chosen.add(d.id);
            }
            for (const el of cards.children) el.classList.toggle('on', chosen.has((el as HTMLElement).dataset.id!));
          },
        },
        h('span', { class: 'chef-item-icon' }, d.kids ? `🧸${d.icon}` : d.icon),
        h('b', {}, dishName(d)),
        h('small', {}, `💵 ${d.price} · ${d.steps.map((s) => STATION_ICON[s.station]).join(' ')}`),
      );
      card.dataset.id = d.id;
      return card;
    }),
  );
  overlay.classList.remove('hidden');
  overlay.replaceChildren(
    h(
      'div',
      { class: 'chef-mg chef-end' },
      h('h2', {}, `🌙 ${t('chefDayOver', { n: dayN })}`),
      h('p', {}, `${t('chefServed', { n: r.served })} · 😡 ${r.angry} · ${r.stars ? starText(Math.round(r.stars * 2) / 2) : '—'}`),
      h('p', { class: 'coins-earned' }, `💵 +${r.cash}${r.tips ? ` (${t('chefTips', { n: r.tips })})` : ''}`),
      lines.length ? h('ul', { class: 'chef-lines' }, ...lines) : null,
      picks
        ? h('div', {}, h('h3', {}, picks > 1 ? `🎉 ${t('chefPickN', { n: picks })}` : `🎁 ${t('chefPick1')}`), cards)
        : h('p', { class: 'muted' }, offer.length ? t('chefNoPick') : t('chefAllDishes')),
      doneBtn,
    ),
  );
}

