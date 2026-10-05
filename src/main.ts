import './style.css';
import { initCloud } from './cloud';
import { decodeMap } from './game/maps';
import { t } from './i18n';
import { save } from './save';
import { sfx } from './sfx';
import { toast } from './ui/dom';
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
// An invite link: ?room=CODE
const roomCode = params.get('room');
if (roomCode) {
  history.replaceState(null, '', location.pathname);
  go('online', { code: roomCode });
} else go('menu');
