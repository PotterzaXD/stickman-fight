import { stopMusic } from '../music';
import { t } from '../i18n';
import { h } from './dom';
import { go, register, type Routes } from './router';

/**
 * Games that run in their own frame (public/worst2, public/arena), like WORST Stickman Fighter.
 * Their money stays inside them, separate from Stickman Fight's coins. "← Stickman Fight" comes back to Other Versions.
 */
function framePage(route: keyof Routes & ('worst2' | 'arena' | 'sf2'), src: string, title: string, exit: string) {
  register(route, (root) => {
    stopMusic();
    const frame = h('iframe', { class: 'stickbrawl-frame worst-frame', src, title }) as HTMLIFrameElement;
    root.append(frame);
    frame.focus();
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && e.source === frame.contentWindow && e.data?.type === exit) go('versions');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });
}

framePage('worst2', '/worst2/index.html', t('worst2Game'), 'worst2-exit');
framePage('arena', '/arena/index.html', t('arenaGame'), 'arena-exit');
// Stickman Fight 2: only shows up in Other versions after you go through the Portal map's portal.
framePage('sf2', '/sf2/index.html', t('sf2Game'), 'sf2-exit');
