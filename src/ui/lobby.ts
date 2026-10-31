import { BOT_COLORS, PLAYER_COLORS, TEAM_COLORS } from '../game/game';
import { allMaps } from '../game/maps';
import { BEACH_MAP, BEACH_MODES, PIGEON_MAX, SECRET_KINDS, isBossMode, isSecret, isXBoss, type SecretKind, type Difficulty, type MapDef, type MatchConfig, type Mode, type SlotConfig } from '../game/types';
import { GUARDIAN_MAPS } from '../game/maps';
import { HATS } from '../game/hats';
import { ACHIEVEMENTS, achDoneCount, hasAch, phylLocked, phylOpen } from '../achievements';
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

/** Stickman Infection and PHYLISHIEUS take up to 30 bots. */
export const BIG_BOTS = 30;
/** Bots allowed in this mode (the Pigeon fits up to 30 fighters). */
export const maxBots = (mode: Mode, humans: number) => (mode === 'pigeon' ? PIGEON_MAX - humans : mode === 'infection' || mode === 'phyl' ? BIG_BOTS : MAX_BOTS);

/** Hat picker for a slot: players pick from their hats, bots can also get a random one. */
export function hatSelect(s: SlotConfig, bot: boolean) {
  const sel = h(
    'select',
    { 'aria-label': t('hat'), onchange: (e: Event) => (s.hat = (e.target as HTMLSelectElement).value) },
    h('option', { value: 'none' }, `🚫 ${t('hatNone')}`),
    bot ? h('option', { value: 'random' }, `🎲 ${t('random')}`) : null,
    ...HATS.filter((x) => save.data.hats.includes(x.id)).map((x) => h('option', { value: x.id }, t(`hat.${x.id}` as Key))),
  );
  const want = s.hat ?? 'none';
  sel.value = want === 'random' ? (bot ? 'random' : 'none') : save.data.hats.includes(want) ? want : 'none';
  return h('label', { class: 'field' }, h('small', {}, `🎩 ${t('hat')}`), sel);
}

/** Hints for the secret bosses you haven't unlocked yet (with your progress). */
export function secretHints(): HTMLElement | null {
  const locked = SECRET_KINDS.filter((k) => !save.data.secrets.includes(k));
  if (!locked.length && !phylLocked()) return null;
  const st = save.data.stats;
  const progress: Record<SecretKind, string> = {
    queen: t('hintProgress', { n: Math.min(3, st.catSnowWins), total: 3 }),
    tide: '',
    guardian: t('hintProgress', { n: GUARDIAN_MAPS.filter((id) => st.mapsWon.includes(id)).length, total: GUARDIAN_MAPS.length }),
  };
  return h(
    'div',
    { class: 'hints' },
    h('b', {}, `🔮 ${t('hintsTitle')}`),
    ...locked.map((k) =>
      h('p', { class: 'hint' }, h('span', { class: 'hint-q' }, `${SECRET_ICONS[k]} ???`), ' ', t(`hint.${k}` as Key), progress[k] ? h('small', { class: 'muted' }, ` (${progress[k]})`) : null),
    ),
    phylLocked() ? h('p', { class: 'hint' }, h('span', { class: 'hint-q' }, '📖 ???'), ' ', t('hint.phyl', { total: ACHIEVEMENTS.length }), h('small', { class: 'muted' }, ` (${t('hintProgress', { n: achDoneCount(), total: ACHIEVEMENTS.length })})`)) : null,
  );
}

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

