import type { Insets, Viewport } from '@mg/core'
import { describe, expect, it } from 'vitest'
import {
  ACTION_LABEL_BAND,
  CROWN_BADGE_RATIO,
  computeGameOverOverlay,
  computeMenuLayout,
  computeSnakeLayout,
  GAME_OVER_MODAL_HEIGHT,
  GAME_OVER_MODAL_WIDTH,
  inlineScorePositions,
  MENU_HINT_HEIGHT,
  MENU_INSTALL_HINT_HEIGHT,
  MENU_LOGO_HEIGHT,
  MENU_PLAY_CHARM_CLEARANCE,
  MENU_PLAY_HEIGHT,
  MENU_SETTINGS_HIT,
  MENU_SETTINGS_TOUCH_SIZE,
  playCharmSpots,
  type Rect,
  SUPER_FRUIT_CROWN,
  SUPER_FRUIT_HALO,
  superFruitSpot,
} from './layout'

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

function viewport(width: number, height: number, insets: Insets = NO_INSETS): Viewport {
  return { width, height, insets }
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

describe('computeSnakeLayout', () => {
  it('keeps the board at 672 with a side HUD on a 16:9 desktop', () => {
    const layout = computeSnakeLayout(viewport(1280, 720))

    expect(layout.placement).toBe('side')
    expect(layout.orientation).toBe('landscape')
    expect(layout.board).toEqual({ x: 304, y: 24, width: 672, height: 672, cell: 33.6 })
    expect(layout.hud).toEqual({ x: 42, y: 24, width: 220, height: 276 })
    expect(layout.scoreCard).toEqual({ x: 42, y: 140, width: 220, height: 160 })
    expect(layout.score).toEqual({ mode: 'stacked', x: 152, labelY: 174, valueY: 236 })
    expect(layout.pause).toEqual({ x: 152, y: 72 })
  })

  it('uses the wider margin instead of shrinking the board on phone landscape', () => {
    const layout = computeSnakeLayout(viewport(1558, 720))

    expect(layout.placement).toBe('side')
    expect(layout.board.width).toBe(672)
    expect(layout.board.x).toBe(443)
    expect(layout.hud.x).toBe(112)
  })

  it('moves the HUD to the top in portrait and keeps the board at 672', () => {
    const layout = computeSnakeLayout(viewport(720, 1558))

    expect(layout.placement).toBe('top')
    expect(layout.orientation).toBe('portrait')
    expect(layout.board).toEqual({ x: 24, y: 443, width: 672, height: 672, cell: 33.6 })
    expect(layout.hud).toEqual({ x: 172, y: 24, width: 376, height: 104 })
    expect(layout.scoreCard).toEqual({ x: 172, y: 24, width: 260, height: 104 })
    expect(layout.score).toEqual({ mode: 'inline', x: 302, y: 76 })
    expect(layout.pause).toEqual({ x: 500, y: 76 })
  })

  it('falls back to a stacked layout on square-ish viewports', () => {
    const layout = computeSnakeLayout(viewport(720, 720))

    expect(layout.placement).toBe('top')
    expect(layout.board.width).toBe(432)
    expect(layout.board.y).toBeGreaterThan(layout.hud.y + layout.hud.height)
  })

  it('keeps the HUD clear of the board and inside the safe area', () => {
    const sizes = [
      [1280, 720],
      [1558, 720],
      [720, 1558],
      [768, 1024],
      [1024, 768],
      [720, 720],
      [960, 720],
    ] as const

    for (const [width, height] of sizes) {
      const layout = computeSnakeLayout(viewport(width, height))
      expect(intersects(layout.board, layout.hud), `${width}x${height}`).toBe(false)
      expect(layout.board.x).toBeGreaterThanOrEqual(0)
      expect(layout.board.y).toBeGreaterThanOrEqual(0)
      expect(layout.board.x + layout.board.width).toBeLessThanOrEqual(width)
      expect(layout.board.y + layout.board.height).toBeLessThanOrEqual(height)
    }
  })

  it('insets the board and HUD for notches', () => {
    const insets = { top: 40, right: 88, bottom: 40, left: 88 }
    const layout = computeSnakeLayout(viewport(1558, 720, insets))

    expect(layout.board.x).toBeGreaterThan(insets.left)
    expect(layout.hud.x).toBeGreaterThanOrEqual(insets.left)
    expect(layout.board.x + layout.board.width).toBeLessThanOrEqual(1558 - insets.right)
  })
})

describe('inlineScorePositions', () => {
  it('keeps the group centred and the value anchored as digits change', () => {
    const oneDigit = inlineScorePositions(302, 52, 48)
    const fourDigits = inlineScorePositions(302, 52, 160)

    expect(oneDigit.valueX).toBe(336)
    expect(fourDigits.valueX).toBe(336)
    expect(oneDigit.labelX).toBe(302 - (48 + 16) / 2)
    expect(fourDigits.labelX).toBe(302 - (160 + 16) / 2)
  })

  it('centres the whole group on the anchor', () => {
    const { labelX, valueX } = inlineScorePositions(302, 52, 120)
    const left = labelX - 52 / 2
    const right = valueX + 120 / 2

    expect((left + right) / 2).toBe(302)
  })
})

describe('computeGameOverOverlay', () => {
  const sizes = [
    [1280, 720],
    [1558, 720],
    [960, 720],
    [720, 720],
    [720, 1558],
    [768, 1024],
  ] as const

  it('anchors the close button and crown on a desktop result card', () => {
    const overlay = computeGameOverOverlay(
      { width: 1280, height: 720 },
      {
        width: GAME_OVER_MODAL_WIDTH,
        height: GAME_OVER_MODAL_HEIGHT,
        titleFontSize: 36,
        heroFontSize: 72,
      },
    )

    expect(overlay.card).toEqual({ x: 320, y: 115, width: 640, height: 490 })
    expect(overlay.close).toEqual({ x: 916, y: 159 })
    expect(overlay.closeSize).toBe(56)
    expect(overlay.crown).toEqual({ x: 640, y: 75 })
    expect(overlay.crownSize).toBe(97)
  })

  it('moves fireworks above and below the card on portrait screens', () => {
    const overlay = computeGameOverOverlay(
      { width: 720, height: 1558 },
      {
        width: GAME_OVER_MODAL_WIDTH,
        height: GAME_OVER_MODAL_HEIGHT,
        titleFontSize: 36,
        heroFontSize: 72,
      },
    )

    expect(overlay.card).toEqual({ x: 40, y: 534, width: 640, height: 490 })
    for (const burst of overlay.bursts) {
      expect(burst.y < overlay.card.y || burst.y > overlay.card.y + overlay.card.height).toBe(true)
    }
  })

  it('keeps decorations inside the screen and clear of the title on every layout', () => {
    for (const [width, height] of sizes) {
      const overlay = computeGameOverOverlay(
        { width, height },
        {
          width: GAME_OVER_MODAL_WIDTH,
          height: GAME_OVER_MODAL_HEIGHT,
          titleFontSize: 36,
          heroFontSize: 72,
        },
      )
      const tag = `${width}x${height}`
      const cardRight = overlay.card.x + overlay.card.width
      const cardBottom = overlay.card.y + overlay.card.height

      expect(overlay.card.x, tag).toBeGreaterThanOrEqual(0)
      expect(overlay.card.y, tag).toBeGreaterThanOrEqual(0)
      expect(cardRight, tag).toBeLessThanOrEqual(width)
      expect(cardBottom, tag).toBeLessThanOrEqual(height)

      expect(overlay.close.x - overlay.closeSize / 2, tag).toBeGreaterThan(
        overlay.card.x + overlay.card.width / 2 + 150,
      )
      expect(overlay.close.y - overlay.closeSize / 2, tag).toBeGreaterThan(overlay.card.y)
      expect(overlay.close.x + overlay.closeSize / 2, tag).toBeLessThan(cardRight)
      expect(overlay.close.y + overlay.closeSize / 2, tag).toBeLessThan(cardBottom)

      const badgeRadius = overlay.crownSize * CROWN_BADGE_RATIO
      expect(overlay.crown.x, tag).toBe(overlay.card.x + overlay.card.width / 2)
      expect(overlay.crown.y - badgeRadius, tag).toBeGreaterThanOrEqual(8)
      expect(overlay.crown.y + badgeRadius, tag).toBeLessThanOrEqual(overlay.card.y + 24)

      const sideRoom = Math.min(overlay.card.x, width - cardRight)
      for (const burst of overlay.bursts) {
        expect(burst.x, tag).toBeGreaterThanOrEqual(0)
        expect(burst.x, tag).toBeLessThanOrEqual(width)
        expect(burst.y, tag).toBeGreaterThanOrEqual(0)
        expect(burst.y, tag).toBeLessThanOrEqual(height)
        if (sideRoom >= 96) {
          expect(burst.x < overlay.card.x || burst.x > cardRight, tag).toBe(true)
        } else {
          expect(burst.y < overlay.card.y || burst.y > cardBottom, tag).toBe(true)
        }
      }
    }
  })
})

describe('playCharmSpots', () => {
  it('scatters fruit over the CTA without covering its centre', () => {
    const spots = playCharmSpots(480, MENU_PLAY_HEIGHT)

    expect(spots).toHaveLength(6)
    for (const spot of spots) {
      expect(Math.abs(spot.x) - spot.radius).toBeGreaterThan(MENU_PLAY_CHARM_CLEARANCE)
      expect(Math.abs(spot.x) + spot.radius).toBeLessThanOrEqual(480 / 2)
      expect(spot.y - spot.radius).toBeGreaterThanOrEqual(-MENU_PLAY_HEIGHT / 2 - 8)
      expect(spot.y + spot.radius).toBeLessThanOrEqual(MENU_PLAY_HEIGHT / 2)
      expect(spot.angle).not.toBe(0)
    }
    expect(new Set(spots.map((spot) => spot.angle)).size).toBeGreaterThanOrEqual(4)
  })

  it('fits the shorter modal action button', () => {
    for (const spot of playCharmSpots(480, 92)) {
      expect(Math.abs(spot.x) - spot.radius).toBeGreaterThan(MENU_PLAY_CHARM_CLEARANCE)
      expect(Math.abs(spot.y) + spot.radius).toBeLessThan(92 / 2 + 6)
    }
  })

  it('keeps clear of the best badge above the CTA', () => {
    const sizes = [
      [1280, 720],
      [720, 1558],
      [768, 1024],
    ] as const

    for (const [width, height] of sizes) {
      const layout = computeMenuLayout(viewport(width, height))
      // 1.2x radius covers the stem and leaf drawn above the fruit body.
      const fruitTop = Math.min(
        ...playCharmSpots(layout.playWidth, MENU_PLAY_HEIGHT).map(
          (spot) => layout.playY + spot.y - spot.radius * 1.2,
        ),
      )
      // BEST_BADGE / 2, the star medallion drawn by MenuScene.
      const badgeBottom = layout.bestY + 21

      expect(fruitTop - badgeBottom, `${width}x${height}`).toBeGreaterThanOrEqual(8)
    }
  })
})

describe('superFruitSpot', () => {
  it('sits on the right end of the rewarded action, clear of the label band', () => {
    for (const height of [76, 84, 92, 64]) {
      const spot = superFruitSpot(480, height)

      expect(spot.radius, `height ${height}`).toBeGreaterThanOrEqual(12)
      expect(spot.radius, `height ${height}`).toBeLessThanOrEqual(18)
      // Ink rim of the fruit body stays on the face.
      expect(spot.x + spot.radius + 3, `height ${height}`).toBeLessThanOrEqual(480 / 2)
      // Crown (plus tween bob) stays inside the face.
      expect(spot.radius * SUPER_FRUIT_CROWN + 2, `height ${height}`).toBeLessThanOrEqual(
        height / 2,
      )
      // The glow never reaches the centred icon and label band.
      expect(spot.x - spot.radius * SUPER_FRUIT_HALO, `height ${height}`).toBeGreaterThanOrEqual(
        ACTION_LABEL_BAND,
      )
    }
  })
})

describe('computeMenuLayout', () => {
  it('splits the menu on wide screens and keeps the demo clear of the CTA', () => {
    const layout = computeMenuLayout(viewport(1280, 720))

    expect(layout.mode).toBe('split')
    expect(layout.demo.visible).toBe(true)
    expect(layout.demo.angle).toBe(-2)
    expect(layout.playWidth).toBe(480)
    expect(layout.logoMaxWidth).toBe(560)
    expect(layout.bestY).toBeGreaterThan(layout.logoY)
    expect(layout.playY).toBeGreaterThan(layout.bestY)
    expect(layout.hintY).toBeGreaterThan(layout.playY)
    expect(layout.installHintY).toBeGreaterThan(layout.hintY)
    expect(layout.settings.sound.x).toBeLessThan(layout.settings.language.x)
    expect(layout.settings.language.x + layout.settings.size / 2).toBe(1280 - 24)
    expect(layout.settings.language.y).toBeLessThan(layout.logoY)
    expect(layout.settings.sound.y + layout.settings.size / 2).toBeLessThan(
      layout.demo.y - layout.demo.height / 2,
    )
    expect(layout.demo.x - layout.demo.width / 2).toBeGreaterThan(
      layout.centerX + layout.playWidth / 2,
    )
  })

  it('raises the portrait CTA and puts the hint footer below it', () => {
    const layout = computeMenuLayout(viewport(720, 1558))

    expect(layout.mode).toBe('single')
    expect(layout.centerX).toBe(360)
    expect(layout.logoMaxWidth).toBe(720 - 48)
    expect(layout.playWidth).toBe(480)
    expect(layout.playY).toBeGreaterThan(1558 * 0.72)
    expect(layout.playY).toBeLessThan(1558 * 0.82)
    expect(layout.playY + MENU_PLAY_HEIGHT / 2).toBeLessThanOrEqual(1558 * 0.84)
    expect(layout.hintY).toBeGreaterThan(layout.playY + MENU_PLAY_HEIGHT / 2)
    expect(layout.installHintY).toBeGreaterThan(layout.hintY)
    expect(layout.demo.visible).toBe(true)
    expect(layout.demo.angle).toBe(0)
    expect(layout.demo.y - layout.demo.height / 2).toBeGreaterThan(layout.bestY)
    expect(layout.demo.y + layout.demo.height / 2).toBeLessThan(layout.playY - MENU_PLAY_HEIGHT / 2)
  })

  it('reserves two lines for the install hint without crowding the CTA footer', () => {
    const insets = { top: 0, right: 0, bottom: 40, left: 0 }
    const layout = computeMenuLayout(viewport(720, 1558, insets), MENU_LOGO_HEIGHT, true, true)
    const hintBottom = layout.hintY + MENU_HINT_HEIGHT / 2
    const installTop = layout.installHintY - MENU_INSTALL_HINT_HEIGHT / 2

    expect(installTop).toBeGreaterThan(hintBottom)
    expect(layout.installHintY + MENU_INSTALL_HINT_HEIGHT / 2).toBeLessThanOrEqual(
      1558 - insets.bottom,
    )
    expect(layout.playY + MENU_PLAY_HEIGHT / 2).toBeLessThan(layout.hintY - MENU_HINT_HEIGHT / 2)
  })

  it('keeps the CTA near four fifths of the height across portrait sizes', () => {
    for (const [width, height] of [
      [720, 1558],
      [720, 1280],
      [720, 960],
      [720, 1895],
    ] as const) {
      const layout = computeMenuLayout(viewport(width, height))
      const ratio = (layout.playY + MENU_PLAY_HEIGHT / 2) / height

      expect(ratio, `${width}x${height}`).toBeGreaterThan(0.78)
      expect(ratio, `${width}x${height}`).toBeLessThan(0.85)
      expect(layout.hintY, `${width}x${height}`).toBeGreaterThan(layout.playY)
    }
  })

  it('keeps the touch landscape split and its install hint inside the safe area', () => {
    const insets = { top: 0, right: 0, bottom: 40, left: 0 }
    const layout = computeMenuLayout(viewport(1558, 720, insets), MENU_LOGO_HEIGHT, true, true)

    expect(layout.mode).toBe('split')
    expect(layout.demo.visible).toBe(true)
    expect(layout.playY + MENU_PLAY_HEIGHT / 2).toBeLessThan(720 * 0.75)
    expect(layout.hintY).toBeGreaterThan(layout.playY + MENU_PLAY_HEIGHT / 2)
    expect(layout.installHintY + MENU_INSTALL_HINT_HEIGHT / 2).toBeLessThanOrEqual(
      720 - insets.bottom,
    )
  })

  it('enlarges the settings targets on touch and clears the logo', () => {
    const layout = computeMenuLayout(viewport(720, 1558), MENU_LOGO_HEIGHT, true)

    expect(layout.settings.size).toBe(MENU_SETTINGS_TOUCH_SIZE)
    expect(layout.settings.language.x + layout.settings.size / 2).toBe(720 - 24)
    expect(layout.settings.language.x - layout.settings.sound.x).toBeGreaterThanOrEqual(
      MENU_SETTINGS_HIT,
    )
    expect(layout.settings.sound.y + layout.settings.size / 2).toBeLessThanOrEqual(
      layout.logoY - MENU_LOGO_HEIGHT / 2,
    )
  })

  it('keeps the demo on a 4:3 tablet and drops it on square screens', () => {
    expect(computeMenuLayout(viewport(768, 1024)).demo.visible).toBe(true)
    expect(computeMenuLayout(viewport(720, 720)).demo.visible).toBe(false)
    expect(computeMenuLayout(viewport(720, 720)).mode).toBe('single')
  })

  it('keeps every menu element inside the safe area', () => {
    const insets = { top: 40, right: 88, bottom: 40, left: 88 }
    const cases: Array<readonly [number, number, Insets, boolean]> = [
      [1280, 720, NO_INSETS, false],
      [1558, 720, NO_INSETS, false],
      [960, 720, NO_INSETS, false],
      [720, 1558, NO_INSETS, false],
      [768, 1024, NO_INSETS, false],
      [720, 720, NO_INSETS, false],
      [1558, 720, insets, true],
      [720, 1558, insets, true],
    ]

    for (const [width, height, edge, showInstall] of cases) {
      const layout = computeMenuLayout(
        viewport(width, height, edge),
        MENU_LOGO_HEIGHT,
        showInstall,
        showInstall,
      )
      const tag = `${width}x${height}`
      expect(layout.centerX, tag).toBeGreaterThanOrEqual(edge.left)
      expect(layout.centerX, tag).toBeLessThanOrEqual(width - edge.right)
      expect(layout.logoY, tag).toBeGreaterThanOrEqual(edge.top)
      expect(layout.hintY, tag).toBeLessThanOrEqual(height - edge.bottom)
      if (showInstall) {
        expect(layout.installHintY - MENU_INSTALL_HINT_HEIGHT / 2, tag).toBeGreaterThanOrEqual(
          edge.top,
        )
        expect(layout.installHintY + MENU_INSTALL_HINT_HEIGHT / 2, tag).toBeLessThanOrEqual(
          height - edge.bottom,
        )
      }
      expect(layout.playY - MENU_PLAY_HEIGHT / 2, tag).toBeGreaterThanOrEqual(edge.top)
      expect(layout.playY + MENU_PLAY_HEIGHT / 2, tag).toBeLessThanOrEqual(height - edge.bottom)
      expect(layout.centerX - layout.playWidth / 2, tag).toBeGreaterThanOrEqual(edge.left)
      expect(layout.centerX + layout.playWidth / 2, tag).toBeLessThanOrEqual(width - edge.right)

      for (const point of [layout.settings.sound, layout.settings.language]) {
        expect(point.x - layout.settings.size / 2, tag).toBeGreaterThanOrEqual(edge.left)
        expect(point.x + layout.settings.size / 2, tag).toBeLessThanOrEqual(width - edge.right)
        expect(point.y - layout.settings.size / 2, tag).toBeGreaterThanOrEqual(edge.top)
        expect(point.y + layout.settings.size / 2, tag).toBeLessThanOrEqual(height - edge.bottom)
      }

      if (layout.mode === 'single') {
        expect(layout.settings.sound.y + layout.settings.size / 2, tag).toBeLessThanOrEqual(
          layout.logoY - MENU_LOGO_HEIGHT / 2,
        )
      }

      if (layout.mode === 'single' && layout.demo.visible) {
        expect(layout.demo.y + layout.demo.height / 2, tag).toBeLessThan(layout.installHintY)
      }

      if (!layout.demo.visible) continue
      expect(layout.demo.scale, tag).toBeGreaterThan(0)
      expect(layout.demo.x - layout.demo.width / 2, tag).toBeGreaterThanOrEqual(edge.left)
      expect(layout.demo.x + layout.demo.width / 2, tag).toBeLessThanOrEqual(width - edge.right)
      expect(layout.demo.y - layout.demo.height / 2, tag).toBeGreaterThanOrEqual(edge.top)
      expect(layout.demo.y + layout.demo.height / 2, tag).toBeLessThanOrEqual(height - edge.bottom)
    }
  })
})
