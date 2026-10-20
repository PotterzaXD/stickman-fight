import { stopMusic } from '../music';
import { h } from './dom';
import { go, register } from './router';

/**
 * WORST Stickman Fighter: a separate little game that runs in its own frame (public/worst).
 * It is not mixed into Stickman Fight. Its "← Stickman Fight" button comes back to Other Versions.
 */
register('worst', (root) => {
  stopMusic();
  const frame = h('iframe', { class: 'stickbrawl-frame worst-frame', src: '/worst/index.html', title: 'WORST Stickman Fighter' }) as HTMLIFrameElement;
  root.append(frame);
  frame.focus();
  const onMessage = (e: MessageEvent) => {
    if (e.origin === location.origin && e.source === frame.contentWindow && e.data?.type === 'worst-exit') go('versions');
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
});
