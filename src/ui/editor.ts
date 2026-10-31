import { BUILTIN_MAPS, CONNECT_MAX, MAP_SIZES, THEME_IDS, connectMaps, encodeMap, type ConnectLayout } from '../game/maps';
import { drawBackground, drawPlatforms } from '../game/render';
import { drawWarps } from '../game/oct30Draw';
import { drawPortal } from '../game/treats';
import { WARP } from '../game/oct30';
import type { BlockKind, MapDef, Platform, ThemeId } from '../game/types';
import { t, type Key } from '../i18n';
import { save } from '../save';
import { confirmBox, h, shareLink, toast } from './dom';
import { mapThumb } from './icons';
import { mapLabel } from './lobby';
import { go, register } from './router';

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

function newMap(from?: MapDef): MapDef {
  const base = from ? structuredClone(from) : null;
  return {
    id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
    name: base ? `${mapLabel(from!)} 2` : t('newMap'),
    w: base?.w ?? MAP_SIZES.medium.w,
    h: base?.h ?? MAP_SIZES.medium.h,
    theme: base?.theme ?? 'day',
    platforms: base?.platforms ?? [{ x: 250, y: 750, w: 1200, h: 60 }],
    spawns: base?.spawns ?? [],
  };
}

export function mapShareUrl(m: MapDef) {
  return `${location.origin}${location.pathname}?map=${encodeMap(m)}`;
}

register('maps', (root) => {
  const list = h('div', { class: 'my-maps' });
  const render = () => {
    const mine = save.data.customMaps;
    list.replaceChildren(
      ...(mine.length
        ? mine.map((m) =>
            h(
              'div',
              { class: 'my-map' },
              mapThumb(m, 160, 90),
              h('b', {}, m.name),
              h(
                'div',
                { class: 'row gap wrap' },
                h('button', { class: 'btn small primary', onclick: () => go('lobby', { mapId: m.id }) }, `▶ ${t('testMap')}`),
                h('button', { class: 'btn small', onclick: () => go('editor', { map: structuredClone(m) }) }, `✏️ ${t('edit')}`),
                h('button', { class: 'btn small', onclick: () => void shareLink(mapShareUrl(m), m.name, t('shareText'), t('mapLinkCopied')) }, `🔗 ${t('shareMap')}`),
                h(
                  'button',
                  {
                    class: 'btn small ghost',
                    onclick: async () => {
                      if (!(await confirmBox(t('confirmDelete', { name: m.name }), t('delete'), t('back')))) return;
                      save.update((d) => (d.customMaps = d.customMaps.filter((x) => x.id !== m.id)));
                      render();
                    },
                  },
                  '🗑',
                ),
              ),
            ),
          )
        : [h('p', { class: 'muted' }, t('noMaps'))]),
    );
  };
  render();
  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, t('editor')), h('div', {})),
      h(
        'div',
        { class: 'page-body' },
        h(
          'section',
          {},
          h('h3', {}, `➕ ${t('newMap')}`),
          h(
            'div',
            { class: 'map-row' },
            h('button', { class: 'map-card', onclick: () => go('editor', { map: newMap() }) }, h('div', { class: 'blank-thumb' }, '＋'), h('span', {}, t('blank'))),
            ...BUILTIN_MAPS.map((b) => h('button', { class: 'map-card', onclick: () => go('editor', { map: newMap(b) }) }, mapThumb(b), h('span', {}, `${t('copyOf')}: ${mapLabel(b)}`))),
          ),
        ),
        connectSection(),
        h('section', {}, h('h3', {}, `🗺️ ${t('myMaps')}`), list),
      ),
    ),
  );
});

type Tool = 'platform' | BlockKind | 'mover' | 'lift' | 'spawn' | 'warp' | 'purple' | 'erase' | 'pan';
/** Most purple portals on one map. */
const MAX_PURPLE = 4;
/** Same size as the Portal map's one. */
const PURPLE_R = 105;
/** Most portals on one map (6 pairs). */
const MAX_WARPS = 12;
const BLOCKS: BlockKind[] = ['concrete', 'lava', 'glass', 'sandbag', 'bounce', 'ice', 'spikes', 'wall'];
/** A wall is always taller than a double jump (about 350), so nobody can hop over it. */
const WALL_H = 400;
const WALL_W = 40;
/** Make a wall tall enough, growing it upward from its bottom. */
const tallWall = (r: Platform): Platform => (r.h >= WALL_H ? r : { ...r, y: r.y + r.h - WALL_H, h: WALL_H });
/** Moving platforms: side to side, or up and down (a lift). */
const MOVES = { mover: { dx: 240, dy: 0, period: 5 }, lift: { dx: 0, dy: -220, period: 4 } };
const isMove = (t: Tool): t is 'mover' | 'lift' => t === 'mover' || t === 'lift';
const isBlock = (t: Tool): t is BlockKind => (BLOCKS as string[]).includes(t);

