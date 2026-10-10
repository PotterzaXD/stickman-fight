import type { MapDef, MatchConfig } from '../game/types';

export interface Routes {
  menu: undefined;
  lobby: { mapId?: string } | undefined;
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
  cleanup = s(root, arg[0] as Routes[K]);
}
