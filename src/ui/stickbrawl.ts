import { stopMusic } from '../music';
import { h } from './dom';
import { go, register } from './router';

/**
 * Stick Brawl: a separate game that runs in its own frame (public/stickbrawl).
 * It has its own save and its own money (gold), and shares nothing with Stickman Fight.
 */
register('stickbrawl', (root) => {
  stopMusic();
  const frame = h('iframe', { class: 'stickbrawl-frame', src: '/stickbrawl/index.html', title: 'Stick Brawl' }) as HTMLIFrameElement;
  root.append(frame);
  frame.focus();
  // Its Exit Game and Quit Game buttons come back to Other Versions.
  const onMessage = (e: MessageEvent) => {
    if (e.origin === location.origin && e.source === frame.contentWindow && e.data?.type === 'stickbrawl-exit') go('versions');
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
});
