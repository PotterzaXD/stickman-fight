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
        h('section', {}, h('h3', {}, `🔊 ${t('sound')}`), seg(s.sound ? 'on' : 'off', [['on', t('on')], ['off', t('off')]], (v) => (save.data.settings.sound = v === 'on'))),
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
