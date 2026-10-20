import { applyVolumes } from '../audio';
import { sfx } from '../sfx';
import { cloudEnabled, currentUser, onUserChange, signIn, signOut } from '../cloud';
import { t, type Lang } from '../i18n';
import { save } from '../save';
import { h, toast } from './dom';
import { nameInput } from './lobby';
import { shareGame } from './menu';
import { go, register } from './router';

register('settings', (root) => {
  const page = h('div', { class: 'page' });
  let alive = true;

  const seg = <T extends string>(value: T, options: [T, string][], set: (v: T) => void) =>
    h(
      'div',
      { class: 'segs' },
      ...options.map(([v, label]) =>
        h(
          'button',
          {
            class: `seg ${value === v ? 'on' : ''}`,
            onclick: () => {
              save.update(() => set(v));
              render();
            },
          },
          label,
        ),
      ),
    );

  const accountBox = () => {
    if (!cloudEnabled) return h('p', { class: 'muted' }, t('cloudNotSetup'));
    const u = currentUser();
    if (u)
      return h(
        'div',
        { class: 'col gap' },
        h('p', {}, t('signedInAs', { name: u.name })),
        h('button', { class: 'btn ghost', onclick: () => void signOut() }, t('signOut')),
      );
    return h(
      'div',
      { class: 'col gap' },
      h('p', { class: 'muted' }, t('guest')),
      h(
        'button',
        {
          class: 'btn google',
          onclick: async () => {
            try {
              await signIn();
            } catch (e) {
              console.warn(e);
              toast(t('signInFailed'));
            }
          },
        },
        h('span', { class: 'g' }, 'G'),
        t('signIn'),
      ),
    );
  };

  /** A 0-100% slider with its own mute button. Saved on this device right away. */
  const volumeRow = (icon: string, label: string, key: 'musicVol' | 'sfxVol', muteKey: 'musicMute' | 'sfxMute') => {
    const s = save.data.settings;
    const pct = h('b', { class: 'vol-pct' }, `${s[key]}%`);
    const slider = h('input', {
      type: 'range',
      min: '0',
      max: '100',
      step: '5',
      value: String(s[key]),
      class: 'vol-slider',
      'aria-label': label,
      oninput: (e: Event) => {
        const v = Number((e.target as HTMLInputElement).value);
        pct.textContent = `${v}%`;
        save.data.settings[key] = v;
        applyVolumes();
      },
      onchange: () => {
        save.update(() => {});
        if (key === 'sfxVol') sfx.coin();
      },
    }) as HTMLInputElement;
    if (s[muteKey]) slider.disabled = true;
    return h(
      'section',
      {},
      h('h3', {}, `${s[muteKey] ? '🔇' : icon} ${label}`),
      h(
        'div',
        { class: 'row gap vol-row' },
        slider,
        pct,
        h(
          'button',
          {
            class: `btn small ${s[muteKey] ? 'primary' : 'ghost'}`,
            onclick: () => {
              save.update((d) => (d.settings[muteKey] = !d.settings[muteKey]));
              applyVolumes();
              render();
            },
          },
          s[muteKey] ? `🔈 ${t('unmute')}` : `🔇 ${t('mute')}`,
        ),
      ),
    );
  };

  const render = () => {
    if (!alive) return;
    const s = save.data.settings;
    page.replaceChildren(
      h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, t('settings')), h('div', {})),
      h(
        'div',
        { class: 'page-body narrow' },
        h('section', {}, h('h3', {}, `🏷️ ${t('yourName')}`), nameInput(0)),
        h('section', {}, h('h3', {}, `🌐 ${t('language')}`), seg<Lang>(s.lang, [['en', 'English'], ['th', 'ไทย']], (v) => (save.data.settings.lang = v))),
        h('section', {}, h('h3', {}, `🕳️ ${t('fallOff')}`), seg(s.fallMode, [['ko', t('fallKO')], ['bounce', t('fallBounce')]], (v) => (save.data.settings.fallMode = v))),
        h(
          'section',
          {},
          h('h3', {}, `🧪 ${t('potions')}`),
          seg(s.potions ? 'on' : 'off', [['on', t('on')], ['off', t('off')]], (v) => (save.data.settings.potions = v === 'on')),
          h('p', { class: 'muted small' }, t('potionsDesc')),
        ),
        h(
          'section',
          {},
          h('h3', {}, `💬 ${t('killFeed')}`),
          seg(s.killFeed !== false ? 'on' : 'off', [['on', t('on')], ['off', t('off')]], (v) => (save.data.settings.killFeed = v === 'on')),
          h('p', { class: 'muted small' }, t('killFeedDesc')),
        ),
        volumeRow('🎵', t('music'), 'musicVol', 'musicMute'),
        volumeRow('🔊', t('sfxLabel'), 'sfxVol', 'sfxMute'),
        h('section', {}, h('h3', {}, `☁️ ${t('account')}`), accountBox()),
        h('section', {}, h('button', { class: 'btn', onclick: shareGame }, `🔗 ${t('share')}`)),
      ),
    );
  };
  render();
  onUserChange(render);
  root.append(page);
  return () => {
    alive = false;
  };
});
