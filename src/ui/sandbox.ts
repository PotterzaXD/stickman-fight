import { TEAM_COLORS } from '../game/game';
import { allMaps } from '../game/maps';
import type { BossKind, Difficulty, MatchConfig, SandboxBoss, SlotConfig } from '../game/types';
import { WEAPONS } from '../game/weapons';
import { t, teamName, type Key } from '../i18n';
import { save } from '../save';
import { h } from './dom';
import { mapThumb } from './icons';
import { keepScroll, localName, mapLabel } from './lobby';
import { coinChip } from './menu';
import { bossNames } from './play';
import { go, register } from './router';

const MAX_SB_PLAYERS = 6;
const MAX_SB_BOTS = 10;
const MAX_SB_BOSSES = 6;
const POWERS = [25, 50, 100, 200, 500, 1000];
const BOSS_HP: Record<BossKind, number> = { boss: 5000, cat: 10000, mascot: 50000, buffalo: 8000, fish: 9999 };
const BOSS_ICON: Record<BossKind, string> = { boss: '👹', cat: '🐱', mascot: '⚪', buffalo: '🐃', fish: '🐟' };

function defaultSandbox(): MatchConfig {
  return {
    mode: 'sandbox',
    mapId: 'arena',
    slots: [{ kind: 'human', weapon: 'sword', team: 0, difficulty: 'medium', hp: 500, power: 100 }],
    extraBosses: [{ kind: 'boss', team: 1, hp: BOSS_HP.boss, power: 100 }],
  };
}