export const SECRET_ICONS: Record<SecretKind, string> = { queen: '❄️', tide: '🌊', guardian: '🌲' };

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
  if (m.mode === 'sandbox' || m.mode === 'outbreak' || (m.mode === 'buffalo' && !hasAch('buffalo')) || (isSecret(m.mode) && !save.data.secrets.includes(m.mode)) || (m.mode === 'phyl' && !phylOpen())) m.mode = 'ffa';
  if (arg?.mode && (arg.mode !== 'phyl' || phylOpen())) m.mode = arg.mode;
  // Stickman Infection from the fun modes page: fill up with bots so there is someone to chase.
  if (arg?.mode === 'infection') while (m.slots.length < 6) m.slots.push({ kind: 'bot', weapon: 'random', team: m.slots.length % 4, difficulty: 'medium' });
  if (m.mapId === BEACH_MAP && !BEACH_MODES.includes(m.mode)) m.mode = m.mode === 'events' ? 'ffa' : 'boss';
  if (m.mode === 'events' && m.mapId === BEACH_MAP) m.mapId = 'arena';

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
    if (m.mode === 'phyl' && !phylOpen()) return t('hint.phyl', { total: ACHIEVEMENTS.length });
    if (m.mapId === BEACH_MAP && !BEACH_MODES.includes(m.mode)) return t('beachOnly');
    if (isBossMode(m.mode)) return n >= 1 ? '' : t('needOne');
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
            // Buffalo unlocks when you fight the Mascot all by yourself and get knocked out.
            if (mode === 'buffalo' && !hasAch('buffalo')) return toast(t('buffaloLocked'));
            if (m.mapId === BEACH_MAP && !BEACH_MODES.includes(mode)) return toast(t('beachOnly'));
            m.mode = mode;
            // Leaving the Pigeon: only 6 bots fit in the other modes.
            let extra = m.slots.filter((s) => s.kind === 'bot').length - maxBots(mode, 0);
            if (extra > 0) toast(t('botsTrimmed', { n: maxBots(mode, 0) }));
            for (let i = m.slots.length - 1; i >= 0 && extra > 0; i--) {
              if (m.slots[i].kind !== 'bot') continue;
              m.slots.splice(i, 1);
              extra--;
            }
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
      // The Pigeon: everyone gets a shotgun.
      if (m.mode === 'pigeon') return h('select', { disabled: true }, h('option', {}, t('w.shotgun')));
      // Weapon Race: everyone starts on the same weapon and goes up the ladder.
      if (m.mode === 'race') return h('select', { disabled: true }, h('option', {}, `🔫 ${t('race')}`));
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
        // Players get an empty spot where bots pick their level, so the columns line up.
        s.kind === 'bot' ? h('label', { class: 'field' }, h('small', {}, `⚙ ${t('level')}`), diffSelect(s)) : h('span', { class: 'field ghost' }),
        hatSelect(s, s.kind === 'bot'),
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
        h('small', { class: 'seg-group' }, t('modesBattle')),
        h('div', { class: 'segs' }, modeBtn('ffa', '🥊'), modeBtn('team', '🤝'), modeBtn('stock', '❤️'), modeBtn('hill', '👑'), modeBtn('race', '🔫')),
        h('small', { class: 'seg-group' }, t('modesBosses')),
        h(
          'div',
          { class: 'segs' },
          modeBtn('boss', '👹'),
          modeBtn('rush', '🔥'),
          modeBtn('cat', '🐱'),
          modeBtn('mascot', '⚪'),
          modeBtn('buffalo', '🐃'),
          modeBtn('pigeon', '🐦'),
          modeBtn('elephant', '🐘'),
          modeBtn('scarecrow', '🌾'),
          modeBtn('robo', '🤖'),
          // Secret bosses only show up once you have unlocked them.
          ...SECRET_KINDS.filter((k) => save.data.secrets.includes(k)).map((k) => modeBtn(k, SECRET_ICONS[k])),
          // Locked ones show as ??? with a hint.
          ...SECRET_KINDS.filter((k) => !save.data.secrets.includes(k)).map((k) =>
            h('button', { class: 'seg locked', onclick: () => toast(t(`hint.${k}` as Key)) }, `🔒 ???`),
          ),
          // PHYLISHIEUS: ??? until every achievement is done, gone once both phases are beaten.
          phylOpen() ? modeBtn('phyl', '📖') : null,
          phylLocked()
            ? h('button', { class: 'seg locked', onclick: () => toast(`${t('hint.phyl', { total: ACHIEVEMENTS.length })} (${achDoneCount()}/${ACHIEVEMENTS.length})`) }, `🔒 ???`)
            : null,
        ),
        h('small', { class: 'seg-group' }, t('modesFun')),
        h('div', { class: 'segs' }, modeBtn('infection', '🦠'), modeBtn('events', '🌪️')),
        h('p', { class: 'muted' }, t(`${m.mode}Desc` as Key)),
        isSecret(m.mode) || isXBoss(m.mode) ? h('small', { class: 'muted' }, `🪙🏆 ${t(`${m.mode}Reward` as Key)}`) : null,
        m.mode === 'phyl' ? h('p', { class: 'phyl-phase' }, `📖 ${t('phylPhase', { n: save.data.phyl.phase })} · 🪙🏆 ${t(save.data.phyl.phase === 2 ? 'phylReward2' : 'phylReward1')}`) : null,
        m.mode === 'buffalo' ? h('small', { class: 'muted' }, `🪙🏆 ${t('buffaloReward')}`) : null,
        m.mode === 'pigeon' ? h('small', { class: 'muted' }, `🪙🏆 ${t('pigeonReward')}`) : null,
        m.mode === 'rush' ? h('small', { class: 'muted' }, `🪙🏆 ${t('rushReward')}`) : null,
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
      secretHints() ?? '',
      // Stickman Infection is always in its own big town.
      m.mode === 'infection'
        ? h('section', {}, h('h3', {}, `${t('map')}: ${t('m.town')}`), h('small', { class: 'muted' }, t('infMapNote')))
        : m.mode === 'phyl'
        ? h('section', {}, h('h3', {}, `${t('map')}: ${t('m.tomekeep')}`), h('small', { class: 'muted' }, t('phylMapNote')))
        : h('section', {}, h('h3', {}, t('map')), h('div', { class: 'map-row' }, ...mapCards)),
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
                disabled: humans >= MAX_PLAYERS || (m.mode === 'pigeon' && m.slots.length >= PIGEON_MAX),
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
                disabled: bots >= maxBots(m.mode, humans),
                onclick: () => {
                  m.slots.push({ kind: 'bot', weapon: 'random', team: leastTeam(), difficulty: 'medium' });
                  render();
                },
              },
              `${t('addBot')} ${bots}/${maxBots(m.mode, humans)}`,
            ),
          ),
        ),
        humans === 0 && m.slots.length ? h('p', { class: 'muted' }, `👀 ${t('watchOnly')}`) : null,
        h('div', { class: `slots tidy ${m.mode === 'team' ? 'cols-team' : 'cols-play'}` }, ...rows),
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
