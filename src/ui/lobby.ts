import { BOT_COLORS, PLAYER_COLORS, TEAM_COLORS } from '../game/game';
import { allMaps } from '../game/maps';
import { BEACH_MAP, BEACH_MODES, type Difficulty, type MapDef, type MatchConfig, type Mode, type SlotConfig } from '../game/types';
import { hasAch } from '../achievements';
import { WEAPONS } from '../game/weapons';
import { t, teamName, type Key } from '../i18n';
import { NAME_MAX, cleanName, save } from '../save';
import { h } from './dom';
import { mapThumb } from './icons';
import { coinChip } from './menu';
import { mascotProgress, mascotUnlocked } from '../net/room';
import { toast } from './dom';
import { go, register } from './router';

export const MAX_PLAYERS = 6;
export const MAX_BOTS = 6;
export const MAX_BOSSES = 3;

/** "Bosses: 1 2 3" buttons for Boss Fight. */
export function bossPicker(value: number, pick: ((n: number) => void) | null, beach = false) {
  return h(
    'div',
    { class: 'row gap wrap' },
    h('b', {}, `👹 ${t('bossCount')}`),
    h(
      'div',
      { class: 'segs' },
      ...Array.from({ length: MAX_BOSSES }, (_, i) => i + 1).map((n) =>
        h('button', { class: `seg ${value === n ? 'on' : ''}`, disabled: !pick, onclick: () => pick?.(n) }, String(n)),
      ),
    ),
    // On the Beach the bosses are on your side, so they pay nothing.
    beach ? null : h('small', { class: 'muted' }, `🪙 ${t('bossReward', { n: 500 * value })}`),
  );
}

/** What happens on the Beach in this mode. */
export function beachNotes(mapId: string, mode: Mode): HTMLElement[] {
  if (mapId !== BEACH_MAP) return [];
  const how = mode === 'boss' ? t('beachBossNote') : t('beachFfaNote', { mode: t(mode === 'team' ? 'team' : 'ffa') });
  return [h('p', { class: 'beach-note' }, t('beachNote'), h('br', {}), h('small', {}, how))];
}

/** Run a re-render without losing the scroll spot of the page and of the map row. */
export function keepScroll(page: HTMLElement, paint: () => void) {
  const body = page.querySelector('.page-body');
  const top = body?.scrollTop ?? 0;
  const left = page.querySelector('.map-row')?.scrollLeft ?? 0;
  paint();
  const nb = page.querySelector('.page-body');
  if (nb) nb.scrollTop = top;
  const row = page.querySelector('.map-row');
  if (row) row.scrollLeft = left;
}

export function mapLabel(m: MapDef) {
  return m.builtin ? t(m.name as Key) : m.name;
}

/** P1-P6's typed name on this device (P1 falls back to your online name). */
export function localName(n: number): string {
  return save.data.localNames[n] || (n === 0 ? save.data.name : '') || t('player', { n: n + 1 });
}

/** Name box for player n on this device; saves as you type. */
export function nameInput(n: number, onChange?: () => void): HTMLInputElement {
  const el = h('input', {
    class: 'name-box',
    maxlength: NAME_MAX,
    placeholder: t('player', { n: n + 1 }),
    value: save.data.localNames[n] || (n === 0 ? save.data.name : ''),
    'aria-label': `${t('namePh')} ${t('player', { n: n + 1 })}`,
  });
  el.addEventListener('change', () => {
    save.update((d) => {
      d.localNames[n] = cleanName(el.value);
      if (n === 0) d.name = d.localNames[0];
      for (let i = 0; i < n; i++) d.localNames[i] ??= '';
    });
    el.value = save.data.localNames[n];
    onChange?.();
  });
  return el;
}

/** Display name and colour for each slot, in order. */
export function slotLooks(match: MatchConfig): { name: string; color: string; playerIndex: number }[] {
  let p = 0;
  let b = 0;
  return match.slots.map((s) => {
    const human = s.kind === 'human';
    const n = human ? p++ : b++;
    const base = human ? PLAYER_COLORS[n] : BOT_COLORS[n % BOT_COLORS.length];
    return {
      name: human ? localName(n) : t('bot', { n: n + 1 }),
      color: match.mode === 'team' ? TEAM_COLORS[s.team] : base,
      playerIndex: human ? n : -1,
    };
  });
}

function defaultMatch(): MatchConfig {
  return {
    mode: 'ffa',
    mapId: 'arena',
    slots: [
      { kind: 'human', weapon: 'sword', team: 0, difficulty: 'medium' },
      { kind: 'bot', weapon: 'random', team: 1, difficulty: 'medium' },
    ],
  };
}