register('editor', (root, { map }) => {
  const m = map;
  let tool: Tool = 'platform';
  const history: string[] = [];
  /** Undone steps, for Redo (a new change clears it). */
  const future: string[] = [];
  const state = () => JSON.stringify({ p: m.platforms, s: m.spawns, q: m.warps ?? [], o: m.portals ?? [] });
  const restore = (json: string) => {
    const st = JSON.parse(json);
    m.platforms = st.p;
    m.spawns = st.s;
    m.warps = st.q ?? [];
    m.portals = st.o ?? [];
  };
  let drag: { x0: number; y0: number; x1: number; y1: number } | null = null;

  const canvas = h('canvas', { class: 'editor-canvas' });
  const ctx = canvas.getContext('2d')!;
  let cw = 0;
  let ch = 0;
  let dpr = 1;

  // Zoom in (1 = the whole map fits) and the point in the middle of the screen, for big maps.
  let zoom = 1;
  let center = { x: m.w / 2, y: m.h / 2 };
  const view = () => {
    const z = Math.min(cw / (m.w + 80), ch / (m.h + 80)) * zoom;
    return { z, ox: cw / 2 - center.x * z, oy: ch / 2 - center.y * z };
  };
  const setZoom = (k: number) => {
    zoom = Math.max(1, Math.min(8, k));
    if (zoom === 1) center = { x: m.w / 2, y: m.h / 2 };
    draw();
  };
  let pan: { sx: number; sy: number; cx: number; cy: number } | null = null;
  const toWorld = (sx: number, sy: number) => {
    const v = view();
    return { x: (sx - v.ox) / v.z, y: (sy - v.oy) / v.z };
  };

  const snapshot = () => {
    history.push(state());
    future.length = 0;
    if (history.length > 60) history.shift();
  };

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(ctx, m, cw, ch, 0, 0);
    const v = view();
    ctx.setTransform(dpr * v.z, 0, 0, dpr * v.z, dpr * v.ox, dpr * v.oy);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1 / v.z;
    for (let x = 0; x <= m.w; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, m.h);
      ctx.stroke();
    }
    for (let y = 0; y <= m.h; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(m.w, y);
      ctx.stroke();
    }
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, m.w, m.h);
    ctx.setLineDash([]);
    drawPlatforms(ctx, m, performance.now() / 1000);
    if (m.warps?.length) drawWarps(ctx, m.warps, performance.now() / 1000);
    for (const o of m.portals ?? []) drawPortal(ctx, o, performance.now() / 1000);
    for (const [i, s] of m.spawns.entries()) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x - 9, s.y);
      ctx.lineTo(s.x, s.y - 34);
      ctx.lineTo(s.x + 9, s.y);
      ctx.moveTo(s.x, s.y - 34);
      ctx.lineTo(s.x, s.y - 62);
      ctx.moveTo(s.x - 14, s.y - 52);
      ctx.lineTo(s.x + 14, s.y - 52);
      ctx.stroke();
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(s.x, s.y - 73, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), s.x, s.y - 68);
    }
    if (drag) {
      const r = dragRect(drag);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.strokeStyle = '#1e88e5';
      ctx.lineWidth = 3;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  };

  const dragRect = (d: { x0: number; y0: number; x1: number; y1: number }): Platform => {
    const x = snap(Math.min(d.x0, d.x1));
    const y = snap(Math.min(d.y0, d.y1));
    const r: Platform = { x, y, w: Math.max(GRID * 2, snap(Math.abs(d.x1 - d.x0))), h: Math.max(GRID, snap(Math.abs(d.y1 - d.y0))) };
    if (isBlock(tool)) r.kind = tool;
    if (isMove(tool)) {
      r.h = Math.min(r.h, 40);
      r.move = { ...MOVES[tool] };
    }
    return tool === 'wall' ? tallWall(r) : r;
  };

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    draw();
  };

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const p = toWorld(e.clientX - r.left, e.clientY - r.top);
    if (tool === 'pan') {
      canvas.setPointerCapture(e.pointerId);
      pan = { sx: e.clientX, sy: e.clientY, cx: center.x, cy: center.y };
      return;
    }
    if (tool === 'platform' || isBlock(tool) || isMove(tool)) {
      canvas.setPointerCapture(e.pointerId);
      drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    } else if (tool === 'spawn') {
      if (m.spawns.length >= 24) return;
      snapshot();
      // Drop the spawn onto the platform below the tap.
      const below = m.platforms.filter((q) => p.x >= q.x && p.x <= q.x + q.w && q.y >= p.y - 40).sort((a, b) => a.y - b.y)[0];
      m.spawns.push({ x: snap(p.x), y: below ? below.y : snap(p.y) });
    } else if (tool === 'warp') {
      // Portals link up in pairs, in the order you put them down (1 with 2, 3 with 4...).
      const warps = (m.warps ??= []);
      if (warps.length >= MAX_WARPS) return toast(t('warpMax', { n: MAX_WARPS / 2 }));
      snapshot();
      const below = m.platforms.filter((q) => p.x >= q.x && p.x <= q.x + q.w && q.y >= p.y - 40).sort((a, b) => a.y - b.y)[0];
      warps.push({ x: snap(p.x), y: below ? below.y : snap(p.y) });
      if (warps.length % 2 === 1) toast(t('warpOne'));
    } else if (tool === 'purple') {
      // A purple portal goes exactly where you tap, even in the air.
      const list = (m.portals ??= []);
      if (list.length >= MAX_PURPLE) return toast(t('purpleMax', { n: MAX_PURPLE }));
      snapshot();
      list.push({ x: snap(p.x), y: snap(p.y), r: PURPLE_R });
    } else {
      const oi = (m.portals ?? []).findIndex((o) => Math.hypot((p.x - o.x) / 0.75, p.y - o.y) < o.r + 10);
      if (oi >= 0) {
        snapshot();
        m.portals!.splice(oi, 1);
        draw();
        return;
      }
      const wi = (m.warps ?? []).findIndex((w) => Math.abs(w.x - p.x) < WARP.w / 2 + 6 && p.y < w.y + 10 && p.y > w.y - WARP.h - 10);
      if (wi >= 0) {
        snapshot();
        m.warps!.splice(wi, 1);
        draw();
        return;
      }
      const si = m.spawns.findIndex((s) => Math.abs(s.x - p.x) < 25 && p.y < s.y + 10 && p.y > s.y - 90);
      const pi = m.platforms.findIndex((q) => p.x >= q.x - 6 && p.x <= q.x + q.w + 6 && p.y >= q.y - 6 && p.y <= q.y + q.h + 6);
      if (si >= 0 || pi >= 0) snapshot();
      if (si >= 0) m.spawns.splice(si, 1);
      else if (pi >= 0) m.platforms.splice(pi, 1);
    }
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pan) {
      const z = view().z;
      center = { x: pan.cx - (e.clientX - pan.sx) / z, y: pan.cy - (e.clientY - pan.sy) / z };
      draw();
      return;
    }
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const p = toWorld(e.clientX - r.left, e.clientY - r.top);
    drag.x1 = p.x;
    drag.y1 = p.y;
    draw();
  });
  const endDrag = () => {
    pan = null;
    if (!drag) return;
    snapshot();
    const tiny = Math.abs(drag.x1 - drag.x0) < GRID && Math.abs(drag.y1 - drag.y0) < GRID;
    // A tap makes a ready-sized platform.
    const tap: Platform = { x: snap(drag.x0 - 120), y: snap(drag.y0), w: 240, h: 24 };
    if (isBlock(tool)) tap.kind = tool;
    if (isMove(tool)) tap.move = { ...MOVES[tool] };
    // A tapped wall stands up from where you tapped.
    const wall: Platform = { x: snap(drag.x0 - WALL_W / 2), y: snap(drag.y0) - WALL_H, w: WALL_W, h: WALL_H, kind: 'wall' };
    m.platforms.push(tiny ? (tool === 'wall' ? wall : tap) : dragRect(drag));
    drag = null;
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
  }, { passive: false });
  canvas.addEventListener('pointercancel', () => {
    pan = null;
    drag = null;
    draw();
  });

  const nameInput = h('input', { class: 'name-input', value: m.name, maxlength: 30, 'aria-label': t('mapName') });
  nameInput.addEventListener('input', () => (m.name = nameInput.value));

  // Parts: everything you can build, in one panel. Erase, Undo, Save and the rest stay apart in the bar.
  const PARTS: [Tool, string][] = [
    ['platform', `▭ ${t('toolPlatform')}`],
    ['concrete', `🧱 ${t('toolConcrete')}`],
    ['lava', `🌋 ${t('toolLava')}`],
    ['glass', `🪟 ${t('toolGlass')}`],
    ['sandbag', `🟫 ${t('toolSandbag')}`],
    ['bounce', `🟥 ${t('toolBounce')}`],
    ['ice', `🧊 ${t('toolIce')}`],
    ['spikes', `🔺 ${t('toolSpikes')}`],
    ['wall', `🚧 ${t('toolWall')}`],
    ['mover', `↔️ ${t('toolMover')}`],
    ['lift', `↕️ ${t('toolLift')}`],
    ['spawn', `🧍 ${t('toolSpawn')}`],
    ['warp', `🌀 ${t('toolWarp')}`],
    ['purple', `🟣 ${t('toolPurple')}`],
  ];
  /** The last part picked (Erase switches back to it). */
  let part: Tool = 'platform';
  const partsBtn = h('button', { class: 'btn small parts-btn' });
  const eraseBtn = h('button', { class: 'btn small erase-btn' }, `🧽 ${t('toolErase')}`);
  // Big maps: zoom in and drag the view around.
  const panBtn = h('button', { class: 'btn small' }, `✋ ${t('toolPan')}`);
  const partsPanel = h('div', { class: 'parts-panel hidden' });
  const paintTools = () => {
    const label = PARTS.find(([id]) => id === part)?.[1] ?? '';
    partsBtn.textContent = `🧩 ${t('parts')}: ${label}`;
    partsBtn.classList.toggle('on', tool !== 'erase');
    eraseBtn.classList.toggle('on', tool === 'erase');
    panBtn.classList.toggle('on', tool === 'pan');
    partsPanel.replaceChildren(
      ...PARTS.map(([id, text]) =>
        h(
          'button',
          {
            class: `part ${tool === id ? 'on' : ''}`,
            onclick: () => {
              tool = part = id;
              partsPanel.classList.add('hidden');
              paintTools();
            },
          },
          text,
        ),
      ),
    );
  };
  partsBtn.addEventListener('click', () => {
    // Opening Parts also stops erasing.
    tool = part;
    partsPanel.classList.toggle('hidden');
    paintTools();
  });
  panBtn.addEventListener('click', () => {
    tool = tool === 'pan' ? part : 'pan';
    partsPanel.classList.add('hidden');
    paintTools();
  });
  eraseBtn.addEventListener('click', () => {
    tool = tool === 'erase' ? part : 'erase';
    partsPanel.classList.add('hidden');
    paintTools();
  });
  paintTools();

  const sizeSel = h(
    'select',
    {
      'aria-label': t('size'),
      onchange: (e: Event) => {
        const s = MAP_SIZES[(e.target as HTMLSelectElement).value as keyof typeof MAP_SIZES];
        m.w = s.w;
        m.h = s.h;
        setZoom(1);
      },
    },
    h('option', { value: 'small' }, `${t('size')}: ${t('small')}`),
    h('option', { value: 'medium' }, `${t('size')}: ${t('medium2')}`),
    h('option', { value: 'large' }, `${t('size')}: ${t('large')}`),
    h('option', { value: 'giant' }, `${t('size')}: ${t('giant')}`),
  );
  // A connected map has its own size: show it as its own choice.
  const own = !Object.values(MAP_SIZES).some((s) => s.w === m.w && s.h === m.h);
  if (own) sizeSel.append(h('option', { value: 'own' }, `${t('size')}: ${m.w}×${m.h}`));
  sizeSel.value = own ? 'own' : ((Object.entries(MAP_SIZES).find(([, s]) => s.w === m.w)?.[0] ?? 'medium') as string);

  const themeSel = h(
    'select',
    {
      'aria-label': t('theme'),
      onchange: (e: Event) => {
        m.theme = (e.target as HTMLSelectElement).value as ThemeId;
        draw();
      },
    },
    ...THEME_IDS.map((id) => h('option', { value: id }, `${t('theme')}: ${t(`th.${id}` as Key)}`)),
  );
  themeSel.value = m.theme;

  const store = (): boolean => {
    if (!m.platforms.length) {
      toast(t('needPlatform'));
      return false;
    }
    m.name = m.name.trim() || t('newMap');
    save.update((d) => {
      const i = d.customMaps.findIndex((x) => x.id === m.id);
      const copy = structuredClone(m);
      if (i >= 0) d.customMaps[i] = copy;
      else d.customMaps.push(copy);
    });
    return true;
  };

  root.append(
    h(
      'div',
      { class: 'editor' },
      h(
        'div',
        { class: 'editor-bar' },
        h('button', { class: 'btn ghost small', onclick: () => go('maps') }, '←'),
        nameInput,
        partsBtn,
        eraseBtn,
        panBtn,
        h('button', { class: 'btn small', 'aria-label': 'zoom in', onclick: () => setZoom(zoom * 1.5) }, '🔍＋'),
        h('button', { class: 'btn small', 'aria-label': 'zoom out', onclick: () => setZoom(zoom / 1.5) }, '🔍－'),
        h(
          'button',
          {
            class: 'btn small',
            onclick: () => {
              const last = history.pop();
              if (!last) return;
              future.push(state());
              restore(last);
              draw();
            },
          },
          `↶ ${t('undo')}`,
        ),
        h(
          'button',
          {
            class: 'btn small',
            onclick: () => {
              const next = future.pop();
              if (!next) return;
              history.push(state());
              restore(next);
              draw();
            },
          },
          `↷ ${t('redo')}`,
        ),
        h(
          'button',
          {
            class: 'btn small ghost',
            onclick: async () => {
              if (!m.platforms.length && !m.spawns.length) return;
              if (!(await confirmBox(t('clearConfirm'), t('clearMap'), t('back')))) return;
              snapshot();
              m.platforms = [];
              m.spawns = [];
              m.warps = [];
              m.portals = [];
              draw();
            },
          },
          `🗑 ${t('clearMap')}`,
        ),
        sizeSel,
        themeSel,
        h(
          'button',
          {
            class: 'btn small',
            onclick: () => {
              if (store()) toast(t('saved'));
            },
          },
          `💾 ${t('saveMap')}`,
        ),
        h(
          'button',
          {
            class: 'btn small primary',
            onclick: () => {
              if (store()) go('lobby', { mapId: m.id });
            },
          },
          `▶ ${t('testMap')}`,
        ),
      ),
      partsPanel,
      canvas,
    ),
  );
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  return () => ro.disconnect();
});

