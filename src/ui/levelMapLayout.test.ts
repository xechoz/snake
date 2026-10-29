import type { Viewport } from '@mg/core'
import { describe, expect, it } from 'vitest'
import { LEVELS, levelsOf, WORLDS } from '../logic/levels'
import type { Rect } from './layout'
import {
  computeLevelMapLayout,
  type LevelMapLayout,
  type LevelMapLayoutInput,
  type LevelMapNode,
} from './levelMapLayout'

function viewport(
  width: number,
  height: number,
  insets = { top: 0, right: 0, bottom: 0, left: 0 },
): Viewport {
  return { width, height, insets }
}

function input(width: number, height: number, insets?: Viewport['insets']): LevelMapLayoutInput {
  return {
    viewport: viewport(width, height, insets),
    worlds: WORLDS.map((world) => {
      const levels = levelsOf(world.id)
      return {
        id: world.id,
        nameKey: world.nameKey,
        stars: levels.length * 2,
        maxStars: levels.length * 3,
        unlocked: true,
        gateStars: world.starGate,
        levels: levels.map((level, index) => ({
          id: level.id,
          label: level.id.split('-')[1] ?? level.id,
          open: index <= 2,
          stars: index % 4,
          current: index === 3,
        })),
      }
    }),
  }
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

function nodeFootprint(node: LevelMapNode): Rect {
  return {
    x: node.x - node.size / 2,
    y: node.y - node.size / 2,
    width: node.size,
    height: node.size + 40,
  }
}

function expectInside(rect: Rect, outer: Rect): void {
  expect(rect.x).toBeGreaterThanOrEqual(outer.x)
  expect(rect.y).toBeGreaterThanOrEqual(outer.y)
  expect(rect.x + rect.width).toBeLessThanOrEqual(outer.x + outer.width + 0.01)
  expect(rect.y + rect.height).toBeLessThanOrEqual(outer.y + outer.height + 0.01)
}

function expectNoOverlap(layout: LevelMapLayout): void {
  const nodes = layout.worlds.flatMap((world) => world.nodes)
  for (let index = 0; index < nodes.length; index += 1) {
    for (let other = index + 1; other < nodes.length; other += 1) {
      const a = nodes[index]
      const b = nodes[other]
      expect(a, `node ${index}`).toBeDefined()
      expect(b, `node ${other}`).toBeDefined()
      if (!a || !b) continue
      expect(intersects(nodeFootprint(a), nodeFootprint(b)), `${a.id} overlaps ${b.id}`).toBe(false)
    }
  }
}

describe('computeLevelMapLayout', () => {
  it('puts the orchard and bog on one row each at 16:9', () => {
    const layout = computeLevelMapLayout(input(1280, 720))

    expect(layout.columns).toBe(6)
    expect(layout.worlds).toHaveLength(2)
    expect(layout.worlds[0]?.nodes).toHaveLength(6)
    expect(layout.worlds[1]?.nodes).toHaveLength(6)
    expect(layout.worlds[0]?.gate).not.toBeNull()
    expect(layout.worlds[1]?.gate).toBeNull()
    expect(layout.nodeSize).toBeGreaterThanOrEqual(56)
    const orchard = layout.worlds[0]
    const bog = layout.worlds[1]
    if (orchard?.gate && bog) {
      expect(orchard.gate.y).toBeGreaterThan(orchard.bounds.y + orchard.bounds.height)
      expect(orchard.gate.y + orchard.gate.height).toBeLessThan(bog.bounds.y)
    }
    expectNoOverlap(layout)
    for (const world of layout.worlds) {
      for (const node of world.nodes) expectInside(nodeFootprint(node), layout.card)
    }
  })

  it('uses three columns and two rows on a tall phone', () => {
    const layout = computeLevelMapLayout(input(720, 1280))

    expect(layout.columns).toBe(3)
    expect(layout.nodeSize).toBeGreaterThanOrEqual(96)
    expect(layout.card.height).toBeLessThanOrEqual(900)
    expectNoOverlap(layout)
    const first = layout.worlds[0]?.nodes[0]
    const fourth = layout.worlds[0]?.nodes[3]
    expect(first?.y).toBeLessThan(fourth?.y ?? 0)
    for (const world of layout.worlds) {
      for (const node of world.nodes) expectInside(nodeFootprint(node), layout.card)
    }
  })

  it('stays on six columns on a square screen', () => {
    const layout = computeLevelMapLayout(input(720, 720))

    expect(layout.columns).toBe(6)
    expectNoOverlap(layout)
    expect(layout.card.height).toBeLessThanOrEqual(720 - 48)
  })

  it('keeps the card inside safe-area insets', () => {
    const layout = computeLevelMapLayout(
      input(1280, 720, { top: 40, right: 20, bottom: 30, left: 60 }),
    )
    const card = layout.card

    expect(card.x).toBeGreaterThanOrEqual(60 + 24)
    expect(card.y).toBeGreaterThanOrEqual(40 + 24)
    expect(card.x + card.width).toBeLessThanOrEqual(1280 - 20 - 24 + 0.01)
    expect(card.y + card.height).toBeLessThanOrEqual(720 - 30 - 24 + 0.01)
    for (const world of layout.worlds) {
      for (const node of world.nodes) expectInside(nodeFootprint(node), card)
    }
  })

  it('keeps node state and the gate requirement', () => {
    const layout = computeLevelMapLayout(input(1280, 720))
    const orchard = layout.worlds[0]
    const bog = layout.worlds[1]

    expect(orchard?.nodes[0]?.stars).toBe(0)
    expect(orchard?.nodes[1]?.open).toBe(true)
    expect(orchard?.nodes[3]?.current).toBe(true)
    expect(orchard?.nodes[5]?.open).toBe(false)
    expect(orchard?.gate?.height).toBe(38)
    expect(bog?.gateStars).toBe(4)
    expect(LEVELS).toHaveLength(12)
    expect(layout.footer.buttonWidth).toBeGreaterThan(0)
  })
})
