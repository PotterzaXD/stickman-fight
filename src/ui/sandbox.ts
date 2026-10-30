import { SB_ROCK_AT, TEAM_COLORS } from '../game/game';
import { playMusic } from '../music';
import { BABY_ELE, BEES, CHEF, CUPCAKE, GINGER, FROG, GHOST, KNIGHT, CHICK, CHICKEN, DOG, DRONE, LIL_PIGEON, MEMORY_ALLY, NINJAS, PENGUIN, PIGEON_HP, RED_GUY, RETRO, SB_ALLY, SECRET_HP, SKELETON, SNOWMAN_HP, SOLDIER_HP, XBOSS_HP, ZOMBIES, ZOMBIE_ALLY, UNICORN, DINO, WIZARD, PANDA } from '../game/entities';
import { HELPER_KINDS, SB_CHICKS, SB_ZOMBIE_KINDS, SECRET_KINDS, XBOSS_KINDS, isSbZombie, type HelperKind, type SandboxHelper, type SbZombieKind } from '../game/types';
import { hasAch } from '../achievements';
import { allMaps } from '../game/maps';
import type { BossKind, Difficulty, MatchConfig, SandboxBoss, SlotConfig } from '../game/types';
import { WEAPONS } from '../game/weapons';
import { t, teamName, type Key } from '../i18n';
import { save } from '../save';
import { h } from './dom';
import { mapThumb } from './icons';
import { hatSelect, keepScroll, localName, mapLabel } from './lobby';
import { coinChip } from './menu';
import { bossNames } from './play';
import { go, register } from './router';

const MAX_SB_PLAYERS = 6;
/** Players and bots together. */
const MAX_SB_FIGHTERS = 30;
const MAX_SB_BOSSES = 20;
/** Helpers (chick slots don't count). */
const MAX_SB_HELPERS = 30;
const MAX_SB_CLONES = 10;
/** Zombies (the Zombie Boss counts as one). */
const MAX_SB_ZOMBIES = 30;

const POWERS = [25, 50, 100, 200, 500, 1000];
const BOSS_HP: Record<BossKind, number> = { boss: 5000, cat: 10000, mascot: 50000, buffalo: 8000, fish: 9999, pigeon: PIGEON_HP, ...SECRET_HP, ...XBOSS_HP };
export const BOSS_ICON: Record<BossKind, string> = { boss: '👹', cat: '🐱', mascot: '⚪', buffalo: '🐃', fish: '🐟', pigeon: '🐦', queen: '❄️', tide: '🌊', guardian: '🌲', elephant: '🐘', scarecrow: '🌾', robo: '🤖' };
const HELPER_ICON: Record<HelperKind | SbZombieKind, string> = {
  cat: '🐱', fish: '🐟', memory: '💭', soldier: '💂', snowman: '☃️', sbsnow: '⛄', fireally: '🔥', redguy: '🟥', chicken: '🐔', chick: '🐥', lilpigeon: '🐦', skeleton: '💀', dog: '🐕', retro: '👾', bee: '🐝', ninja: '🥷', zombie: '🧟',
  babyele: '🐘', drone: '🛸', penguin: '🐧', knight: '🛡️', frog: '🐸', ghost: '👻', ginger: '🍪', cupcake: '🧁', chef: '👨‍🍳', unicorn: '🦄', dino: '🦖', wizard: '🧙', panda: '🐼',
  znormal: '🧟', zshooter: '🤢', zmini: '🧒', zbig: '🦍', zrunner: '🏃', zexploder: '💥', zboss: '👑',
};
const HELPER_HP: Record<HelperKind | SbZombieKind, number> = {
  cat: 100, fish: 50, memory: MEMORY_ALLY.hp, soldier: SOLDIER_HP, snowman: SNOWMAN_HP, sbsnow: SB_ALLY.hp, fireally: SB_ALLY.hp, redguy: RED_GUY.hp,
  chicken: CHICKEN.hp, chick: CHICK.hp, lilpigeon: LIL_PIGEON.hp, skeleton: SKELETON.hp, dog: DOG.hp, retro: RETRO.hp, bee: BEES.hp, ninja: NINJAS.hp, zombie: ZOMBIE_ALLY.hp,
  babyele: BABY_ELE.hp, drone: DRONE.hp, penguin: PENGUIN.hp, knight: KNIGHT.hp, frog: FROG.hp, ghost: GHOST.hp, ginger: GINGER.hp, cupcake: CUPCAKE.hp, chef: CHEF.hp, unicorn: UNICORN.hp, dino: DINO.hp, wizard: WIZARD.hp, panda: PANDA.hp,
  znormal: ZOMBIES.znormal.hp, zshooter: ZOMBIES.zshooter.hp, zmini: ZOMBIES.zmini.hp, zbig: ZOMBIES.zbig.hp, zrunner: ZOMBIES.zrunner.hp, zexploder: ZOMBIES.zexploder.hp, zboss: ZOMBIES.zboss.hp,
};
/** Helpers that count toward the helper limit (chicks don't, zombies have their own). */
const counted = (list: SandboxHelper[]) => list.filter((x) => x.kind !== 'chick' && !isSbZombie(x.kind)).length;
const zombieCount = (list: SandboxHelper[]) => list.filter((x) => isSbZombie(x.kind)).length;