register('lobby', (root, arg) => {
  const owned = save.data.owned;
  const maps = allMaps(save.data.customMaps);
  const m: MatchConfig = structuredClone(save.data.lastMatch ?? defaultMatch());
  // Drop anything that no longer exists (sold-out weapon, deleted map).
  for (const s of m.slots) if (s.weapon !== 'random' && !owned.includes(s.weapon)) s.weapon = 'sword';
  if (arg?.mapId) m.mapId = arg.mapId;
  if (!maps.some((x) => x.id === m.mapId)) m.mapId = 'arena';
  m.bosses = Math.max(1, Math.min(MAX_BOSSES, m.bosses ?? 1));
  if (m.mode === 'sandbox' || (m.mode === 'buffalo' && !hasAch('buffalo'))) m.mode = 'ffa';
  if (m.mapId === BEACH_MAP && !BEACH_MODES.includes(m.mode)) m.mode = 'boss';

  const body = h('div', { class: 'page-body' });
  const errorEl = h('p', { class: 'error' });

  const leastTeam = () => {
    const counts = [0, 0, 0, 0];
    for (const s of m.slots) counts[s.team]++;
    return counts.indexOf(Math.min(...counts));
  };

  const validate = (): string => {
    const n = m.slots.length;
    if (m.mode === 'mascot' && !mascotUnlocked(save.data.owned)) return t('mascotLocked', mascotProgress(save.data.owned));
    if (m.mode === 'buffalo' && !hasAch('buffalo')) return t('buffaloLocked');
    if (m.mapId === BEACH_MAP && !BEACH_MODES.includes(m.mode)) return t('beachOnly');
    if (m.mode === 'boss' || m.mode === 'cat' || m.mode === 'mascot' || m.mode === 'buffalo') return n >= 1 ? '' : t('needOne');
    if (n < 2) return t('needTwo');
    if (m.mode === 'team' && new Set(m.slots.map((s) => s.team)).size < 2) return t('needTwoTeams');
    return '';
  };

  const render = () => keepScroll(body.parentElement ?? body, paint);

  const paint = () => {
    const looks = slotLooks(m);
    const humans = m.slots.filter((s) => s.kind === 'human').length;
    const bots = m.slots.length - humans;

    const modeBtn = (mode: Mode, icon: string) =>
      h(
        'button',
        {
          class: `seg ${m.mode === mode ? 'on' : ''}`,
          onclick: () => {
            // The Mascot stays locked until you own every shop weapon.
            if (mode === 'mascot' && !mascotUnlocked(save.data.owned)) return toast(t('mascotLocked', mascotProgress(save.data.owned)));
            // Buffalo unlocks when you beat the Mascot all by yourself.
            if (mode === 'buffalo' && !hasAch('buffalo')) return toast(t('buffaloLocked'));
            if (m.mapId === BEACH_MAP && !BEACH_MODES.includes(mode)) return toast(t('beachOnly'));
            m.mode = mode;
            render();
          },
        },
        `${(mode === 'mascot' && !mascotUnlocked(save.data.owned)) || (mode === 'buffalo' && !hasAch('buffalo')) ? '🔒' : icon} ${t(mode)}`,
      );

    const mapCards = maps.map((mp) =>
      h(
        'button',
        {
          class: `map-card ${m.mapId === mp.id ? 'on' : ''}`,
          onclick: () => {
            m.mapId = mp.id;
            // The Beach only has Free For All, Teams and Boss Fight.
            if (mp.id === BEACH_MAP && !BEACH_MODES.includes(m.mode)) {
              m.mode = 'boss';
              toast(t('beachOnly'));
            }
            render();
          },
        },
        mapThumb(mp),
        h('span', {}, mapLabel(mp)),
      ),
    );

    const weaponSelect = (s: SlotConfig) => {
      const sel = h(
        'select',
        {
          onchange: (e: Event) => {
            s.weapon = (e.target as HTMLSelectElement).value;
          },
        },
        h('option', { value: 'random' }, `🎲 ${t('random')}`),
        ...WEAPONS.filter((w) => owned.includes(w.id)).map((w) => h('option', { value: w.id }, t(`w.${w.id}` as Key))),
      );
      sel.value = s.weapon;
      return sel;
    };

    const diffSelect = (s: SlotConfig) => {
      const sel = h(
        'select',
        {
          onchange: (e: Event) => {
            s.difficulty = (e.target as HTMLSelectElement).value as Difficulty;
          },
        },
        ...(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => h('option', { value: d }, t(d))),
      );
      sel.value = s.difficulty;
      return sel;
    };

    const teamPicker = (s: SlotConfig) =>
      h(
        'div',
        { class: 'team-pick' },
        ...TEAM_COLORS.map((c, ti) =>
          h('button', {
            class: `team-dot ${s.team === ti ? 'on' : ''}`,
            style: `background:${c}`,
            title: teamName(ti),
            'aria-label': teamName(ti),
            onclick: () => {
              s.team = ti;
              render();
            },
          }),
        ),
      );

    const rows = m.slots.map((s, i) =>
      h(
        'div',
        { class: 'slot' },
        s.kind === 'human'
          ? h('span', { class: 'slot-name', style: `--c:${looks[i].color}` }, '🎮 ', nameInput(looks[i].playerIndex))
          : h('span', { class: 'slot-name', style: `--c:${looks[i].color}` }, '🤖 ', looks[i].name),
        h('label', { class: 'field' }, h('small', {}, t('weapon')), weaponSelect(s)),
        s.kind === 'bot' ? h('label', { class: 'field' }, h('small', {}, '⚙'), diffSelect(s)) : null,
        m.mode === 'team' ? teamPicker(s) : null,
        h(
          'button',
          {
            class: 'icon-btn',
            'aria-label': 'remove',
            onclick: () => {
              m.slots.splice(i, 1);
              render();
            },
          },
          '✕',
        ),
      ),
    );

    const err = validate();
    errorEl.textContent = err;
    body.replaceChildren(
      h(
        'section',
        {},
        h('h3', {}, t('mode')),
        h('div', { class: 'segs' }, modeBtn('ffa', '🥊'), modeBtn('team', '🤝'), modeBtn('boss', '👹'), modeBtn('cat', '🐱'), modeBtn('mascot', '⚪'), modeBtn('buffalo', '🐃')),
        h('p', { class: 'muted' }, t(`${m.mode}Desc` as Key)),
        m.mode === 'buffalo' ? h('small', { class: 'muted' }, `🪙🏆 ${t('buffaloReward')}`) : null,
        ...beachNotes(m.mapId, m.mode),
        m.mode === 'cat' ? h('small', { class: 'muted' }, `🪙🏆 ${t('catReward')}`) : null,
        m.mode === 'mascot' ? h('small', { class: 'muted' }, `🪙🏆 ${t('mascotReward')}`) : null,
        m.mode === 'boss'
          ? bossPicker(
              m.bosses ?? 1,
              (n) => {
                m.bosses = n;
                render();
              },
              m.mapId === BEACH_MAP,
            )
          : null,
      ),
      h('section', {}, h('h3', {}, t('map')), h('div', { class: 'map-row' }, ...mapCards)),
      h(
        'section',
        {},
        h(
          'div',
          { class: 'row between' },
          h('h3', {}, `${t('fighters')} (${m.slots.length})`),
          h(
            'div',
            { class: 'row gap' },
            h(
              'button',
              {
                class: 'btn small',
                disabled: humans >= MAX_PLAYERS,
                onclick: () => {
                  m.slots.push({ kind: 'human', weapon: 'sword', team: leastTeam(), difficulty: 'medium' });
                  render();
                },
              },
              `${t('addPlayer')} ${humans}/${MAX_PLAYERS}`,
            ),
            h(
              'button',
              {
                class: 'btn small',
                disabled: bots >= MAX_BOTS,
                onclick: () => {
                  m.slots.push({ kind: 'bot', weapon: 'random', team: leastTeam(), difficulty: 'medium' });
                  render();
                },
              },
              `${t('addBot')} ${bots}/${MAX_BOTS}`,
            ),
          ),
        ),
        humans === 0 && m.slots.length ? h('p', { class: 'muted' }, `👀 ${t('watchOnly')}`) : null,
        h('div', { class: 'slots' }, ...rows),
      ),
    );
    startBtn.disabled = !!err;
  };

  const startBtn = h(
    'button',
    {
      class: 'btn big primary',
      onclick: () => {
        if (validate()) return;
        save.update((d) => (d.lastMatch = structuredClone(m)));
        go('play', { match: structuredClone(m) });
      },
    },
    `⚔️ ${t('start')}`,
  );

  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, t('play')), coinChip()),
      body,
      h('footer', { class: 'page-foot' }, errorEl, startBtn),
    ),
  );
  render();
});
