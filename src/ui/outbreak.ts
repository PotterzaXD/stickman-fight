import type { Game, MatchResult } from '../game/game';
import type { Fighter } from '../game/entities';
import { allMaps } from '../game/maps';
import { OUTBREAK } from '../game/outbreak';
import { PIGEON_MAX, type Difficulty, type MatchConfig, type OutbreakInfo, type SlotConfig } from '../game/types';
import { WEAPONS } from '../game/weapons';
import { grant } from '../achievements';
import { t, type Key } from '../i18n';
import { OB_SLOTS, save, type OutbreakSave } from '../save';
import { sfx } from '../sfx';
import { confirmBox, h, toast } from './dom';
import { mapThumb } from './icons';
import { MAX_PLAYERS, hatSelect, keepScroll, mapLabel, nameInput, slotLooks } from './lobby';
import { coinChip } from './menu';
import { go, register } from './router';

/** The Outbreak: coins for each wave cleared, and the big prize for wave 50 on an Until 50 save. */
export const waveCoins = (wave: number) => 20 + 5 * wave;
export const WAVE50_COINS = 10000;
/** The zombie ally unlocks for beating this wave. */
export const ZOMBIE_WAVE = 10;

/** One zombie ally for every 10 waves (the first one from wave 10). */
export const alliesFor = (wave: number) => Math.floor(wave / 10);

export function outbreakInfo(slot: OutbreakSave): OutbreakInfo {
  return { wave: slot.wave, endless: slot.endless, allies: alliesFor(slot.wave) };
}

function newSlot(endless: boolean): OutbreakSave {
  return { wave: 1, endless, lives: [], best: 0, setup: defaultSetup() };
}

function defaultSetup(): MatchConfig {
  return { mode: 'outbreak', mapId: 'graveyard', slots: [{ kind: 'human', weapon: 'sword', team: 0, difficulty: 'medium' }] };
}

/** Lives left for each fighter in a save (new fighters start with all 5). */
export const livesOf = (slot: OutbreakSave, i: number) => slot.lives[i] ?? OUTBREAK.lives;

/**
 * After a wave: coins, the zombie ally, achievements, and (for the save's owner) the save itself.
 * `slotIdx` is null on a joining device online (the host keeps the save). Returns the result screen lines.
 */
export function afterWave(game: Game, r: Pick<MatchResult, 'winnerTeam'>, slotIdx: number | null, mine: Fighter[]): HTMLElement[] {
  const ob = game.ob;
  if (!ob) return [];
  const cleared = r.winnerTeam === 0;
  const wave = ob.wave;
  const out: HTMLElement[] = [];
  let coins = cleared ? waveCoins(wave) : mine.length ? 1 : 0;
  const won50 = cleared && !ob.endless && wave >= 50;
  if (won50) coins += WAVE50_COINS;
  const zombie = cleared && wave >= ZOMBIE_WAVE && !save.data.zombieAlly && !save.data.pendingZombie && mine.length > 0;
  save.update((d) => {
    d.coins += coins;
    if (zombie) d.pendingZombie = true;
  });
  if (coins) {
    setTimeout(() => sfx.coin(), 400);
    out.push(h('p', { class: 'coins-earned' }, `🪙 ${t('coinsEarned', { n: coins })}`, h('small', {}, ` (${save.data.coins})`)));
  }
  if (won50) out.push(h('p', { class: 'treasure-got' }, t('obWin50')));
  if (zombie) out.push(h('p', { class: 'treasure-got' }, t('obZombieSoon')));
  // Great Job Bud: reach wave 10 all by yourself (no bots, nobody else).
  const team = game.fighters.filter((f) => !f.horde && !f.boss && !f.cloneOf);
  const solo = team.length === 1 && mine.includes(team[0]) && team[0].human;
  // Halfway There: clear wave 25 (the zombies hit 1.5× as hard by then).
  const ach = grant([...(cleared && solo && wave + 1 >= ZOMBIE_WAVE ? (['greatJobBud'] as const) : []), ...(cleared && wave >= 25 ? (['halfway'] as const) : [])]);
  if (ach.length) setTimeout(() => sfx.achievement(), 900);
  for (const id of ach) out.push(h('p', { class: 'treasure-got' }, t('achNew', { name: t(`ach.${id}` as Key) })));
  if (slotIdx === null) return out;
  // The save: lives in the same order as the fighters, then the next wave (or the same one again).
  const slot = save.data.outbreak[slotIdx];
  if (!slot) return out;
  const specs = game.fighters.filter((f) => !f.horde && !f.boss && !f.cloneOf);
  const lives = specs.map((f) => f.lives);
  const allOut = !cleared && lives.every((l) => l <= 0);
  save.update((d) => {
    const s = d.outbreak[slotIdx];
    if (!s) return;
    s.lives = lives;
    if (cleared) {
      s.best = Math.max(s.best, wave);
      if (!s.endless && wave >= 50) s.done = true;
      else s.wave = wave + 1;
    } else if (allOut) {
      s.wave = 1;
      s.lives = [];
    }
  });
  if (!cleared) out.push(h('p', { class: 'muted' }, allOut ? t('obAllOut') : t('obTryAgain', { n: wave })));
  return out;
}

