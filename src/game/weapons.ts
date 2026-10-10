export type WeaponId = 'sword' | 'spear' | 'hammer' | 'bow' | 'boomerang' | 'bomb' | 'katana' | 'snowball' | 'axe' | 'shuriken' | 'laser' | 'staff' | 'six7' | 'poop' | 'treasure' | 'soup' | 'catcall' | 'ice' | 'thunder' | 'banana' | 'stick' | 'mascotstick'
  | 'firesword' | 'recall' | 'dart' | 'glove' | 'magnet' | 'rocket' | 'horns' | 'headbutt' | 'trident';

export interface WeaponDef {
  id: WeaponId;
  price: number;
  /** Reach from the hand to the tip, in world pixels (before fighter scale). */
  length: number;
  /** Melee damage for a full-speed swing. */
  damage: number;
  /** How fast the weapon turns toward the joystick direction (radians per second). */
  turn: number;
  /** Seconds between skills. */
  cooldown: number;
  /** Bots keep their distance with these. */
  ranged: boolean;
  /** Not sold in the shop: 'boss' = only a boss holds it, 'reward' = won by beating a boss. */
  special?: 'boss' | 'reward';
}

export const WEAPONS: WeaponDef[] = [
  { id: 'sword', price: 0, length: 72, damage: 30, turn: 16, cooldown: 2.5, ranged: false },
  { id: 'spear', price: 0, length: 110, damage: 24, turn: 12, cooldown: 2.5, ranged: false },
  { id: 'hammer', price: 200, length: 84, damage: 42, turn: 9, cooldown: 3.5, ranged: false },
  { id: 'bow', price: 250, length: 40, damage: 10, turn: 14, cooldown: 0.9, ranged: true },
  { id: 'boomerang', price: 300, length: 40, damage: 14, turn: 14, cooldown: 0.4, ranged: true },
  { id: 'bomb', price: 350, length: 30, damage: 10, turn: 14, cooldown: 2.5, ranged: true },
  { id: 'katana', price: 400, length: 84, damage: 32, turn: 18, cooldown: 4.5, ranged: false },
  { id: 'snowball', price: 500, length: 20, damage: 6, turn: 14, cooldown: 0.45, ranged: true },
  { id: 'axe', price: 450, length: 78, damage: 38, turn: 11, cooldown: 3, ranged: false },
  { id: 'shuriken', price: 550, length: 24, damage: 8, turn: 14, cooldown: 1.2, ranged: true },
  { id: 'laser', price: 600, length: 46, damage: 10, turn: 14, cooldown: 1.6, ranged: true },
  { id: 'staff', price: 700, length: 74, damage: 16, turn: 12, cooldown: 2.8, ranged: true },
  { id: 'six7', price: 670, length: 64, damage: 34, turn: 12, cooldown: 10, ranged: false },
  { id: 'poop', price: 299, length: 30, damage: 20, turn: 14, cooldown: 1, ranged: true },
  { id: 'treasure', price: 0, length: 40, damage: 14, turn: 13, cooldown: 2.5, ranged: true, special: 'reward' },
  { id: 'soup', price: 0, length: 40, damage: 24, turn: 10, cooldown: 2.5, ranged: true, special: 'boss' },
  { id: 'catcall', price: 0, length: 26, damage: 10, turn: 10, cooldown: 8, ranged: true, special: 'boss' },
  { id: 'ice', price: 650, length: 62, damage: 18, turn: 13, cooldown: 2.5, ranged: true },
  { id: 'thunder', price: 800, length: 80, damage: 36, turn: 9, cooldown: 4, ranged: false },
  { id: 'banana', price: 250, length: 26, damage: 12, turn: 14, cooldown: 1.8, ranged: true },
  { id: 'stick', price: 0, length: 90, damage: 50, turn: 10, cooldown: 6, ranged: false, special: 'boss' },
  { id: 'mascotstick', price: 0, length: 90, damage: 30, turn: 11, cooldown: 6, ranged: false, special: 'reward' },
  { id: 'firesword', price: 500, length: 78, damage: 35, turn: 15, cooldown: 5, ranged: false },
  { id: 'recall', price: 1000, length: 22, damage: 20, turn: 14, cooldown: 5, ranged: false },
  { id: 'dart', price: 400, length: 30, damage: 15, turn: 14, cooldown: 1.5, ranged: true },
  { id: 'glove', price: 350, length: 36, damage: 22, turn: 15, cooldown: 3, ranged: false },
  { id: 'magnet', price: 450, length: 40, damage: 14, turn: 13, cooldown: 5, ranged: false },
  { id: 'rocket', price: 750, length: 56, damage: 12, turn: 12, cooldown: 4, ranged: true },
  // Buffalo has no normal attack: its horns and head only hurt with its skills.
  { id: 'horns', price: 0, length: 60, damage: 0, turn: 10, cooldown: 5, ranged: false, special: 'boss' },
  { id: 'headbutt', price: 0, length: 40, damage: 0, turn: 10, cooldown: 4, ranged: false, special: 'boss' },
  { id: 'trident', price: 0, length: 110, damage: 30, turn: 10, cooldown: 3.5, ranged: false, special: 'boss' },
];

/** Weapons you can buy in the shop or roll at random (no boss or reward weapons). */
export const SHOP_WEAPONS = WEAPONS.filter((w) => !w.special);

/** Every weapon you can own: the shop plus the boss rewards. */
export const ALL_OWNABLE = WEAPONS.filter((w) => w.special !== 'boss');

/** The shop weapons from before the Fire Sword update: owning these unlocks the Mascot (new weapons don't lock it again). */
export const MASCOT_WEAPONS = ['sword', 'spear', 'hammer', 'bow', 'boomerang', 'bomb', 'katana', 'snowball', 'axe', 'shuriken', 'laser', 'staff', 'six7', 'poop', 'ice', 'thunder', 'banana'];

export function weapon(id: string): WeaponDef {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
}
