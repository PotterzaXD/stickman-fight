import { BUILTIN_MAPS, MAP_SIZES, THEME_IDS, encodeMap } from '../game/maps';
import { drawBackground, drawPlatforms } from '../game/render';
import type { MapDef, Platform, ThemeId } from '../game/types';
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
        h('section', {}, h('h3', {}, `🗺️ ${t('myMaps')}`), list),
      ),
    ),
  );
});

type Tool = 'platform' | 'spawn' | 'erase';

register('editor', (root, { map }) => {
  const m = map;
  let tool: Tool = 'platform';
  const history: string[] = [];
  let drag: { x0: number; y0: number; x1: number; y1: number } | null = null;

  const canvas = h('canvas', { class: 'editor-canvas' });
  const ctx = canvas.getContext('2d')!;
  let cw = 0;
  let ch = 0;
  let dpr = 1;

  const view = () => {
    const z = Math.min(cw / (m.w + 80), ch / (m.h + 80));
    return { z, ox: (cw - m.w * z) / 2, oy: (ch - m.h * z) / 2 };
  };
  const toWorld = (sx: number, sy: number) => {
    const v = view();
    return { x: (sx - v.ox) / v.z, y: (sy - v.oy) / v.z };
  };

  const snapshot = () => {
    history.push(JSON.stringify({ p: m.platforms, s: m.spawns }));
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
    drawPlatforms(ctx, m);
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
    return { x, y, w: Math.max(GRID * 2, snap(Math.abs(d.x1 - d.x0))), h: Math.max(GRID, snap(Math.abs(d.y1 - d.y0))) };
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
    if (tool === 'platform') {
      canvas.setPointerCapture(e.pointerId);
      drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    } else if (tool === 'spawn') {
      if (m.spawns.length >= 24) return;
      snapshot();
      // Drop the spawn onto the platform below the tap.
      const below = m.platforms.filter((q) => p.x >= q.x && p.x <= q.x + q.w && q.y >= p.y - 40).sort((a, b) => a.y - b.y)[0];
      m.spawns.push({ x: snap(p.x), y: below ? below.y : snap(p.y) });
    } else {
      const si = m.spawns.findIndex((s) => Math.abs(s.x - p.x) < 25 && p.y < s.y + 10 && p.y > s.y - 90);
      const pi = m.platforms.findIndex((q) => p.x >= q.x - 6 && p.x <= q.x + q.w + 6 && p.y >= q.y - 6 && p.y <= q.y + q.h + 6);
      if (si >= 0 || pi >= 0) snapshot();
      if (si >= 0) m.spawns.splice(si, 1);
      else if (pi >= 0) m.platforms.splice(pi, 1);
    }
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const p = toWorld(e.clientX - r.left, e.clientY - r.top);
    drag.x1 = p.x;
    drag.y1 = p.y;
    draw();
  });
  const endDrag = () => {
    if (!drag) return;
    snapshot();
    const tiny = Math.abs(drag.x1 - drag.x0) < GRID && Math.abs(drag.y1 - drag.y0) < GRID;
    // A tap makes a ready-sized platform.
    m.platforms.push(tiny ? { x: snap(drag.x0 - 120), y: snap(drag.y0), w: 240, h: 24 } : dragRect(drag));
    drag = null;
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => {
    drag = null;
    draw();
  });

  const nameInput = h('input', { class: 'name-input', value: m.name, maxlength: 30, 'aria-label': t('mapName') });
  nameInput.addEventListener('input', () => (m.name = nameInput.value));

  const toolBar = h('div', { class: 'segs tools' });
  const paintTools = () => {
    toolBar.replaceChildren(
      ...(
        [
          ['platform', `▭ ${t('toolPlatform')}`],
          ['spawn', `🧍 ${t('toolSpawn')}`],
          ['erase', `🧽 ${t('toolErase')}`],
        ] as [Tool, string][]
      ).map(([id, label]) =>
        h(
          'button',
          {
            class: `seg ${tool === id ? 'on' : ''}`,
            onclick: () => {
              tool = id;
              paintTools();
            },
          },
          label,
        ),
      ),
    );
  };
  paintTools();

  const sizeSel = h(
    'select',
    {
      'aria-label': t('size'),
      onchange: (e: Event) => {
        const s = MAP_SIZES[(e.target as HTMLSelectElement).value as keyof typeof MAP_SIZES];
        m.w = s.w;
        m.h = s.h;
        draw();
      },
    },
    h('option', { value: 'small' }, `${t('size')}: ${t('small')}`),
    h('option', { value: 'medium' }, `${t('size')}: ${t('medium2')}`),
    h('option', { value: 'large' }, `${t('size')}: ${t('large')}`),
  );
  sizeSel.value = (Object.entries(MAP_SIZES).find(([, s]) => s.w === m.w)?.[0] ?? 'medium') as string;

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
        toolBar,
        h(
          'button',
          {
            class: 'btn small',
            onclick: () => {
              const last = history.pop();
              if (!last) return;
              const s = JSON.parse(last);
              m.platforms = s.p;
              m.spawns = s.s;
              draw();
            },
          },
          `↶ ${t('undo')}`,
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
      h('p', { class: 'editor-hint' }, t('editorHint')),
      canvas,
    ),
  );
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  return () => ro.disconnect();
});
