# Stickman Fight

A goofy 2D stickman fighting game for phones and tablets. Up to 6 players share one screen, each with their own joystick, or up to 20 fighters play together online across devices. Thai and English.

## How to play

One joystick per player:

- **Drag** to run and swing your weapon. Your weapon deals damage when it hits someone.
- **Drag up** to jump (you can jump once more in the air).
- **Drag down** to put up a shield around your body. It breaks if it takes too much damage.
- **Let go** to use your weapon's skill in the direction you were aiming.

On a computer you can test with the keyboard: WASD is P1, the arrow keys are P2 and IJKL is P3. Letting go of all keys uses the skill. Esc or P pauses.

## Modes

- **Free For All:** the last stickman standing wins.
- **Teams:** 4 team colours. The last team standing wins.
- **Boss Fight:** players, bots and snowmen team up against a giant stickman with 5,000 HP. It holds 2 random weapons, so it has 2 skills. You choose how many bosses to fight: 1, 2 or 3. Each boss has its own health bar.

- **Grandfather Cat:** everyone teams up against Grandfather Cat, a giant cat boss with 10,000 HP holding the **Soup of Gang Som**. It has 2 skills:
  - **Sud Gang Som:** throws yellow soup. Every enemy it splashes takes 20 damage, then burns for 10 damage a second for 5 seconds.
  - **Call Cat AI:** calls 5 AI cats (100 HP each) that run at enemies and do 10 damage on touch. It calls about every 8 seconds, with at most 15 cats at once.

  Beating him gives **1,000 coins** every time. The first win also gives you **The Grandfather Cat Treasure** (see Weapons).

- **Mascot:** the white stickman from the game icon (all white, no eyes, a white stick). It has 50,000 HP, touching it does 50 damage, and its Giant Stick Slam does 299. It unlocks when you own **every shop weapon**; online, the host needs them. Beating it gives **5,000 coins** every time, and the first win gives the **Mascot Stick**.

You can have up to 6 players and 6 bots at once. Each bot has its own difficulty: CPU-easy, CPU-medium or CPU-hard. With no players, you watch the bots fight.

Players and bots have 500 HP. Falling off the map is a KO. In Settings you can change it so you lose 25 HP and bounce back up instead.

Winning gives 3–5 coins. When bots or the boss win, you get 1 coin. Beating the bosses in Boss Fight gives **500 coins for each boss** (1,500 for 3 bosses).

## Weapons

| Weapon | Price | Skill |
|---|---|---|
| Sword | Free | Dash Slash |
| Spear | Free | Long Thrust |
| Hammer | 200 | Ground Slam shockwave |
| Bow | 250 | Arrow |
| Boomerang | 300 | Flies out and comes back |
| Bomb | 350 | Bouncing bomb |
| Katana | 400 | Teleport behind the nearest enemy |
| Snowball | 500 | See below |
| Axe | 450 | Spin Throw: the axe spins out, hits hard and comes back |
| Shuriken | 550 | Triple Star: 3 ninja stars in a spread |
| Laser Gun | 600 | Laser Beam: goes through every enemy in its way |
| Magic Staff | 700 | Fireball: explodes and sets enemies on fire for 2 seconds |
| 67 Weapon | 670 | Throws the 67 weapon for 67 damage and it comes back. Normal hits do 34. Cooldown 10 seconds |
| Poop Bomb | 299 | Throws poo for 6 damage. Cooldown 1 second. Normal hits do 20 |
| Ice Wand | 650 | Ice Bolt: 35 damage and freezes the enemy for 1.2 seconds |
| Thunder Hammer | 800 | Lightning strikes the nearest enemy (70) and shocks anyone close (35) |
| Banana | 250 | Throw a banana: the enemy slips (25). A missed banana stays as a peel for 8 seconds |
| Mascot Stick | Reward | Not sold. Beat the Mascot to get it. Stick Slam: leap and slam for 120 |
| The Grandfather Cat Treasure | Reward | Not sold. Beat Grandfather Cat to get it. Its skills take turns: Sud Gang Som (12 damage, then 6 a second for 5 seconds), then Call Cat AI (3 cats with 60 HP that do 6 damage) |

All players and bots on the device share the weapons you buy.

**Snowball:**

- A thrown snowball does 20 damage.
- If it misses, it stays on the ground for 6 seconds. An enemy who touches it takes 60 damage and gets flung away.
- A new snowball appears in your hand right away. Throw it at your own snowball on the ground to build a **snowman ally**.
- Snowmen have 250 HP and fight on their own. Each player can have up to 10.

## Death finishers

How a stickman goes down depends on what knocked it out:

| What hit it | Finisher |
|---|---|
| Sword, Spear, Bow, Boomerang, Bomb, Laser Gun, Poop Bomb, Grandfather Cat Treasure, Mascot | Ragdoll (goes floppy and tumbles) |
| Hammer skill (Ground Slam), Mascot / Mascot Stick slam | Ragdoll + fling |
| Bomb skill, Poop Bomb skill | The original pop |
| Axe (hit or throw), Laser Gun skill | Cut in half |
| Shuriken (hit or throw), Magic Staff hit | Flung away |
| Magic Staff fireball, Treasure / Grandfather Cat soup, burning | Burned into ashes |
| 67 Weapon | Flies into the sky |
| AI cats | Trips and falls |
| Ice Wand | Frozen, then shatters into ice |
| Thunder Hammer | Skeleton flash, then smoke |
| Banana | Slips and spins away |
| Falling into the void | Just falls: no pop, no finisher |

