# Poki submission — Fruit Snake: Color Trail

## Studio

**Xechoz**

## Game

| Field | Value |
| --- | --- |
| Title | Fruit Snake: Color Trail |
| Engine | Phaser |
| Category | Arcade / Classic |
| Age rating | Everyone |
| Orientation | Landscape and portrait |
| Languages | English, French, Italian, German, Spanish, Turkish, Chinese, Japanese, Korean, Portuguese, Russian |

## Short description

Eat fruit, paint your snake, and don't crash. Fourteen fruits, ice cream, chili and a super-fruit feast.

## Long description

Fruit Snake: Color Trail is a colorful arcade twist on Snake. Every fruit you eat paints a new segment, so your snake becomes a moving rainbow. Ice cream slows you down, chili doubles your score, and a super fruit fills the board with a 20-second feast. Dodge the walls and your own tail, chase a new best score, and collect all fourteen fruits.

## Controls

- **Desktop:** arrow keys or WASD to steer; Space, Esc or P to pause.
- **Mobile / tablet:** swipe to steer; tap the pause button to pause.

## Why Poki players will like it

- One tap to play; no login, account or install.
- Landscape and portrait layouts on desktop, mobile and tablet.
- Eleven languages; touch controls are forced on tablets.
- The rewarded ad is optional: one ad grants a super fruit for the next run. The standard “Play again” path is always available and never gated.
- No external requests except the Poki SDK; no other ad system is loaded.

## Assets

| Asset | File | Spec |
| --- | --- | --- |
| Static thumbnail master | `press/poki-thumbnail-1080.png` | 1080×1080, 1:1, full bleed |
| Static thumbnail final | `press/poki-thumbnail-628.png` | 628×628, 1:1, full bleed |
| Animated thumbnail | `press/poki-thumbnail.mp4` | 1080×1080, 60 fps, 4.9 s, silent, H.264 |
| Gameplay screenshots | `press/screenshots/01-desktop-s-curve.png`, `02-desktop-serpentine.png`, `03-mobile-portrait.png` | PNG, under 5 MiB each |

The thumbnails avoid text, borders, padding and the Poki playground background `#83FFE7`.

## Build and submit

```bash
npm run check
npm run test
npm run package:poki          # dist/ + release/snake-poki.zip
./run-poki.sh                 # http://localhost:8082/
```

- **Poki Inspector:** upload the `dist/` folder, not the zip.
- **Poki portal:** upload `release/snake-poki.zip` when the Inspector build passes.
- The Poki build injects exactly one external script:
  `https://game-cdn.poki.com/scripts/v2/poki-sdk.js`.
- Real ads, ad-block handling and SDK event timing must be verified in the
  Inspector; the local preview only covers layout, loading and input.

## Inspector checklist

- [ ] `gameLoadingFinished` fires after loading, before the menu is playable.
- [ ] `gameplayStart` fires on the first start, not on page load.
- [ ] Pause: `gameplayStop` → resume: `commercialBreak` → `gameplayStart`.
- [ ] Death: `gameplayStop` → restart: `commercialBreak` → `gameplayStart`.
- [ ] Rewarded super fruit: `rewardedBreak`; the following restart does not fire a second commercial break.
- [ ] No SDK event fires twice in succession, and none fires during an ad.
- [ ] Desktop 16:9, 4:3, mobile landscape, mobile portrait and tablet scaling.
- [ ] Mobile QR: touch steering, pause button clear of the Poki pill, audio unlock.
- [ ] All 11 languages, especially German, Russian and Turkish long strings.
- [ ] Ad blocker: game stays playable, no reward, no custom message.
- [ ] Game Details: load time and package size.
