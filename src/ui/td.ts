import {
  DIFF_INFO,
  EGGS,
  FREE_UNIT,
  MAX_EQUIP,
  RARITY_COLOR,
  SELL_PRICE,
  TD_DIFFS,
  TD_H,
  TD_MAPS,
  TD_W,
  TDGame,
  UNITS,
  UNIT_BY_ID,
  hatch,
  type EggDef,
  type TDUnit,
  type UnitDef,
} from '../game/td';
import { UNIT_S, drawMapThumb, drawUnitCard, renderTD, type TDView } from '../game/tdRender';
import { t, type Key } from '../i18n';
import { jingle, playMusic } from '../music';
import { save } from '../save';
import { sfx } from '../sfx';
import { confirmBox, h, toast } from './dom';
import { coinChip } from './menu';
import { go, register } from './router';

const unitName = (u: UnitDef) => t(`tdu.${u.id}` as Key);
const rarityName = (u: UnitDef) => t(`rar.${u.rarity}` as Key);
const EGG_NAME: Record<EggDef['id'], Key> = { basic: 'tdEggBasic', rare: 'tdEggRare', mythic: 'tdEggMythic' };

/** The 5 units you take into a game (only ones you still own). */
function loadout(): UnitDef[] {
  const td = save.data.td;
  const list = td.equip.filter((id) => UNIT_BY_ID[id] && (td.units[id] ?? 0) > 0).map((id) => UNIT_BY_ID[id]);
  return list.length ? list : [UNIT_BY_ID[FREE_UNIT]];
}

function unitCanvas(def: UnitDef, size = 80) {
  const c = h('canvas', { class: 'td-figure', style: `width:${size}px;height:${size}px` });
  drawUnitCard(c, def, size);
  return c;
}

function statsLine(u: UnitDef) {
  return `❤️ ${u.hp}  ⚔️ ${u.dmg}  🪙 ${u.cost}`;
}

// ---------- the Tower Defense page: maps, units and eggs ----------

let tab: 'play' | 'units' | 'eggs' = 'play';

register('td', (root) => {
  const body = h('div', { class: 'page-body td-page' });
  const tabs = h('div', { class: 'segs td-tabs' });
  const paint = () => {
    tabs.replaceChildren(
      ...(['play', 'units', 'eggs'] as const).map((k) =>
        h('button', { class: `seg ${tab === k ? 'on' : ''}`, onclick: () => ((tab = k), paint()) }, t(k === 'play' ? 'tdPlay' : k === 'units' ? 'tdUnits' : 'tdEggs')),
      ),
    );
    body.replaceChildren(tabs, ...(tab === 'play' ? playTab() : tab === 'units' ? unitsTab(paint) : eggsTab(paint)));
  };
  paint();
  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('funModes') }, `← ${t('back')}`), h('h2', {}, `🏰 ${t('towerDefense')}`), coinChip()),
      body,
    ),
  );
});

function teamRow(onTap?: (id: string) => void) {
  const eq = loadout();
  return h(
    'div',
    { class: 'td-team' },
    ...Array.from({ length: MAX_EQUIP }, (_, i) => {
      const u = eq[i];
      if (!u) return h('div', { class: 'td-slot empty' }, '+');
      return h(
        'button',
        { class: 'td-slot', style: `--rar:${RARITY_COLOR[u.rarity]}`, onclick: () => onTap?.(u.id), title: unitName(u) },
        unitCanvas(u, 56),
        h('small', {}, unitName(u)),
      );
    }),
  );
}

