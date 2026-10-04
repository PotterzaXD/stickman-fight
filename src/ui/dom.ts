import { sfx } from '../sfx';

type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;
type Child = Node | string | null | undefined | false;

/** Tiny element builder: h('button', { class: 'btn', onclick: fn }, 'Text'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      const fn = v;
      el.addEventListener(k.slice(2), (e) => {
        if (k === 'onclick') sfx.click();
        fn(e);
      });
    } else if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  return el;
}

export function toast(msg: string) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

export function confirmBox(msg: string, okText: string, cancelText: string): Promise<boolean> {
  return new Promise((resolve) => {
    const close = (v: boolean) => {
      wrap.remove();
      resolve(v);
    };
    const wrap = h(
      'div',
      { class: 'modal-wrap' },
      h(
        'div',
        { class: 'modal' },
        h('p', {}, msg),
        h('div', { class: 'row gap' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, cancelText), h('button', { class: 'btn primary', onclick: () => close(true) }, okText)),
      ),
    );
    document.body.append(wrap);
  });
}

export async function shareLink(url: string, title: string, text: string, copiedMsg: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(copiedMsg);
  } catch {
    prompt(title, url);
  }
}
