import type { MapDef, MatchConfig, Mode } from '../game/types';
import { playMusic } from '../music';
import { sfx } from '../sfx';

export interface Routes {
  menu: undefined;
  lobby: { mapId?: string; mode?: Mode } | undefined;
  shop: undefined;
  settings: undefined;
  maps: undefined;
  editor: { map: MapDef };
  play: { match: MatchConfig; fromEditor?: MapDef };
  online: { code?: string } | undefined;
  room: undefined;
  netplay: undefined;
  friends: undefined;
  achievements: undefined;
  sandbox: undefined;
  stickbrawl: undefined;
  worst: undefined;
  worst2: undefined;
  sf2: undefined;
  arena: undefined;
  versions: undefined;
  outbreak: undefined;
  outbreakLobby: { slot: number };
  funModes: undefined;
  td: undefined;
  tdPlay: { mapId: string };
  chef: { tab?: 'home' | 'build' | 'staff' | 'menu' | 'reviews' } | undefined;
  chefDay: undefined;
}

export type Screen<K extends keyof Routes> = (root: HTMLElement, arg: Routes[K]) => (() => void) | void;

const screens: Partial<{ [K in keyof Routes]: Screen<K> }> = {};
let cleanup: (() => void) | void;
let root: HTMLElement;

export function initRouter(el: HTMLElement) {
  root = el;
}

export function register<K extends keyof Routes>(name: K, s: Screen<K>) {
  (screens as Record<string, unknown>)[name] = s;
}

export function go<K extends keyof Routes>(name: K, ...arg: undefined extends Routes[K] ? [Routes[K]?] : [Routes[K]]) {
  cleanup?.();
  cleanup = undefined;
  root.replaceChildren();
  root.scrollTop = 0;
  const s = screens[name] as Screen<K>;
  // Menus play the title theme; Sandbox has its own. Matches pick their own music, and Stick Brawl has none.
  if (name !== 'play' && name !== 'netplay' && name !== 'stickbrawl' && name !== 'worst2' && name !== 'arena' && name !== 'sf2') playMusic(name === 'sandbox' ? 'sandbox' : 'menu');
  sfx.transition();
  cleanup = s(root, arg[0] as Routes[K]);
}
