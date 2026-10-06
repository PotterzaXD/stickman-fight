export type WeaponId = 'sword' | 'spear' | 'hammer' | 'bow' | 'boomerang' | 'bomb' | 'katana' | 'snowball' | 'axe' | 'shuriken' | 'laser' | 'staff';

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
];

export function weapon(id: string): WeaponDef {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
}
