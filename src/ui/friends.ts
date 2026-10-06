import { cloudEnabled, onUserChange, signIn } from '../cloud';
import {
  addFriend,
  canUseFriends,
  friendList,
  friendsMissing,
  inviteFriend,
  myFriendCode,
  normalizeFriendCode,
  onFriendsChange,
  refreshFriends,
  removeFriend,
  type Friend,
} from '../friends';
import { t } from '../i18n';
import { session } from '../net/room';
import { confirmBox, h, toast } from './dom';
import { go, register } from './router';

/** Invite button: sends once, then waits a moment before it can send again. */
export function inviteButton(f: Friend, room: string) {
  const btn = h(
    'button',
    {
      class: 'btn small primary',
      onclick: async () => {
        btn.disabled = true;
        const r = await inviteFriend(f.id, room);
        toast(t(r === 'ok' ? 'inviteSent' : r === 'wait' ? 'inviteWait' : 'friendFailed'));
        btn.textContent = r === 'ok' ? `✔ ${t('invite')}` : `📨 ${t('invite')}`;
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = `📨 ${t('invite')}`;
        }, 10_000);
      },
    },
    `📨 ${t('invite')}`,
  );
  return btn;
}

export function friendRow(f: Friend, ...extra: (Node | null)[]) {
  return h(
    'div',
    { class: 'slot friend' },
    h('span', { class: `presence ${f.online ? 'on' : ''}`, title: f.online ? t('online') : t('offline') }),
    h('div', { class: 'col' }, h('b', {}, f.name), h('small', { class: 'muted' }, `${f.online ? t('online') : t('offline')} · ${f.code}`)),
    h('div', { class: 'spacer' }),
    ...extra,
  );
}

register('friends', (root) => {
  const page = h('div', { class: 'page' });
  const body = h('div', { class: 'page-body narrow' });
  const codeIn = h('input', { class: 'code-box', maxlength: 8, placeholder: 'ABCD2345', autocomplete: 'off', 'aria-label': t('addFriend') });
  codeIn.addEventListener('input', () => (codeIn.value = normalizeFriendCode(codeIn.value)));
  const status = h('p', { class: 'error' });
  let alive = true;
  let adding = false;

  const back = () => (session() ? go('room') : go('menu'));

  const add = async () => {
    const code = normalizeFriendCode(codeIn.value);
    if (adding || code.length < 8) return;
    adding = true;
    status.textContent = '';
    const r = await addFriend(code);
    adding = false;
    if (r === 'ok') {
      codeIn.value = '';
      toast(t('friendAdded'));
    } else status.textContent = t(r === 'notFound' ? 'friendNotFound' : r === 'self' ? 'friendSelf' : 'friendFailed');
  };
  codeIn.addEventListener('keydown', (e) => e.key === 'Enter' && void add());

  const render = () => {
    if (!alive) return;
    const top = body.scrollTop;
    if (!canUseFriends()) {
      body.replaceChildren(
        h(
          'section',
          {},
          h('p', {}, t(cloudEnabled ? 'friendsNeedGoogle' : 'cloudNotSetup')),
          cloudEnabled
            ? h(
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
              )
            : null,
        ),
      );
      return;
    }
    const room = session()?.state?.code ?? '';
    const code = myFriendCode();
    const list = friendList();
    body.replaceChildren(
      ...(friendsMissing() ? [h('section', {}, h('p', { class: 'error' }, t('friendsNotSetup')))] : []),
      h(
        'section',
        {},
        h('h3', {}, `🪪 ${t('yourFriendCode')}`),
        h(
          'div',
          { class: 'row gap wrap' },
          h('div', { class: 'room-code' }, code || '…'),
          h(
            'button',
            {
              class: 'btn small',
              disabled: !code,
              onclick: async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  toast(t('codeCopied'));
                } catch {
                  prompt(t('yourFriendCode'), code);
                }
              },
            },
            `📋 ${t('copyCode')}`,
          ),
        ),
        h('p', { class: 'muted small' }, t('friendCodeHelp')),
      ),
      h('section', {}, h('h3', {}, `➕ ${t('addFriend')}`), h('div', { class: 'row gap wrap' }, codeIn, h('button', { class: 'btn big primary', onclick: () => void add() }, t('add'))), status),
      h(
        'section',
        {},
        h('h3', {}, `👥 ${t('myFriends')} (${list.length})`),
        list.length
          ? h(
              'div',
              { class: 'slots' },
              ...list.map((f) =>
                friendRow(
                  f,
                  room && f.online ? inviteButton(f, room) : null,
                  h(
                    'button',
                    {
                      class: 'icon-btn',
                      'aria-label': t('remove'),
                      onclick: async () => {
                        if (await confirmBox(t('confirmRemoveFriend', { name: f.name }), t('remove'), t('back'))) await removeFriend(f.id);
                      },
                    },
                    '✕',
                  ),
                ),
              ),
            )
          : h('p', { class: 'muted' }, t('noFriends')),
      ),
    );
    body.scrollTop = top;
  };

  page.append(h('header', { class: 'page-head' }, h('button', { class: 'btn ghost', onclick: back }, `← ${t('back')}`), h('h2', {}, `👥 ${t('friends')}`), h('div', {})), body);
  root.append(page);
  render();
  const off = onFriendsChange(render);
  onUserChange(render);
  const refresh = () => canUseFriends() && void refreshFriends().catch((e) => console.warn(e));
  refresh();
  const timer = window.setInterval(refresh, 20_000);
  return () => {
    alive = false;
    off();
    clearInterval(timer);
  };
});
