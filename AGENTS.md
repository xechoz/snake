# Fruit Snake — Agent Instructions

This repository contains exactly one game, **Fruit Snake: Color Trail**. Shared
infrastructure lives in `platform/`, a git submodule of `xechoz/mg-platform`
pinned to `v4.0.0`.

## Read first

1. `platform/AGENTS.md` — platform-wide hard rules.
2. This file — game-specific scope.
3. `src/logic` before changing rules; `src/scenes` before changing rendering.

**Never edit files under `platform/` in this repository.** Platform changes go
to `xechoz/mg-platform`, get a new tag, and are pulled in by bumping the
submodule.

## Layout

- `src/logic/` — pure rules (`state`, `menuDemo`, `config`). No Phaser.
- `src/scenes/` — `Menu`, `Game`, `Hud`.
- `src/ui/` — backdrop, snake/fruit art, layout, modals, joystick.
- `src/main.ts` — `createGame()` composition root.
- `src/i18n.ts` — 11 locales; Chinese and English are the reference.
- `src/save.ts` — version 3 save plus v1/v2 migrations.
- `src/ads.ts` — rewarded super-fruit placement.
- `game.manifest.json` — site card metadata; `id` is `snake`.

## Game rules

- 14 fruits grant points and paint the snake; ice cream slows it, chili doubles
  score.
- Fixed tick + interpolation; input buffer rejects illegal reversals.
- Pause on blur/hidden; resume with 3-2-1 countdown.
- Result screen: restart, menu, best score persistence, optional revive ad.
- Keep `src/logic` free of Phaser, DOM, audio and ad SDK access.
- Randomness only through `@mg/core/rng`.
- Tuning belongs in `src/logic/config.ts`, not render code.

## Commands

```bash
npm ci
npm run dev          # http://localhost:5173
npm run check        # tsc + biome + game boundaries
npm run test
npm run build
npm run package:web
npm run package:poki
npm run package:crazy:basic
npm run package:crazy:full
```

Local CrazyGames preview:

```bash
./run-crazygames.sh basic   # http://localhost:8080
./run-crazygames.sh full    # http://localhost:8081
```

## Release

Push a `vX.Y.Z` tag. CI builds all four flavors and creates a GitHub Release:

- `snake-web.zip`
- `snake-poki.zip`
- `snake-crazygames-basic.zip`
- `snake-crazygames-full.zip`

Then update `site/games.json` in `xechoz/mini-games`. Do not commit or tag
without an explicit request.