/** Sandbox: put any fighters and bosses in a match, on any team, with any HP and power. */
register('sandbox', (root) => {
  const maps = allMaps(save.data.customMaps);
  const m: MatchConfig = structuredClone(save.data.lastSandbox ?? defaultSandbox());
  m.mode = 'sandbox';
  m.extraBosses ??= [];
  if (!maps.some((x) => x.id === m.mapId)) m.mapId = 'arena';

  const body = h('div', { class: 'page-body' });
  const errorEl = h('p', { class: 'error' });
  const render = () => keepScroll(body.parentElement ?? body, paint);

  const teams = () => new Set([...m.slots.map((s) => s.team), ...m.extraBosses!.map((b) => b.team)]);
  const validate = () => {
    if (!m.slots.length && !m.extraBosses!.length) return t('sbEmpty');
    if (teams().size < 2) return t('sbNeedTwoTeams');
    return '';
  };

  const teamPicker = (o: { team: number }) =>
    h(
      'div',
      { class: 'team-pick' },
      ...TEAM_COLORS.map((c, ti) =>
        h('button', {
          class: `team-dot ${o.team === ti ? 'on' : ''}`,
          style: `background:${c}`,
          title: teamName(ti),
          'aria-label': `${t('sbTeam')} ${teamName(ti)}`,
          onclick: () => {
            o.team = ti;
            render();
          },
        }),
      ),
    );

  const hpBox = (o: { hp?: number }, def: number) => {
    const el = h('input', { class: 'hp-box', type: 'number', min: 1, max: 999999, value: String(o.hp ?? def), 'aria-label': t('sbHp') });
    el.addEventListener('change', () => {
      o.hp = Math.max(1, Math.min(999999, Math.round(Number(el.value) || def)));
      el.value = String(o.hp);
    });
    return h('label', { class: 'field' }, h('small', {}, `❤️ ${t('sbHp')}`), el);
  };

  const powerSel = (o: { power?: number }) => {
    const sel = h(
      'select',
      { 'aria-label': t('sbPower'), onchange: (e: Event) => (o.power = Number((e.target as HTMLSelectElement).value)) },
      ...POWERS.map((p) => h('option', { value: String(p) }, `${p}%`)),
    );
    sel.value = String(o.power ?? 100);
    return h('label', { class: 'field' }, h('small', {}, `💪 ${t('sbPower')}`), sel);
  };

  const weaponSel = (s: SlotConfig) => {
    const sel = h(
      'select',
      { onchange: (e: Event) => (s.weapon = (e.target as HTMLSelectElement).value) },
      h('option', { value: 'random' }, `🎲 ${t('random')}`),
      ...WEAPONS.filter((w) => w.special !== 'boss').map((w) => h('option', { value: w.id }, t(`w.${w.id}` as Key))),
    );
    sel.value = s.weapon;
    return h('label', { class: 'field' }, h('small', {}, t('weapon')), sel);
  };

  const diffSel = (s: SlotConfig) => {
    const sel = h(
      'select',
      { onchange: (e: Event) => (s.difficulty = (e.target as HTMLSelectElement).value as Difficulty) },
      ...(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => h('option', { value: d }, t(d))),
    );
    sel.value = s.difficulty;
    return h('label', { class: 'field' }, h('small', {}, '⚙'), sel);
  };

  const removeBtn = (fn: () => void) =>
    h(
      'button',
      {
        class: 'icon-btn',
        'aria-label': 'remove',
        onclick: () => {
          fn();
          render();
        },
      },
      '✕',
    );

  const paint = () => {
    const names = bossNames();
    const humans = m.slots.filter((s) => s.kind === 'human').length;
    const bots = m.slots.length - humans;
    let p = 0;
    let b = 0;
    const fighterRows = m.slots.map((s, i) => {
      const human = s.kind === 'human';
      const n = human ? p++ : b++;
      return h(
        'div',
        { class: 'slot' },
        h('span', { class: 'slot-name', style: `--c:${TEAM_COLORS[s.team]}` }, human ? `🎮 ${localName(n)}` : `🤖 ${t('bot', { n: n + 1 })}`),
        weaponSel(s),
        human ? null : diffSel(s),
        hpBox(s, 500),
        powerSel(s),
        teamPicker(s),
        removeBtn(() => m.slots.splice(i, 1)),
      );
    });
    const bossRows = m.extraBosses!.map((bs: SandboxBoss, i) =>
      h(
        'div',
        { class: 'slot' },
        h('span', { class: 'slot-name', style: `--c:${TEAM_COLORS[bs.team]}` }, `${BOSS_ICON[bs.kind]} ${names[bs.kind]}`),
        hpBox(bs, BOSS_HP[bs.kind]),
        powerSel(bs),
        teamPicker(bs),
        removeBtn(() => m.extraBosses!.splice(i, 1)),
      ),
    );
    const addBoss = (kind: BossKind) =>
      h(
        'button',
        {
          class: 'btn small',
          disabled: m.extraBosses!.length >= MAX_SB_BOSSES,
          onclick: () => {
            m.extraBosses!.push({ kind, team: 1, hp: BOSS_HP[kind], power: 100 });
            render();
          },
        },
        `+ ${BOSS_ICON[kind]} ${names[kind]}`,
      );

    const err = validate();
    errorEl.textContent = err;
    startBtn.disabled = !!err;
    body.replaceChildren(
      h('section', {}, h('p', { class: 'muted' }, t('sandboxDesc'))),
      h(
        'section',
        {},
        h('h3', {}, t('map')),
        h(
          'div',
          { class: 'map-row' },
          ...maps.map((mp) =>
            h(
              'button',
              {
                class: `map-card ${m.mapId === mp.id ? 'on' : ''}`,
                onclick: () => {
                  m.mapId = mp.id;
                  render();
                },
              },
              mapThumb(mp),
              h('span', {}, mapLabel(mp)),
            ),
          ),
        ),
      ),
      h(
        'section',
        {},
        h('h3', {}, `${t('fighters')} (${m.slots.length + m.extraBosses!.length})`),
        h(
          'div',
          { class: 'row gap wrap' },
          h(
            'button',
            {
              class: 'btn small',
              disabled: humans >= MAX_SB_PLAYERS,
              onclick: () => {
                m.slots.push({ kind: 'human', weapon: 'sword', team: 0, difficulty: 'medium', hp: 500, power: 100 });
                render();
              },
            },
            `${t('addPlayer')} ${humans}/${MAX_SB_PLAYERS}`,
          ),
          h(
            'button',
            {
              class: 'btn small',
              disabled: bots >= MAX_SB_BOTS,
              onclick: () => {
                m.slots.push({ kind: 'bot', weapon: 'random', team: 1, difficulty: 'medium', hp: 500, power: 100 });
                render();
              },
            },
            `${t('addBot')} ${bots}/${MAX_SB_BOTS}`,
          ),
          addBoss('boss'),
          addBoss('cat'),
          addBoss('mascot'),
          addBoss('buffalo'),
          addBoss('fish'),
        ),
        h('div', { class: 'slots' }, ...fighterRows, ...bossRows),
      ),
    );
  };

  const startBtn = h(
    'button',
    {
      class: 'btn big primary',
      onclick: () => {
        if (validate()) return;
        save.update((d) => (d.lastSandbox = structuredClone(m)));
        go('play', { match: structuredClone(m) });
      },
    },
    `⚔️ ${t('start')}`,
  );

  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `🧪 ${t('sandbox')}`), coinChip()),
      body,
      h('footer', { class: 'page-foot' }, errorEl, startBtn),
    ),
  );
  render();
});
