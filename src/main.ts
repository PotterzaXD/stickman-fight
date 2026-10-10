import './style.css';
import { initCloud } from './cloud';
import { initFriends } from './friends';
import { decodeMap } from './game/maps';
import { t } from './i18n';
import { save } from './save';
import { sfx } from './sfx';
import { h, toast } from './ui/dom';
import { go, initRouter } from './ui/router';
import './ui/menu';
import './ui/lobby';
import './ui/play';
import './ui/shop';
import './ui/settings';
import './ui/editor';
import './ui/online';
import './ui/roomScreen';
import './ui/netplay';
import './ui/friends';
import './ui/achievements';
import './ui/sandbox';
import { session, setSession } from './net/room';

const app = document.getElementById('app')!;
initRouter(app);

// Keep the page language and coin chips in sync with the save.
const syncUi = () => {
  document.documentElement.lang = save.data.settings.lang;
  document.title = t('title');
  for (const el of document.querySelectorAll('.chip.coin')) el.textContent = `🪙 ${save.data.coins}`;
};
let lastLang = save.data.settings.lang;
save.onChange(() => {
  syncUi();
  // Language changed: redraw the screen you are on.
  if (save.data.settings.lang !== lastLang) {
    lastLang = save.data.settings.lang;
    go('settings');
  }
});
syncUi();

// A shared map link: ?map=...
const params = new URLSearchParams(location.search);
const code = params.get('map');
if (code) {
  const m = decodeMap(code);
  if (m) {
    save.update((d) => d.customMaps.push(m));
    setTimeout(() => toast(t('mapImported', { name: m.name })), 300);
  }
  history.replaceState(null, '', location.pathname);
}

// Phones only allow sound after a tap.
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
// No pinch-zoom or double-tap zoom while fighting.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Closing the tab tells the room you left.
window.addEventListener('pagehide', () => session() && setSession(null));

void initCloud();
initFriends();

// First visit on this device: a welcome message. After "Thank you" it never shows again.
const WELCOME_KEY = 'stickman-fight-welcomed';
let welcomed = false;
try {
  welcomed = localStorage.getItem(WELCOME_KEY) === '1';
} catch {
  /* storage blocked: show it */
}
if (!welcomed) {
  const wrap = h(
    'div',
    { class: 'modal-wrap welcome' },
    h(
      'div',
      { class: 'modal' },
      h('h2', {}, `👋 ${t('title')}`),
      h('p', {}, t('welcomeText')),
      h(
        'button',
        {
          class: 'btn big primary',
          onclick: () => {
            try {
              localStorage.setItem(WELCOME_KEY, '1');
            } catch {
              /* ignore */
            }
            wrap.remove();
          },
        },
        t('thankYou'),
      ),
    ),
  );
  document.body.append(wrap);
}
// An invite link: ?room=CODE
const roomCode = params.get('room');
if (roomCode) {
  history.replaceState(null, '', location.pathname);
  go('online', { code: roomCode });
} else go('menu');
