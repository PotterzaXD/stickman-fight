import { WEAPONS } from '../game/weapons';
import { achName, grant } from '../achievements';
import { t, type Key } from '../i18n';
import { save } from '../save';
import { sfx } from '../sfx';
import { confirmBox, h, toast } from './dom';
import { weaponIcon } from './icons';
import { coinChip } from './menu';
import { go, register } from './router';

register('shop', (root) => {
  const grid = h('div', { class: 'shop-grid' });
  const head = h('header', { class: 'page-head' });

  const render = () => {
    head.replaceChildren(h('button', { class: 'btn ghost', onclick: () => go('menu') }, `← ${t('back')}`), h('h2', {}, t('shop')), coinChip());
    grid.replaceChildren(
      // Boss-only weapons are never shown; the Treasure shows as a reward to win.
      ...WEAPONS.filter((w) => w.special !== 'boss').map((w) => {
        const name = t(`w.${w.id}` as Key);
        const have = save.data.owned.includes(w.id);
        const afford = save.data.coins >= w.price;
        const buy = async () => {
          if (!afford) return toast(t('notEnough'));
          if (!(await confirmBox(t('confirmBuy', { name, price: w.price }), t('buy'), t('back')))) return;
          if (save.data.coins < w.price) return toast(t('notEnough'));
          save.update((d) => {
            d.coins -= w.price;
            if (!d.owned.includes(w.id)) d.owned.push(w.id);
          });
          sfx.coin();
          toast(t('bought', { name }));
          // Owning every weapon earns Collector.
          for (const id of grant([])) setTimeout(() => toast(t('achNew', { name: achName(id) })), 1200);
          render();
        };
        return h(
          'div',
          { class: `shop-card ${have ? 'have' : ''}` },
          h('div', { class: 'shop-icon' }, weaponIcon(w.id, 64)),
          h('h3', {}, name),
          h('p', { class: 'muted small' }, t(`s.${w.id}` as Key)),
          w.special === 'reward'
            ? h('span', { class: 'badge' }, have ? `🏆 ${t('owned')}` : `🔒 ${t(w.id === 'mascotstick' ? 'rewardMascot' : 'rewardOnly')}`)
            : have
            ? h('span', { class: 'badge' }, w.price === 0 ? t('free') : `✔ ${t('owned')}`)
            : h('button', { class: `btn ${afford ? 'primary' : ''}`, onclick: buy }, `🪙 ${w.price}`),
        );
      }),
    );
  };
  render();
  root.append(h('div', { class: 'page' }, head, h('div', { class: 'page-body' }, grid)));
});
