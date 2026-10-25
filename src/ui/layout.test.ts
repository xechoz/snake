import type { Insets, Viewport } from '@mg/core'
import { describe, expect, it } from 'vitest'
import { computeMenuLayout, computeSnakeLayout, inlineScorePositions, type Rect } from './layout'

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
    expect(layout.settingsY).toBeGreaterThan(layout.playY)
    expect(layout.hintY).toBeGreaterThan(layout.settingsY)
    expect(layout.installHintY).toBeGreaterThan(layout.hintY)
    expect(layout.demo.x - layout.demo.width / 2).toBeGreaterThan(
      layout.centerX + layout.playWidth / 2,
    )
  })

  it('anchors the portrait stack high and docks the demo below it', () => {
    const layout = computeMenuLayout(viewport(720, 1558))

    expect(layout.mode).toBe('single')
    expect(layout.centerX).toBe(360)
    expect(layout.logoMaxWidth).toBe(720 - 48)
    expect(layout.playWidth).toBe(480)
    expect(layout.logoY).toBeLessThan(1558 * 0.2)
    expect(layout.demo.visible).toBe(true)
    expect(layout.demo.angle).toBe(0)
    expect(layout.demo.y - layout.demo.height / 2).toBeGreaterThan(layout.installHintY)
    expect(layout.demo.y + layout.demo.height / 2).toBeLessThan(1558)
  })

  it('keeps the demo on a 4:3 tablet and drops it on square screens', () => {
    expect(computeMenuLayout(viewport(768, 1024)).demo.visible).toBe(true)
    expect(computeMenuLayout(viewport(720, 720)).demo.visible).toBe(false)
    expect(computeMenuLayout(viewport(720, 720)).mode).toBe('single')
  })

  it('keeps every menu element inside the safe area', () => {
    const insets = { top: 40, right: 88, bottom: 40, left: 88 }
    const sizes: Array<readonly [number, number, Insets]> = [
      [1280, 720, NO_INSETS],
      [1558, 720, NO_INSETS],
      [960, 720, NO_INSETS],
      [720, 1558, NO_INSETS],
      [768, 1024, NO_INSETS],
      [720, 720, NO_INSETS],
      [1558, 720, insets],
    ]

    for (const [width, height, edge] of sizes) {
      const layout = computeMenuLayout(viewport(width, height, edge))
      const tag = `${width}x${height}`
      expect(layout.centerX, tag).toBeGreaterThanOrEqual(edge.left)
      expect(layout.centerX, tag).toBeLessThanOrEqual(width - edge.right)
      expect(layout.logoY, tag).toBeGreaterThanOrEqual(edge.top)
      expect(layout.hintY, tag).toBeLessThanOrEqual(height - edge.bottom)
      expect(layout.installHintY, tag).toBeLessThanOrEqual(height - edge.bottom)

      if (!layout.demo.visible) continue
      expect(layout.demo.scale, tag).toBeGreaterThan(0)
      expect(layout.demo.x - layout.demo.width / 2, tag).toBeGreaterThanOrEqual(edge.left)
      expect(layout.demo.x + layout.demo.width / 2, tag).toBeLessThanOrEqual(width - edge.right)
      expect(layout.demo.y - layout.demo.height / 2, tag).toBeGreaterThanOrEqual(edge.top)
      expect(layout.demo.y + layout.demo.height / 2, tag).toBeLessThanOrEqual(height - edge.bottom)
    }
  })
})
