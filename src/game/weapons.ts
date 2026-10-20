export type WeaponId = 'sword' | 'spear' | 'hammer' | 'bow' | 'boomerang' | 'bomb' | 'katana' | 'snowball' | 'axe' | 'shuriken' | 'laser' | 'staff' | 'six7' | 'poop' | 'treasure' | 'soup' | 'catcall' | 'ice' | 'thunder' | 'banana' | 'stick' | 'mascotstick'
  | 'firesword' | 'recall' | 'dart' | 'glove' | 'magnet' | 'rocket' | 'horns' | 'headbutt' | 'trident'
  | 'scepter' | 'kingtrident' | 'vinestaff'
  | 'sniper' | 'shotgun' | 'pistol' | 'gun67' | 'summoner' | 'bravery' | 'pan' | 'watergun' | 'bubble' | 'beak'
  | 'chainsaw' | 'yoyo' | 'crossbow' | 'whip' | 'fryfish'
  | 'chicklord' | 'lilpigeon' | 'bone' | 'egg' | 'gum' | 'drumstick'
  | 'trunk' | 'pitchfork' | 'robocannon' | 'beehive' | 'ninjascroll' | 'trumpet' | 'plasma'
  | 'guitar' | 'bat' | 'slingshot' | 'flamethrower';

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
  // The Fishy boss's trident: beat the Fishy boss to own it (same power as the boss's).
  { id: 'trident', price: 0, length: 110, damage: 30, turn: 10, cooldown: 3.5, ranged: false, special: 'reward' },
  // The secret bosses: each takes turns between 3 skills.
  { id: 'scepter', price: 0, length: 90, damage: 30, turn: 10, cooldown: 3.2, ranged: true, special: 'boss' },
  { id: 'kingtrident', price: 0, length: 120, damage: 35, turn: 10, cooldown: 3.4, ranged: false, special: 'boss' },
  { id: 'vinestaff', price: 0, length: 100, damage: 30, turn: 10, cooldown: 3.2, ranged: false, special: 'boss' },
  // Guns: a little bonk with the gun, and the skill shoots.
  { id: 'sniper', price: 900, length: 74, damage: 12, turn: 10, cooldown: 10, ranged: true },
  { id: 'shotgun', price: 600, length: 60, damage: 14, turn: 12, cooldown: 2, ranged: true },
  // Pistol: 1 second between shots, then a 3 second reload after 5 shots.
  { id: 'pistol', price: 150, length: 34, damage: 8, turn: 15, cooldown: 1, ranged: true },
  { id: 'gun67', price: 500, length: 50, damage: 12, turn: 13, cooldown: 10, ranged: true },
  { id: 'summoner', price: 4000, length: 62, damage: 15, turn: 12, cooldown: 25, ranged: true },
  { id: 'bravery', price: 800, length: 110, damage: 24, turn: 12, cooldown: 20, ranged: false },
  { id: 'pan', price: 300, length: 52, damage: 28, turn: 14, cooldown: 4, ranged: false },
  { id: 'watergun', price: 200, length: 42, damage: 6, turn: 14, cooldown: 3, ranged: true },
  { id: 'bubble', price: 350, length: 54, damage: 10, turn: 13, cooldown: 4, ranged: true },
  // The Pigeon's beak: its pecks are its own (see the Pigeon in game.ts).
  { id: 'beak', price: 0, length: 30, damage: 0, turn: 10, cooldown: 99, ranged: false, special: 'boss' },
  // October 18 update
  { id: 'chainsaw', price: 700, length: 70, damage: 26, turn: 13, cooldown: 4, ranged: false },
  { id: 'yoyo', price: 300, length: 34, damage: 14, turn: 15, cooldown: 1.6, ranged: true },
  { id: 'crossbow', price: 550, length: 46, damage: 12, turn: 13, cooldown: 2.2, ranged: true },
  { id: 'whip', price: 900, length: 120, damage: 22, turn: 12, cooldown: 4, ranged: false },
  { id: 'fryfish', price: 350, length: 54, damage: 24, turn: 14, cooldown: 2.5, ranged: false },
  // October 19 update
  { id: 'chicklord', price: 500, length: 64, damage: 14, turn: 12, cooldown: 18, ranged: true },
  { id: 'lilpigeon', price: 1000, length: 40, damage: 10, turn: 13, cooldown: 12, ranged: true },
  { id: 'bone', price: 900, length: 66, damage: 20, turn: 12, cooldown: 15, ranged: false },
  { id: 'egg', price: 500, length: 46, damage: 10, turn: 13, cooldown: 1.4, ranged: true },
  { id: 'gum', price: 650, length: 44, damage: 8, turn: 13, cooldown: 2.2, ranged: true },
  { id: 'drumstick', price: 800, length: 58, damage: 26, turn: 14, cooldown: 6, ranged: false },
  // October 20 update: the new bosses' own weapons (the Elephant's moves are its own, see bosses.ts)...
  { id: 'trunk', price: 0, length: 30, damage: 0, turn: 10, cooldown: 99, ranged: false, special: 'boss' },
  { id: 'pitchfork', price: 0, length: 110, damage: 30, turn: 10, cooldown: 3.2, ranged: false, special: 'boss' },
  { id: 'robocannon', price: 0, length: 60, damage: 30, turn: 10, cooldown: 3.2, ranged: true, special: 'boss' },
  // ...and four for the shop.
  { id: 'beehive', price: 700, length: 40, damage: 10, turn: 13, cooldown: 12, ranged: true },
  { id: 'ninjascroll', price: 850, length: 40, damage: 18, turn: 14, cooldown: 16, ranged: false },
  { id: 'trumpet', price: 450, length: 46, damage: 12, turn: 14, cooldown: 3, ranged: false },
  { id: 'plasma', price: 750, length: 80, damage: 32, turn: 16, cooldown: 4, ranged: false },
  // October 21 update
  { id: 'guitar', price: 650, length: 70, damage: 26, turn: 13, cooldown: 5, ranged: false },
  { id: 'bat', price: 400, length: 80, damage: 30, turn: 15, cooldown: 4, ranged: false },
  { id: 'slingshot', price: 200, length: 30, damage: 8, turn: 15, cooldown: 0.8, ranged: true },
  { id: 'flamethrower', price: 950, length: 52, damage: 10, turn: 12, cooldown: 6, ranged: true },
];

/** Weapons drawn as guns (flipped so they stay the right way up when you aim left). */
export const GUNS: WeaponId[] = ['sniper', 'shotgun', 'pistol', 'gun67', 'watergun', 'egg', 'gum', 'flamethrower'];

/** Weapons you can buy in the shop or roll at random (no boss or reward weapons). */
export const SHOP_WEAPONS = WEAPONS.filter((w) => !w.special);

/** Every weapon you can own: the shop plus the boss rewards. */
export const ALL_OWNABLE = WEAPONS.filter((w) => w.special !== 'boss');

/** The shop weapons from before the Fire Sword update: owning these unlocks the Mascot (new weapons don't lock it again). */
export const MASCOT_WEAPONS = ['sword', 'spear', 'hammer', 'bow', 'boomerang', 'bomb', 'katana', 'snowball', 'axe', 'shuriken', 'laser', 'staff', 'six7', 'poop', 'ice', 'thunder', 'banana'];

export function weapon(id: string): WeaponDef {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
}
