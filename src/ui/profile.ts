import { achHave, achTotal } from '../achievements';
import { cloudEnabled, currentUser, onUserChange } from '../cloud';
import { CLOTHES, CLOTH_SLOTS, type ClothSlot } from '../game/clothes';
import { HATS } from '../game/hats';
import { canUseFriends, friendList, onFriendsChange, refreshFriends } from '../friends';
import { t, type Key } from '../i18n';
import { save, type Outfit } from '../save';
import { h } from './dom';
import { hatIcon, outfitIcon } from './icons';
import { coinChip } from './menu';
import { go, register } from './router';

/** Colours to pick for your profile stickman. */
const COLORS = ['#1e88e5', '#e53935', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#ec407a', '#212121', '#795548'];

/** Your name as the menu and the profile show it. */
export function profileName(): string {
  return save.data.name || currentUser()?.name.split(' ')[0] || t('profileGuest');
}

/**
 * The profile: your stickman (top left) in the clothes you picked, when you joined, how many friends you have,
 * matches played and achievements. Below it you dress your stickman with the hats, shirts, pants and shoes you own.
 */
register('profile', (root) => {
  const body = h('div', { class: 'page-body narrow' });
  const dateFmt = (ms: number) =>
    new Date(ms).toLocaleDateString(save.data.settings.lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const setOutfit = (fn: (o: Outfit) => void) => {
    save.update((d) => fn(d.outfit));
    render();
  };

  const render = () => {
    const o = save.data.outfit;
    const u = currentUser();
    // Joined: the Google account's first sign-in, otherwise the first day on this device.
    const joined = u?.joined ? Math.min(u.joined, save.data.joined) : save.data.joined;
    const friends = canUseFriends() ? String(friendList().length) : cloudEnabled ? t('profileSignIn') : '—';
    const stat = (icon: string, label: string, value: string) => h('div', { class: 'profile-stat' }, h('span', { class: 'profile-stat-icon' }, icon), h('span', { class: 'muted' }, label), h('b', {}, value));
    const card = h(
      'section',
      { class: 'profile-card' },
      h('div', { class: 'profile-pic' }, outfitIcon(o, 120, 170)),
      h(
        'div',
        { class: 'profile-info' },
        h('h2', { class: 'profile-name' }, profileName()),
        stat('📅', t('profileJoined'), dateFmt(joined)),
        stat('👥', t('profileFriends'), friends),
        stat('⚔️', t('profileMatches'), save.data.stats.matches.toLocaleString()),
        stat('🏆', t('profileAch'), `${achHave()} / ${achTotal()}`),
        h('div', { class: 'row gap wrap' }, h('button', { class: 'btn small', onclick: () => go('settings') }, `✏️ ${t('profileEditName')}`), h('button', { class: 'btn small', onclick: () => go('achievements') }, `🏆 ${t('achievements')}`)),
      ),
    );

    const pick = (on: boolean, label: Node | string, onclick: () => void, title = '') => h('button', { class: `profile-item ${on ? 'on' : ''}`, onclick, title }, label);
    const noneBtn = (on: boolean, onclick: () => void) => pick(on, h('span', { class: 'profile-none' }, '🚫'), onclick, t('profileNone'));
    const hats = HATS.filter((x) => save.data.hats.includes(x.id));
    const slotRow = (slot: ClothSlot) => {
      const mine = CLOTHES.filter((c) => c.slot === slot && save.data.clothes.includes(c.id));
      return h(
        'div',
        { class: 'profile-slot' },
        h('h4', {}, t(`cloth.${slot}s` as Key)),
        h(
          'div',
          { class: 'profile-items' },
          noneBtn(o[slot] === 'none', () => setOutfit((x) => (x[slot] = 'none'))),
          ...mine.map((c) =>
            pick(o[slot] === c.id, outfitIcon({ hat: 'none', shirt: 'none', pants: 'none', shoes: 'none', color: '#9e9e9e', [slot]: c.id }, 48, 64), () => setOutfit((x) => (x[slot] = c.id)), t(`cloth.${c.id}` as Key)),
          ),
          mine.length ? null : h('small', { class: 'muted' }, t('profileBuyMore')),
        ),
      );
    };
    const dress = h(
      'section',
      {},
      h('h3', {}, `👕 ${t('profileCustomize')}`),
      h('h4', {}, t('profileColor')),
      h('div', { class: 'profile-items' }, ...COLORS.map((c) => h('button', { class: `profile-color ${o.color === c ? 'on' : ''}`, style: `background:${c}`, onclick: () => setOutfit((x) => (x.color = c)) }))),
      h(
        'div',
        { class: 'profile-slot' },
        h('h4', {}, t('hatsTab')),
        h(
          'div',
          { class: 'profile-items' },
          noneBtn(o.hat === 'none', () => setOutfit((x) => (x.hat = 'none'))),
          ...hats.map((x) => pick(o.hat === x.id, hatIcon(x.id, 44), () => setOutfit((y) => (y.hat = x.id)), t(`hat.${x.id}` as Key))),
          hats.length ? null : h('small', { class: 'muted' }, t('profileBuyMore')),
        ),
      ),
      ...CLOTH_SLOTS.map(slotRow),
      h('button', { class: 'btn primary', onclick: () => go('shop') }, `🛒 ${t('profileToShop')}`),
    );
    body.replaceChildren(card, dress);
  };

  render();
  void refreshFriends().catch(() => undefined);
  const offFriends = onFriendsChange(render);
  onUserChange(() => render());
  root.append(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, `👤 ${t('profile')}`), coinChip()),
      body,
    ),
  );
  return () => offFriends();
});
