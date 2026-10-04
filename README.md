# Stickman Fight

A goofy 2D stickman fighting game for phones and tablets. Up to 6 players share one screen, each with their own joystick. Thai and English.

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

## Saving

Progress (coins, weapons, maps, settings) is saved on the device. Signing in with Google is optional and saves progress online, so it follows you to other devices.

### Turning on Google sign-in (Firebase, free)

1. Go to <https://console.firebase.google.com>, create a project, and add a **Web app**.
2. Under **Authentication → Sign-in method**, turn on **Google**.
3. Under **Firestore Database**, create a database. Then paste the rules from [`firestore.rules`](firestore.rules) into the **Rules** tab and publish.
4. Under **Authentication → Settings → Authorized domains**, add your site's domain (for example `stickman-fight.vercel.app`).
5. Copy the web app config values into these environment variables (in Vercel: Project → Settings → Environment Variables; locally: a `.env` file, see `.env.example`):

   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_APP_ID=
   ```

6. Redeploy. If the variables are missing, the game still works and saves on the device only.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 (also reachable on your Wi-Fi so you can test on a phone)
npm run build    # type-check and build into dist/
```

Built with TypeScript, Vite and HTML canvas. There is no game engine.

## Deploy

Import the repo into [Vercel](https://vercel.com/new). It detects Vite automatically, so no settings are needed. Then share the link so anyone can play.
