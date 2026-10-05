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
- **Boss Fight:** players, bots and snowmen team up against a giant stickman with 5,000 HP. It holds 2 random weapons, so it has 2 skills.

You can have up to 6 players and 6 bots at once. Each bot has its own difficulty: CPU-easy, CPU-medium or CPU-hard. With no players, you watch the bots fight.

Players and bots have 500 HP. Falling off the map is a KO. In Settings you can change it so you lose 25 HP and bounce back up instead.

Winning gives 3–5 coins. When bots or the boss win, you get 1 coin.

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

All players and bots on the device share the weapons you buy.

**Snowball:**

- A thrown snowball does 20 damage.
- If it misses, it stays on the ground for 6 seconds. An enemy who touches it takes 60 damage and gets flung away.
- A new snowball appears in your hand right away. Throw it at your own snowball on the ground to build a **snowman ally**.
- Snowmen have 250 HP and fight on their own. Each player can have up to 10.

## Maps

There are 6 built-in maps. The **Map Editor** lets you draw platforms, place spawn points, and pick a size and theme. You can share a map as a link: anyone who opens the link gets the map.

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
- **Joining late:** someone who joins during a match watches it and plays from the next round.
- **Coins:** each device earns its own: 3–5 for a win, 1 otherwise.
- **Leaving:** if the host leaves, the room closes. If a player leaves mid-match, a bot takes over their stickman.

How it works:

- The host's device runs the match.
- The other devices send their joysticks to the host and draw what the host sends back. This connection goes directly between devices using WebRTC.
- Supabase is only used to find the room and connect the devices.

The host needs a decent device and Wi-Fi for big rooms. A few mobile-data networks block direct connections; if joining fails, try the same Wi-Fi as the host.

## Saving and Google sign-in (Supabase)

Progress (coins, weapons, maps, names, settings) is always saved on the device. Signing in with Google is optional and also saves progress online, so it follows you to other devices.

The game uses the Supabase project built into `src/cloud.ts`. That project URL and publishable key are public by design, and row level security protects the data.

One-time setup in the Supabase dashboard:

1. **SQL Editor → New query:** paste [`supabase/setup.sql`](supabase/setup.sql) and click **Run**. This creates the `saves` table.
2. **Authentication → Sign In / Providers → Google:** turn it on with the Client ID and secret from Google Cloud Console. The secret stays in Supabase, never in this repo.
3. **Authentication → URL Configuration:**
   - **Site URL:** the Vercel link.
   - **Redirect URLs:** the Vercel link and `http://localhost:5173/**`.
4. **Realtime:** leave public channels allowed. Rooms use the channel `sf-room-<CODE>` only for connecting.

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