function playTab(): HTMLElement[] {
  const td = save.data.td;
  return [
    h(
      'section',
      {},
      h('div', { class: 'row gap wrap td-team-head' }, h('b', {}, t('tdTeam', { n: loadout().length, max: MAX_EQUIP })), h('button', { class: 'btn small', onclick: () => ((tab = 'units'), go('td')) }, `✏️ ${t('tdEdit')}`)),
      teamRow(),
      h('small', { class: 'muted' }, t('tdHow')),
    ),
    ...TD_DIFFS.map((diff) => {
      const info = DIFF_INFO[diff];
      return h(
        'section',
        {},
        h('div', { class: 'row gap wrap' }, h('b', { class: `td-diff ${diff}` }, t(`td.${diff}` as Key)), h('small', { class: 'muted' }, `${t('tdWaves', { n: info.waves })} · ❤️ ${info.lives} · ${t('tdReward', { n: info.reward })}`)),
        h(
          'div',
          { class: 'td-maps' },
          ...TD_MAPS.filter((m) => m.diff === diff).map((m) => {
            const c = h('canvas', { class: 'td-thumb' });
            drawMapThumb(c, m);
            return h(
              'button',
              { class: 'td-map', onclick: () => go('tdPlay', { mapId: m.id }) },
              c,
              h('b', {}, `${td.cleared.includes(m.id) ? '⭐ ' : ''}${t(`tdm.${m.id}` as Key)}`),
              td.cleared.includes(m.id) ? h('small', {}, t('tdCleared')) : null,
            );
          }),
        ),
      );
    }),
  ];
}

function toggleEquip(id: string, repaint: () => void) {
  const td = save.data.td;
  if (td.equip.includes(id)) {
    if (td.equip.length <= 1) return;
    save.update((d) => (d.td.equip = d.td.equip.filter((x) => x !== id)));
  } else {
    if (td.equip.length >= MAX_EQUIP) return toast(t('tdTeamFull'));
    save.update((d) => d.td.equip.push(id));
  }
  repaint();
}

function unitsTab(repaint: () => void): HTMLElement[] {
  const td = save.data.td;
  return [
    h('section', {}, h('b', {}, t('tdTeam', { n: loadout().length, max: MAX_EQUIP })), teamRow((id) => toggleEquip(id, repaint)), h('small', { class: 'muted' }, t('tdTeamHint'))),
    h(
      'div',
      { class: 'td-units' },
      ...UNITS.map((u) => {
        const n = td.units[u.id] ?? 0;
        if (!n)
          return h(
            'div',
            { class: 'td-unit locked', style: `--rar:${RARITY_COLOR[u.rarity]}` },
            h('div', { class: 'td-lock' }, '❓'),
            h('b', {}, '???'),
            h('small', { class: 'td-rar' }, rarityName(u)),
            h('small', { class: 'muted' }, t('tdLocked')),
          );
        const on = td.equip.includes(u.id);
        return h(
          'button',
          { class: `td-unit ${on ? 'on' : ''}`, style: `--rar:${RARITY_COLOR[u.rarity]}`, onclick: () => unitInfo(u, repaint) },
          unitCanvas(u, 70),
          h('b', {}, `${u.icon} ${unitName(u)}`),
          h('small', { class: 'td-rar' }, rarityName(u)),
          h('small', {}, statsLine(u)),
          h('small', { class: 'td-count' }, `×${n}${on ? ' ✅' : ''}`),
        );
      }),
    ),
  ];
}

