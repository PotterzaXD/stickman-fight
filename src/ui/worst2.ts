import { stopMusic } from '../music';
import { t } from '../i18n';
import { h } from './dom';
import { go, register, type Routes } from './router';

/**
 * Games that run in their own frame (public/worst2, public/arena), like WORST Stickman Fighter.
 * Their money stays inside them, separate from Stickman Fight's coins. "← Stickman Fight" comes back to the menu.
 */
function framePage(route: keyof Routes & ('worst2' | 'arena'), src: string, title: string, exit: string) {
  register(route, (root) => {
    stopMusic();
    const frame = h('iframe', { class: 'stickbrawl-frame worst-frame', src, title }) as HTMLIFrameElement;
    root.append(frame);
    frame.focus();
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && e.source === frame.contentWindow && e.data?.type === exit) go('menu');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });
}

framePage('worst2', '/worst2/index.html', t('worst2Game'), 'worst2-exit');
framePage('arena', '/arena/index.html', t('arenaGame'), 'arena-exit');
