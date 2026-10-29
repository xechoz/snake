# Bloomtail: Color Trail

A handcrafted garden-snake campaign built on
[`xechoz/mg-platform`](https://github.com/xechoz/mg-platform).

Slither through a faded garden, paint the soil with fruit colors, bloom every
bud before the step limit, and chase three stars by finding the golden seed.
Two worlds and twelve levels ship with the campaign; the original endless mode
is still available from the level map.

Clone with the platform submodule:

```bash
git clone --recurse-submodules git@github.com:xechoz/snake.git
cd snake
npm ci
npm run dev
```

The platform is pinned at `v4.0.0` in `platform/`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run check` | Typecheck, Biome and game boundary checks |
| `npm run test` | Vitest |
| `npm run build` | Production self-hosted build |
| `npm run package:web` | `snake-web.zip` release asset |
| `npm run package:poki` | Poki build |
| `npm run package:crazy:basic` | CrazyGames lifecycle build |
| `npm run package:crazy:full` | CrazyGames lifecycle + ads build |

## Level campaign

- `src/logic/levels.ts` holds the handcrafted boards, seeds, fruit plans and
  par/step limits.
- `src/logic/levelRun.ts` is the pure bloom/golden/star rule set.
- `src/logic/progress.ts` merges stars, coins and level unlocks.
- Save version 4 migrates old endless-only saves without losing the best score
  or skins.

For a fast visual check of any level, use the debug deep link:

```text
http://localhost:5173/?debug&level=2-1
```

## Local CrazyGames preview

```bash
./run-crazygames.sh basic   # http://localhost:8080
./run-crazygames.sh full    # http://localhost:8081
```

Build the matching zip first with `npm run package:crazy:basic` or
`npm run package:crazy:full`.

## Local Poki preview

```bash
./run-poki.sh   # http://localhost:8082
```

Build the zip first with `npm run package:poki`. Real Poki ads and SDK event
checks require the [Poki Inspector](https://inspector.poki.dev); the local
preview is for layout, loading and input checks.

## Platform updates

```bash
cd platform
git fetch --tags
git checkout vX.Y.Z
cd ..
npm install
git add platform package-lock.json
git commit -m "chore: platform vX.Y.Z"
```