/** A unit's details, with Equip and Sell. */
function unitInfo(u: UnitDef, repaint: () => void) {
  const td = save.data.td;
  const n = td.units[u.id] ?? 0;
  const on = td.equip.includes(u.id);
  const close = () => wrap.remove();
  const keepOne = u.id === FREE_UNIT && n <= 1;
  const notes = [t(`tdk.${u.kind}` as Key)];
  if (u.block) notes.push(t('tdBlocks', { n: u.block }));
  if (u.slow) notes.push(t('tdSlows'));
  if (u.kind === 'melee') notes.push(t('tdNotFly'));
  const sell = async () => {
    close();
    if (keepOne) return toast(t('tdKeepOne'));
    const price = SELL_PRICE[u.rarity];
    if (!(await confirmBox(t('tdSellConfirm', { name: unitName(u), n: price }), t('tdSell', { n: price }), t('back')))) return;
    save.update((d) => {
      const left = (d.td.units[u.id] ?? 0) - 1;
      if (left > 0) d.td.units[u.id] = left;
      else {
        delete d.td.units[u.id];
        d.td.equip = d.td.equip.filter((x) => x !== u.id);
        if (!d.td.equip.length) d.td.equip = [FREE_UNIT];
      }
      d.coins += price;
    });
    sfx.coin();
    repaint();
  };
  const wrap: HTMLElement = h(
    'div',
    { class: 'modal-wrap', onclick: (e: Event) => e.target === wrap && close() },
    h(
      'div',
      { class: 'modal td-info', style: `--rar:${RARITY_COLOR[u.rarity]}` },
      unitCanvas(u, 110),
      h('h2', {}, `${u.icon} ${unitName(u)}`),
      h('b', { class: 'td-rar' }, rarityName(u)),
      h('p', {}, statsLine(u)),
      h('p', { class: 'muted' }, notes.join(' · ')),
      h('p', {}, t('tdOwned', { n })),
      h(
        'div',
        { class: 'row gap wrap' },
        h('button', { class: 'btn primary', disabled: on && td.equip.length <= 1, onclick: () => (close(), toggleEquip(u.id, repaint)) }, on ? t('tdUnequip') : t('tdEquip')),
        h('button', { class: 'btn', disabled: keepOne, onclick: () => void sell() }, t('tdSell', { n: SELL_PRICE[u.rarity] })),
        h('button', { class: 'btn ghost', onclick: close }, t('close')),
      ),
    ),
  );
  document.body.append(wrap);
}

function eggsTab(repaint: () => void): HTMLElement[] {
  return [
    h(
      'div',
      { class: 'td-eggs' },
      ...EGGS.map((egg) =>
        h(
          'section',
          { class: `td-egg ${egg.id}` },
          h('div', { class: 'td-egg-icon' }, egg.icon),
          h('b', {}, t(EGG_NAME[egg.id])),
          h(
            'ul',
            { class: 'td-odds' },
            ...(Object.entries(egg.odds) as [UnitDef['rarity'], number][])
              .filter(([, p]) => p > 0)
              .map(([r, p]) => h('li', { style: `color:${RARITY_COLOR[r]}` }, `${t(`rar.${r}` as Key)} ${p}%`)),
          ),
          h('button', { class: 'btn primary', onclick: () => buyEgg(egg, repaint) }, t('tdBuyEgg', { n: egg.price })),
        ),
      ),
    ),
  ];
}

function buyEgg(egg: EggDef, repaint: () => void) {
  if (save.data.coins < egg.price) return toast(t('tdNoCoins'));
  const u = hatch(egg);
  const isNew = !(save.data.td.units[u.id] > 0);
  save.update((d) => {
    d.coins -= egg.price;
    d.td.units[u.id] = (d.td.units[u.id] ?? 0) + 1;
  });
  repaint();
  // The egg wobbles, cracks, and out comes the unit.
  const stage = h('div', { class: 'td-hatch-egg' }, egg.icon);
  const reveal = h('div', { class: 'td-hatch-reveal hidden' });
  const close = () => wrap.remove();
  const wrap = h('div', { class: 'modal-wrap' }, h('div', { class: 'modal td-hatch', style: `--rar:${RARITY_COLOR[u.rarity]}` }, h('p', {}, t('tdHatched')), stage, reveal));
  document.body.append(wrap);
  sfx.throw();
  setTimeout(() => {
    stage.remove();
    if (u.rarity === 'legendary' || u.rarity === 'mythical') sfx.achievement();
    else sfx.coin();
    reveal.classList.remove('hidden');
    reveal.append(
      unitCanvas(u, 120),
      h('h2', {}, `${u.icon} ${unitName(u)}`),
      h('b', { class: 'td-rar' }, rarityName(u)),
      h('p', {}, statsLine(u)),
      h('p', { class: isNew ? 'treasure-got' : 'muted' }, isNew ? t('tdNew') : t('tdDupe', { n: save.data.td.units[u.id] })),
      h('div', { class: 'row gap wrap' }, h('button', { class: 'btn', onclick: () => (close(), buyEgg(egg, repaint)) }, `${t('tdAgain')} (🪙 ${egg.price})`), h('button', { class: 'btn primary', onclick: close }, t('close'))),
    );
  }, 1300);
}