Anything not in the table (Katana, Snowball, snowmen, lava) keeps the original pop.

## Potions

In **Settings** you can turn healing potions on or off (on by default). When they are on, every KO has a 25% chance to drop a potion, and every 10 seconds there's a 25% chance one falls from the sky. Touching a potion heals 25% of your max HP. Online, the host turns potions on or off in the room.

## Maps

There are 12 built-in maps: Classic Arena, Sky Islands, The Tower, Long Bridge, Snowy Peak, The Pit, Volcano, Concrete Factory, Glass Palace, Rooftops, Frozen Lake and **Space**.

Space has a big spaceship in the middle to fight on, and low gravity: everyone jumps higher and falls slower. Any map you make with the Space theme in the editor gets low gravity too.

The **Map Editor** lets you draw platforms, place spawn points, and pick a size and theme. You can share a map as a link: anyone who opens the link gets the map.

Besides normal platforms, you can build with special blocks:

- **Concrete:** a solid block that never breaks.
- **Lava:** landing on it takes 40 HP and throws you up into the air.
- **Glass:** any weapon skill that hits it breaks it, for example an arrow, a laser, a bomb, the sword's dash or the hammer's slam. Broken glass comes back after 10 seconds.

## Names

Each player can type a name: in **Settings** (your name), in **Play** next to P1–P6, and on the **Online** screen. Names can be up to 12 characters, in Thai or English. If two people in a room pick the same name, the second gets a "2" added, and so on.

## Online rooms

Tap **Online** on the main menu.

- **Create room:** choose the room size (2–20 fighters). You get a 6-letter room code, a share link and a QR code.
- **Join room:** type the code, open the share link, or scan the QR code.
- **Players per device:** each device can bring 1–6 players, each with their own joystick.
- **What the host controls:**
  - The host picks the mode, the map, the falling rule and the room size.
  - The host can add bots. Bots count toward the room size.
  - The host can remove bots or players.
- **Weapons:** everyone can only pick from the **host's weapons**.
- **Teams:** in Teams mode, each player picks a team colour, and the host can change it.
- **Snowmen:** online, each player can have up to 5 snowmen (10 offline).
- **Bosses:** in Boss Fight, the host picks 1–3 bosses. The host can also pick Grandfather Cat. Every device that had a player in the match gets the 1,000 coins (and the Treasure on its first win).
- **The room keeps your place:** adding bots or changing weapons doesn't scroll the room back to the top.
- **Invite friends:** if you are signed in with Google, the room lists your online friends with an **Invite** button.
- **Joining late:** someone who joins during a match watches it and plays from the next round.
- **Coins:** each device earns its own: 3–5 for a win, 1 otherwise.
- **Leaving:** if the host leaves, the room closes. If a player leaves mid-match, a bot takes over their stickman.

How it works:

- The host's device runs the match.
- The other devices send their joysticks to the host and draw what the host sends back. This connection goes directly between devices using WebRTC.
- Supabase is only used to find the room and connect the devices.

The host needs a decent device and Wi-Fi for big rooms. A few mobile-data networks block direct connections; if joining fails, try the same Wi-Fi as the host.

## Friends

Only players signed in with Google can use friends. Tap **Friends** on the main menu.

- **Friend code:** everyone gets an 8-letter friend code. When someone adds your code, you both become friends.
- **Online:** a green dot means that friend had the game open in the last couple of minutes.
- **Invite:** in an online room, tap **Invite** next to an online friend. They get a pop-up with **Join**, which takes them straight into your room.

## Credits

Tap **⭐ Credits** on the main menu:

- **Creator:** Taratorn
- **Helper:** PotterzaXD

## First visit

The first time someone opens the game on a device, a welcome message appears. After they tap **Thank you**, it doesn't show again on that device.

## Saving and Google sign-in (Supabase)

Progress (coins, weapons, maps, names, settings) is always saved on the device. Signing in with Google is optional and also saves progress online, so it follows you to other devices.

The game uses the Supabase project built into `src/cloud.ts`. That project URL and publishable key are public by design, and row level security protects the data.

One-time setup in the Supabase dashboard:

1. **SQL Editor → New query:** paste [`supabase/setup.sql`](supabase/setup.sql) and click **Run**. This creates the `saves` table and the friends tables and functions. It is safe to run again, so if you set up the project before friends existed, run the whole file once more.
2. **Authentication → Sign In / Providers → Google:** turn it on with the Client ID and secret from Google Cloud Console. The secret stays in Supabase, never in this repo.
3. **Authentication → URL Configuration:**
   - **Site URL:** the Vercel link.
   - **Redirect URLs:** the Vercel link and `http://localhost:5173/**`.
4. **Realtime:** leave public channels allowed. Rooms use the channel `sf-room-<CODE>` only for connecting. `setup.sql` also turns on Realtime for the `invites` table so invites pop up right away. Without it, invites still arrive within a minute.

To use a different Supabase project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (see `.env.example`).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 (also reachable on your Wi-Fi so you can test on a phone)
npm run build    # type-check and build into dist/
```

Built with TypeScript, Vite and HTML canvas. There is no game engine.

## Deploy

Import the repo into [Vercel](https://vercel.com/new). It detects Vite automatically, so no settings are needed. Then share the link so anyone can play.