/** How crowded a Sandbox match is: bots, bosses, helpers (a chick slot is 1), zombies and Clones. */
export function sandboxCrowd(m: MatchConfig): number {
  return m.slots.filter((s) => s.kind === 'bot').length + (m.extraBosses?.length ?? 0) + (m.helpers?.length ?? 0) + (m.clones?.length ?? 0);
}
/** The Pigeon shows up in Sandbox after you beat it once. */
const pigeonOpen = () => hasAch('pigeonBeat');
/** The zombie ally shows up after you beat wave 10 of The Outbreak. */
const helperOpen = (k: HelperKind | SbZombieKind) => k !== 'zombie' || save.data.zombieAlly;

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
  m.extraBosses = m.extraBosses.filter((b) => b.kind in BOSS_HP && (!(SECRET_KINDS as string[]).includes(b.kind) || save.data.secrets.includes(b.kind)) && (b.kind !== 'pigeon' || pigeonOpen()));
  m.helpers = (m.helpers ?? []).filter((x) => (HELPER_KINDS.includes(x.kind as HelperKind) || isSbZombie(x.kind)) && helperOpen(x.kind));
  m.clones = (m.clones ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < m.slots.length);
  if (!maps.some((x) => x.id === m.mapId)) m.mapId = 'arena';

  const body = h('div', { class: 'page-body' });
  const errorEl = h('p', { class: 'error' });
  const render = () => keepScroll(body.parentElement ?? body, paint);

  const teams = () => new Set([...m.slots.map((s) => s.team), ...m.extraBosses!.map((b) => b.team)]);
  const validate = () => {
    if (!m.slots.length && !m.extraBosses!.length) return t('sbEmpty');
    // Free for all: any two of anything can fight.
    if (m.ffa) return m.slots.length + m.extraBosses!.length + counted(m.helpers!) + zombieCount(m.helpers!) + m.clones!.length >= 2 ? '' : t('needTwo');
    if (teams().size < 2) return t('sbNeedTwoTeams');
    return '';
  };

  const teamPicker = (o: { team: number }) =>
    m.ffa
      ? null
      : h(
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
    return h('label', { class: 'field' }, h('small', {}, `⚙ ${t('level')}`), sel);
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
        // Players get an empty spot where bots pick their level, so the columns line up.
        human ? h('span', { class: 'field ghost' }) : diffSel(s),
        hpBox(s, 500),
        powerSel(s),
        hatSelect(s, !human),
        teamPicker(s),
        removeBtn(() => {
          m.slots.splice(i, 1);
          // Clones of this fighter go too; the others keep pointing at the same fighter.
          m.clones = m.clones!.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c));
        }),
      );
    });
    // Names of the players and bots, in slot order (what a Clone can copy).
    const slotNames = (() => {
      let pp = 0;
      let bb = 0;
      return m.slots.map((s) => (s.kind === 'human' ? `🎮 ${localName(pp++)}` : `🤖 ${t('bot', { n: ++bb })}`));
    })();
    const cloneRows = m.clones!.map((of, i) => {
      const sel = h(
        'select',
        {
          'aria-label': t('sbCloneOf'),
          onchange: (e: Event) => {
            m.clones![i] = Number((e.target as HTMLSelectElement).value);
            render();
          },
        },
        ...slotNames.map((n, si) => h('option', { value: String(si) }, n)),
      );
      sel.value = String(of);
      const team = m.slots[of]?.team ?? 0;
      return h(
        'div',
        { class: 'slot' },
        h('span', { class: 'slot-name', style: `--c:${TEAM_COLORS[team]}` }, `👥 ${t('sbClones')}`),
        h('label', { class: 'field' }, h('small', {}, t('sbCloneOf')), sel),
        h('small', { class: 'muted' }, `❤️ ${m.slots[of]?.hp ?? 500}`),
        removeBtn(() => m.clones!.splice(i, 1)),
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
    const helperRow = (hp: SandboxHelper) =>
      h(
        'div',
        { class: 'slot' },
        h('span', { class: 'slot-name', style: `--c:${TEAM_COLORS[hp.team]}` }, `${HELPER_ICON[hp.kind]} ${t(`helper.${hp.kind}` as Key)}`),
        h('small', { class: 'muted' }, hp.kind === 'chick' ? `×${SB_CHICKS} ❤️ ${HELPER_HP.chick}` : `❤️ ${HELPER_HP[hp.kind].toLocaleString()}`),
        teamPicker(hp),
        removeBtn(() => m.helpers!.splice(m.helpers!.indexOf(hp), 1)),
      );
    const helperRows = m.helpers!.filter((x) => !isSbZombie(x.kind)).map(helperRow);
    const zombieRows = m.helpers!.filter((x) => isSbZombie(x.kind)).map(helperRow);
    const addZombie = (kind: SbZombieKind) =>
      h(
        'button',
        {
          class: 'btn small',
          disabled: zombieCount(m.helpers!) >= MAX_SB_ZOMBIES,
          onclick: () => {
            m.helpers!.push({ kind, team: 1 });
            render();
          },
        },
        `+ ${HELPER_ICON[kind]} ${t(`helper.${kind}` as Key)}`,
      );
    const addHelper = (kind: HelperKind) =>
      h(
        'button',
        {
          class: 'btn small',
          disabled: kind !== 'chick' && counted(m.helpers!) >= MAX_SB_HELPERS,
          onclick: () => {
            m.helpers!.push({ kind, team: 1 });
            render();
          },
        },
        `+ ${HELPER_ICON[kind]} ${t(`helper.${kind}` as Key)}`,
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

    // Lots of bots, bosses, helpers, zombies and Clones: the Sandbox music turns into hard rock.
    playMusic(sandboxCrowd(m) > SB_ROCK_AT ? 'rock' : 'sandbox');
    const err = validate();
    errorEl.textContent = err;
    startBtn.disabled = !!err;
    body.replaceChildren(
      h(
        'section',
        {},
        h('p', { class: 'muted' }, t('sandboxDesc')),
        // Free for all: nobody is on anybody's team.
        h(
          'label',
          { class: 'switch-row' },
          h('input', {
            type: 'checkbox',
            checked: !!m.ffa,
            onchange: (e: Event) => {
              m.ffa = (e.target as HTMLInputElement).checked;
              render();
            },
          }),
          h('b', {}, `🥊 ${t('sbFfa')}`),
          h('small', { class: 'muted' }, t('sbFfaDesc')),
        ),
      ),
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
        h('h3', {}, `${t('fighters')} (${m.slots.length}/${MAX_SB_FIGHTERS})`),
        h(
          'div',
          { class: 'row gap wrap' },
          h(
            'button',
            {
              class: 'btn small',
              disabled: humans >= MAX_SB_PLAYERS || m.slots.length >= MAX_SB_FIGHTERS,
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
              disabled: m.slots.length >= MAX_SB_FIGHTERS,
              onclick: () => {
                m.slots.push({ kind: 'bot', weapon: 'random', team: 1, difficulty: 'medium', hp: 500, power: 100 });
                render();
              },
            },
            `${t('addBot')} ${bots}/${MAX_SB_FIGHTERS - humans}`,
          ),
        ),
        h('div', { class: `slots tidy ${m.ffa ? 'cols-sb-ffa' : 'cols-sb'}` }, ...fighterRows),
      ),
      // Bosses get their own box, so the fighters' rows and the bosses' rows each line up.
      h(
        'section',
        {},
        h('h3', {}, `👹 ${t('sbBosses')} (${m.extraBosses!.length}/${MAX_SB_BOSSES})`),
        h(
          'div',
          { class: 'row gap wrap' },
          addBoss('boss'),
          addBoss('cat'),
          addBoss('mascot'),
          addBoss('buffalo'),
          addBoss('fish'),
          pigeonOpen() ? addBoss('pigeon') : null,
          // Secret bosses stay hidden until you unlock them.
          ...SECRET_KINDS.filter((k) => save.data.secrets.includes(k)).map(addBoss),
          ...XBOSS_KINDS.map(addBoss),
        ),
        h('div', { class: `slots tidy ${m.ffa ? 'cols-boss-ffa' : 'cols-boss'}` }, ...bossRows),
      ),
      h(
        'section',
        {},
        h('h3', {}, `${t('helpers')} (${counted(m.helpers!)}/${MAX_SB_HELPERS})`),
        h('p', { class: 'muted small' }, t('helpersDesc')),
        h('div', { class: 'row gap wrap' }, ...HELPER_KINDS.filter(helperOpen).map(addHelper)),
        save.data.zombieAlly ? null : h('small', { class: 'muted' }, `🔒 🧟 ${t('zombieLocked')}`),
        h('div', { class: 'slots' }, ...helperRows),
      ),
      h(
        'section',
        {},
        h('h3', {}, `🧟 ${t('sbZombies')} (${zombieCount(m.helpers!)}/${MAX_SB_ZOMBIES})`),
        h('p', { class: 'muted small' }, t('sbZombiesDesc')),
        h('div', { class: 'row gap wrap' }, ...SB_ZOMBIE_KINDS.map(addZombie)),
        h('div', { class: 'slots' }, ...zombieRows),
      ),
      h(
        'section',
        {},
        h('h3', {}, `👥 ${t('sbClones')} (${m.clones!.length}/${MAX_SB_CLONES})`),
        h('p', { class: 'muted small' }, t('sbClonesDesc')),
        h(
          'div',
          { class: 'row gap wrap' },
          h(
            'button',
            {
              class: 'btn small',
              disabled: m.clones!.length >= MAX_SB_CLONES || !m.slots.length,
              onclick: () => {
                m.clones!.push(0);
                render();
              },
            },
            t('sbAddClone'),
          ),
        ),
        h('div', { class: 'slots' }, ...cloneRows),
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