// ---------- a game ----------

register('tdPlay', (root, { mapId }) => {
  const map = TD_MAPS.find((m) => m.id === mapId);
  if (!map) return go('td');
  playMusic(map.diff === 'insane' ? 'inferno' : map.diff === 'hard' ? 'war' : 'jungle');
  const team = loadout();
  let g = new TDGame(map, team);
  let speed = 1;
  let paused = false;
  let pick = -1;
  const view: TDView = {};
  let frame = { k: 1, ox: 0, oy: 0 };

  const sound = (e: Parameters<NonNullable<TDGame['onEvent']>>[0]) => {
    if (e === 'kill') sfx.hit();
    else if (e === 'boom') sfx.boom();
    else if (e === 'leak') sfx.ko();
    else if (e === 'boss') sfx.secret();
    else if (e === 'place') sfx.coin();
    else if (e === 'zap') sfx.whip();
  };
  g.onEvent = sound;

  const canvas = h('canvas', { class: 'game-canvas td-canvas' });
  const waveEl = h('b', {});
  const livesEl = h('b', {});
  const coinsEl = h('b', { class: 'td-coins' });
  const speedBtn = h('button', { class: 'btn small', onclick: () => ((speed = speed === 1 ? 2 : 1), (speedBtn.textContent = `⏩ ${speed}×`)) }, '⏩ 1×');
  const nextBtn = h('button', { class: 'btn small primary', onclick: () => g.startWave() });
  const hint = h('div', { class: 'td-hint hidden' });
  const sellBar = h('div', { class: 'td-sell hidden' });
  const cards = team.map((u, i) =>
    h(
      'button',
      { class: 'td-card', style: `--rar:${RARITY_COLOR[u.rarity]}`, onclick: () => choose(i) },
      unitCanvas(u, 44),
      h('small', {}, `🪙 ${u.cost}`),
      h('div', { class: 'td-cd' }),
    ),
  );
  const quit = async () => {
    paused = true;
    const ok = g.over || (await confirmBox(t('tdQuitConfirm'), t('tdLeave'), t('tdStay')));
    paused = false;
    if (ok) go('td');
  };

  root.append(
    h(
      'div',
      { class: 'td-play' },
      canvas,
      h(
        'div',
        { class: 'td-hud' },
        h('button', { class: 'btn small ghost', onclick: () => void quit() }, '✖'),
        waveEl,
        livesEl,
        coinsEl,
        h('div', { class: 'spacer' }),
        nextBtn,
        speedBtn,
      ),
      h('div', { class: 'td-turn' }, `📱↻ ${t('tdTurn')}`),
      hint,
      sellBar,
      h('div', { class: 'td-bar' }, ...cards),
    ),
  );

  function choose(i: number) {
    pick = pick === i ? -1 : i;
    view.picked = null;
    sellBar.classList.add('hidden');
    for (const [j, c] of cards.entries()) c.classList.toggle('on', j === pick);
    hint.textContent = t('tdPickSpot');
    hint.classList.toggle('hidden', pick < 0);
    if (pick < 0) view.ghost = undefined;
  }

  const toWorld = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - frame.ox) / frame.k, y: (e.clientY - r.top - frame.oy) / frame.k };
  };

  canvas.addEventListener('pointermove', (e) => {
    if (pick < 0 || e.pointerType === 'touch') return;
    const p = toWorld(e);
    const def = team[pick];
    view.ghost = { x: p.x, y: p.y, def, ok: g.canPlace(p.x, p.y, def) };
  });
  canvas.addEventListener('pointerleave', () => (view.ghost = undefined));
  canvas.addEventListener('pointerdown', (e) => {
    sfx.unlock();
    const p = toWorld(e);
    if (p.x < 0 || p.y < 0 || p.x > TD_W || p.y > TD_H) return;
    if (pick >= 0) {
      const res = g.place(pick, p.x, p.y);
      if (res === 'ok') return choose(pick);
      const def = team[pick];
      toast(res === 'coins' ? t('tdNoCoins') : res === 'cd' ? t('tdCooldown') : def.kind === 'melee' && g.canPlace(p.x, p.y, { ...def, range: 9999 }) ? t('tdMeleeNear') : t('tdBadSpot'));
      return;
    }
    // Tap a unit to see its range and sell it.
    const u = g.units.find((u) => !u.dead && Math.hypot(u.x - p.x, u.y - 25 * UNIT_S - p.y) < 26);
    showSell(u ?? null);
  });

  function showSell(u: TDUnit | null) {
    view.picked = u;
    sellBar.classList.toggle('hidden', !u);
    if (!u) return;
    const refund = Math.floor(u.def.cost / 2);
    sellBar.replaceChildren(
      h('b', {}, `${u.def.icon} ${unitName(u.def)}`),
      h('small', {}, `❤️ ${Math.ceil(u.hp)}/${u.def.hp}`),
      h('button', { class: 'btn small', onclick: () => (g.sell(u), sfx.coin(), showSell(null)) }, t('tdSellUnit', { n: refund })),
      h('button', { class: 'btn small ghost', onclick: () => showSell(null) }, '✖'),
    );
  }

  let shownOver = false;
  function showOver() {
    shownOver = true;
    const win = g.over === 'win';
    const reward = win ? DIFF_INFO[map!.diff].reward : 0;
    if (win)
      save.update((d) => {
        d.coins += reward;
        if (!d.td.cleared.includes(map!.id)) d.td.cleared.push(map!.id);
      });
    jingle(win ? 'victory' : 'defeat');
    const close = () => wrap.remove();
    const wrap = h(
      'div',
      { class: 'modal-wrap' },
      h(
        'div',
        { class: 'modal' },
        h('h2', {}, win ? `🏆 ${t('tdWin')}` : `💀 ${t('tdLose', { n: g.wave })}`),
        win ? h('p', { class: 'coins-earned' }, `🪙 ${t('coinsEarned', { n: reward })}`) : null,
        h(
          'div',
          { class: 'row gap wrap' },
          h('button', { class: 'btn ghost', onclick: () => (close(), go('td')) }, t('tdMaps')),
          h(
            'button',
            {
              class: 'btn primary',
              onclick: () => {
                close();
                g = new TDGame(map!, team);
                g.onEvent = sound;
                shownOver = false;
                showSell(null);
                playMusic(map!.diff === 'insane' ? 'inferno' : map!.diff === 'hard' ? 'war' : 'jungle');
              },
            },
            t('tdRetry'),
          ),
        ),
      ),
    );
    document.body.append(wrap);
  }

  const ctx = canvas.getContext('2d')!;
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused && !g.over) {
      acc += dt * speed;
      while (acc >= STEP) {
        g.update(STEP);
        acc -= STEP;
      }
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const hh = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
    }
    frame = renderTD(g, ctx, w, hh, dpr, view);
    // The HUD
    const boss = g.wave > g.waves;
    waveEl.textContent = boss ? `👹 ${t('tdBossWave')}` : `🌊 ${t('tdWave', { n: Math.max(1, g.wave), max: g.waves })}`;
    livesEl.textContent = `❤️ ${g.lives}`;
    coinsEl.textContent = `🪙 ${g.coins}`;
    const between = !g.inWave && !g.over && g.wave <= g.waves;
    nextBtn.classList.toggle('hidden', !between);
    if (between) nextBtn.textContent = `▶ ${t('tdNextWave', { n: Math.ceil(g.nextIn) })}`;
    for (const [i, c] of cards.entries()) {
      const u = team[i];
      const cd = g.cds[i] / u.cd;
      (c.lastChild as HTMLElement).style.height = `${Math.round(cd * 100)}%`;
      c.classList.toggle('poor', g.coins < u.cost);
    }
    if (view.picked?.dead) showSell(null);
    if (g.over && !shownOver) showOver();
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
});
