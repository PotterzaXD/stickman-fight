import { stopMusic } from '../music';
import { save } from '../save';
import { h } from './dom';
import { go } from './router';

let going = false;

/**
 * You went through the Portal map's portal: the whole screen fades to black, Stickman Fight 2 unlocks in Other versions,
 * and it opens. `leave` runs first (online: leave the room, or close it if you are the host).
 */
export function goThroughPortal(leave?: () => void) {
  if (going) return;
  going = true;
  save.update((d) => (d.sf2 = true));
  stopMusic();
  const fade = h('div', { class: 'portal-fade' });
  document.body.append(fade);
  requestAnimationFrame(() => fade.classList.add('on'));
  setTimeout(() => {
    leave?.();
    go('sf2');
    fade.remove();
    going = false;
  }, 1100);
}