export function outbreakTitle(r: Pick<MatchResult, 'winnerTeam'>, wave: number): string {
  return r.winnerTeam === 0 ? `☀️ ${t('obCleared', { n: wave })}` : `🧟 ${t('obLost', { n: wave })}`;
}

/** "Wave 12 · Endless · Best: wave 11" */
function slotLine(s: OutbreakSave): string {
  return [s.done ? t('obDone') : t('obWave', { n: s.wave }), s.endless ? t('obEndless') : t('obUntil50'), s.best ? t('obBest', { n: s.best }) : ''].filter(Boolean).join(' · ');
}

// ---------- the save slots ----------

register('outbreak', (root) => {
  const body = h('div', { class: 'page-body' });
  const paint = () => {
    const cards = Array.from({ length: OB_SLOTS }, (_, i) => {
      const s = save.data.outbreak[i];
      const make = (endless: boolean) => {
        save.update((d) => (d.outbreak[i] = newSlot(endless)));
        go('outbreakLobby', { slot: i });
      };
      return h(
        'div',
        { class: 'ob-slot' },
        h('h3', {}, `💾 ${t('obSlot', { n: i + 1 })}`),
        s
          ? h(
              'div',
              { class: 'col gap' },
              h('p', {}, slotLine(s)),
              s.lives.length ? h('p', { class: 'muted small' }, `❤️ ${s.lives.map((l) => (l > 0 ? l : '💀')).join('  ')}`) : null,
              h(
                'div',
                { class: 'row gap' },
                h('button', { class: 'btn primary', onclick: () => go('outbreakLobby', { slot: i }) }, `▶ ${t('obContinue')}`),
                h(
                  'button',
                  {
                    class: 'btn ghost',
                    onclick: async () => {
                      if (!(await confirmBox(t('obDeleteConfirm'), t('obDelete'), t('back')))) return;
                      save.update((d) => (d.outbreak[i] = null));
                      paint();
                    },
                  },
                  `🗑 ${t('obDelete')}`,
                ),
              ),
            )
          : h(
              'div',
              { class: 'col gap' },
              h('p', { class: 'muted' }, t('obEmpty')),
              h('div', { class: 'row gap wrap' }, h('button', { class: 'btn', onclick: () => make(true) }, t('obNewEndless')), h('button', { class: 'btn', onclick: () => make(false) }, t('obNewUntil50'))),
            ),
      );
    });
    body.replaceChildren(
      h('section', {}, h('p', { class: 'muted' }, t('outbreakDesc')), h('p', { class: 'muted small' }, `🌐 ${t('obOnline')}`)),
      h('section', {}, h('h3', {}, t('obPick')), h('div', { class: 'ob-slots' }, ...cards)),
    );
  };
  paint();
  root.append(
    h(
      'div',
      { class: 'page outbreak-page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `🧟 ${t('outbreak')}`), coinChip()),
      body,
    ),
  );
});

// ---------- before each wave: fighters, hats, weapons and the map ----------

register('outbreakLobby', (root, { slot: idx }) => {
  const slot = save.data.outbreak[idx];
  if (!slot) return go('outbreak');
  const owned = save.data.owned;
  const maps = allMaps(save.data.customMaps);
  const m: MatchConfig = structuredClone(slot.setup ?? defaultSetup());
  m.mode = 'outbreak';
  m.obSlot = idx;
  for (const s of m.slots) if (s.weapon !== 'random' && !owned.includes(s.weapon)) s.weapon = 'sword';
  if (!maps.some((x) => x.id === m.mapId)) m.mapId = 'graveyard';
  const lives = [...slot.lives];

  const body = h('div', { class: 'page-body' });
  const errorEl = h('p', { class: 'error' });
  const render = () => keepScroll(body.parentElement ?? body, paint);
  const keep = () => save.update((d) => d.outbreak[idx] && ((d.outbreak[idx]!.setup = structuredClone(m)), (d.outbreak[idx]!.lives = [...lives])));

  const paint = () => {
    const looks = slotLooks(m);
    const humans = m.slots.filter((s) => s.kind === 'human').length;
    const weaponSelect = (s: SlotConfig) => {
      const sel = h(
        'select',
        { onchange: (e: Event) => (s.weapon = (e.target as HTMLSelectElement).value) },
        h('option', { value: 'random' }, `🎲 ${t('random')}`),
        ...WEAPONS.filter((w) => owned.includes(w.id)).map((w) => h('option', { value: w.id }, t(`w.${w.id}` as Key))),
      );
      sel.value = s.weapon;
      return sel;
    };
    const diffSelect = (s: SlotConfig) => {
      const sel = h('select', { onchange: (e: Event) => (s.difficulty = (e.target as HTMLSelectElement).value as Difficulty) }, ...(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => h('option', { value: d }, t(d))));
      sel.value = s.difficulty;
      return sel;
    };
    const rows = m.slots.map((s, i) => {
      const left = lives[i] ?? OUTBREAK.lives;
      return h(
        'div',
        { class: `slot ${left <= 0 ? 'ob-out' : ''}` },
        s.kind === 'human'
          ? h('span', { class: 'slot-name', style: `--c:${looks[i].color}` }, '🎮 ', nameInput(looks[i].playerIndex))
          : h('span', { class: 'slot-name', style: `--c:${looks[i].color}` }, '🤖 ', looks[i].name),
        h('span', { class: 'ob-lives', title: t('obLives') }, left > 0 ? `❤️×${left}` : `💀 ${t('obOut')}`),
        h('label', { class: 'field' }, h('small', {}, t('weapon')), weaponSelect(s)),
        s.kind === 'bot' ? h('label', { class: 'field' }, h('small', {}, '⚙'), diffSelect(s)) : null,
        hatSelect(s, s.kind === 'bot'),
        h(
          'button',
          {
            class: 'icon-btn',
            'aria-label': 'remove',
            onclick: () => {
              // Out of lives means out for good: they can't be swapped for someone fresh.
              if (left <= 0) return toast(t('obOutLocked'));
              m.slots.splice(i, 1);
              lives.splice(i, 1);
              render();
            },
          },
          '✕',
        ),
      );
    });
    const mapCards = maps.map((mp) =>
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
    );
    const add = (kind: 'human' | 'bot') => {
      m.slots.push({ kind, weapon: kind === 'bot' ? 'random' : 'sword', team: 0, difficulty: 'medium' });
      lives[m.slots.length - 1] = OUTBREAK.lives;
      render();
    };
    const full = m.slots.length >= PIGEON_MAX;
    const allies = alliesFor(slot.wave);
    errorEl.textContent = m.slots.some((_, i) => (lives[i] ?? OUTBREAK.lives) > 0) ? '' : t('obNeedOne');
    startBtn.disabled = !!errorEl.textContent || !!slot.done;
    body.replaceChildren(
      h(
        'section',
        {},
        h('h3', {}, `💾 ${t('obSlot', { n: idx + 1 })} · ${slotLine(slot)}`),
        h('p', { class: 'muted' }, t('outbreakDesc')),
        allies ? h('p', { class: 'muted' }, t('obAllies', { n: allies })) : null,
      ),
      h('section', {}, h('h3', {}, t('map')), h('div', { class: 'map-row' }, ...mapCards)),
      h(
        'section',
        {},
        h(
          'div',
          { class: 'row between' },
          h('h3', {}, `${t('fighters')} (${m.slots.length}/${PIGEON_MAX})`),
          h(
            'div',
            { class: 'row gap' },
            h('button', { class: 'btn small', disabled: humans >= MAX_PLAYERS || full, onclick: () => add('human') }, `${t('addPlayer')} ${humans}/${MAX_PLAYERS}`),
            h('button', { class: 'btn small', disabled: full, onclick: () => add('bot') }, t('addBot')),
          ),
        ),
        h('div', { class: 'slots' }, ...rows),
      ),
    );
  };

  const startBtn = h(
    'button',
    {
      class: 'btn big primary',
      onclick: () => {
        if (startBtn.disabled) return;
        keep();
        go('play', { match: structuredClone(m) });
      },
    },
    slot.done ? t('obDone') : t('obFight', { n: slot.wave }),
  );
  root.append(
    h(
      'div',
      { class: 'page' },
      h(
        'header',
        { class: 'page-head' },
        h('button', { class: 'btn ghost', onclick: () => (keep(), go('outbreak')) }, `← ${t('obBack')}`),
        h('h2', {}, `🧟 ${t('outbreak')}`),
        h('button', { class: 'btn ghost', onclick: () => (keep(), go('menu')) }, `🏠 ${t('menu')}`),
      ),
      body,
      h('footer', { class: 'page-foot' }, errorEl, startBtn),
    ),
  );
  paint();
});
