# Changelog

## Unreleased

- Replace the grid level picker with a winding two-world map: flowers for cleared
  levels, a gold ring on the next level, a star gate between Orchard and Berry
  Bog, and short hints on locked nodes.
- Decouple the star goals: clearing blooms the garden for one star, finishing
  within par earns the second, and the golden seed earns the third. This keeps
  the golden-seed detour from inflating the par target.
- Audit every campaign level against a relaxed shortest-route search, raise
  2-4's par above its shortest possible clear, tighten the loose pars, and move
  the golden seeds in 1-3, 2-2, 2-4 and 2-6 so three stars always require a
  deliberate detour.
- Add a `?debug&map` deep link for checking the level map.
- Replace the synthesised garden loop with "Sweet Fun and Happy Loop" by
  Sonican (Pixabay Content License): a 38.4-second ukulele loop crossfaded at
  the seam, lifted with a +2.5 dB high shelf and encoded at MP3 160 kbps so the
  top end survives.
- Add a settings panel in the menu's top-right corner: music and effect volume,
  a master sound toggle, and three campaign difficulties that adjust the pace
  and step budget without changing the star thresholds.
- Redraw the backdrop as a planned orchard: trees, fence and foliage are placed
  around the quiet zones of the HUD and board, with separate menu and gameplay
  densities plus animated butterflies and drifting petals.

## 4.0.0

- Rebrand to **Bloomtail: Color Trail** / **花尾蛇：色彩小径**.
- Add a handcrafted campaign: two worlds, twelve levels, bloom buds,
  colour-matched seeds, golden seeds, par steps and three-star ratings.
- Add the level map, continue flow, world star gates and per-level save
  progress. Save version 4 migrates endless-only saves in place.
- Replace the checkered board with a garden bed, a painted colour trail,
  buds/blooms, a level HUD and a dedicated level result screen.
- Build a layered orchard backdrop around the garden: fruit trees, a distant
  orchard row, a picket fence, meadow flowers, an overhanging branch and a
  light butterfly/petal ambience that stays clear of the UI.
- Keep the original endless mode as a bonus mode. Level retries no longer show
  interstitials.
- Add an original 32-second garden music loop (CC0), synced to the sound toggle,
  pause flow and host ad muting.
- Add CrazyGames cover art in 1920×1080, 800×1200 and 800×800, plus a compact
  result layout that fits 800×450 without overlapping text.
- Nudge fruit placements in levels 1-4 and 2-4 so an early wrong-colour pickup
  cannot strand a colour seed.
- Add the `?debug&level=<id>` deep link for level checks.

## 3.1.0

- Move the game to the standalone `xechoz/snake` repository.
- Consume `xechoz/mg-platform` at `v4.0.0` through the `platform/` submodule.
- Add web, Poki and CrazyGames release packaging to CI.

## 3.0.0

- Rename to **Fruit Snake: Color Trail** / **贪吃蛇：水果火车**.
- Expand to 14 fruits, add collection gallery and super fruit.
- Improve mobile fullscreen, audio, rendering clarity and pause behavior.