/** The map connector: pick 2-4 maps (the game's maps or your own), in a row or 2 by 2, and they become one big map. */
function connectSection(): HTMLElement {
  const picked: MapDef[] = [];
  let layout: ConnectLayout = 'row';
  const sec = h('section', { class: 'connect' });
  const paint = () => {
    const all = [...BUILTIN_MAPS, ...save.data.customMaps];
    sec.replaceChildren(
      h('h3', {}, `🔗 ${t('connectMaps')}`),
      h('p', { class: 'muted small' }, t('connectHint', { n: CONNECT_MAX })),
      h(
        'div',
        { class: 'segs' },
        h('button', { class: `seg ${layout === 'row' ? 'on' : ''}`, onclick: () => ((layout = 'row'), paint()) }, `➡️ ${t('connectRow')}`),
        h('button', { class: `seg ${layout === 'grid' ? 'on' : ''}`, onclick: () => ((layout = 'grid'), paint()) }, `🔲 ${t('connectGrid')}`),
      ),
      h(
        'p',
        {},
        h('b', {}, `${t('connectPicked')}: `),
        picked.length ? picked.map((m, i) => `${i + 1}. ${mapLabel(m)}`).join('  ') : h('span', { class: 'muted' }, t('connectNone')),
      ),
      h(
        'div',
        { class: 'map-row' },
        ...all.map((mp) => {
          const n = picked.indexOf(mp);
          return h(
            'button',
            {
              class: `map-card ${n >= 0 ? 'on' : ''}`,
              onclick: () => {
                // Tap again to take it out. The same map can't go in twice.
                if (n >= 0) picked.splice(n, 1);
                else if (picked.length >= CONNECT_MAX) return toast(t('connectFull', { n: CONNECT_MAX }));
                else picked.push(mp);
                paint();
              },
            },
            mapThumb(mp),
            h('span', {}, `${n >= 0 ? `${n + 1}. ` : ''}${mapLabel(mp)}`),
          );
        }),
      ),
      h(
        'button',
        {
          class: 'btn primary',
          disabled: picked.length < 2,
          onclick: () => {
            const big = connectMaps(picked, layout, `${mapLabel(picked[0]).slice(0, 24)} +${picked.length - 1}`);
            save.update((d) => d.customMaps.push(structuredClone(big)));
            toast(t('connectDone'));
            go('editor', { map: structuredClone(big) });
          },
        },
        `🔗 ${t('connectGo')}`,
      ),
    );
  };
  paint();
  return sec;
}
