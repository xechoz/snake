import type { Viewport } from '@mg/core'
import { describe, expect, it } from 'vitest'
import { planOrchard, type SceneryRect, TREE_CANOPY_R, TREE_CANOPY_Y } from './scenery'

function viewport(width: number, height: number): Viewport {
  return { width, height, insets: { top: 0, right: 0, bottom: 0, left: 0 } }
}

function circleHitsRect(x: number, y: number, radius: number, rect: SceneryRect): boolean {
  const closestX = Math.min(Math.max(x, rect.x), rect.x + rect.width)
  const closestY = Math.min(Math.max(y, rect.y), rect.y + rect.height)
  return Math.hypot(x - closestX, y - closestY) < radius
}

describe('orchard scenery plan', () => {
  it('is deterministic for the same viewport and quiet zones', () => {
    const quiet: SceneryRect[] = [{ x: 320, y: 120, width: 640, height: 420 }]
    const view = viewport(1280, 720)
    expect(planOrchard(view, quiet, 'menu')).toEqual(planOrchard(view, quiet, 'menu'))
  })

  it('keeps trees and fence posts out of the quiet zones', () => {
    const quiet: SceneryRect[] = [{ x: 320, y: 120, width: 640, height: 420 }]
    const plan = planOrchard(viewport(1280, 720), quiet, 'menu')
    expect(plan.trees.length).toBeGreaterThan(0)

    for (const tree of plan.trees) {
      const canopyY = tree.y - TREE_CANOPY_Y * tree.scale
      const radius = TREE_CANOPY_R * tree.scale
      for (const rect of quiet) {
        expect(circleHitsRect(tree.x, canopyY, radius, rect), `${tree.x},${tree.y}`).toBe(false)
      }
    }

    for (const post of plan.fence?.posts ?? []) {
      const postRect = {
        x: post.x - 22,
        y: post.y - 40,
        width: 44,
        height: 40,
      }
      for (const rect of quiet) {
        expect(
          postRect.x < rect.x + rect.width &&
            postRect.x + postRect.width > rect.x &&
            postRect.y < rect.y + rect.height &&
            postRect.y + postRect.height > rect.y,
        ).toBe(false)
      }
    }
  })

  it('drops the overhanging branch when the top band is occupied', () => {
    const view = viewport(1280, 720)
    const topBand: SceneryRect[] = [{ x: 0, y: 0, width: 1280, height: 200 }]
    expect(planOrchard(view, [], 'menu').branch).not.toBeNull()
    expect(planOrchard(view, topBand, 'menu').branch).toBeNull()
  })

  it('still dresses small landscape screens', () => {
    const quiet: SceneryRect[] = [
      { x: 160, y: 40, width: 480, height: 90 },
      { x: 180, y: 360, width: 440, height: 60 },
    ]
    const plan = planOrchard(viewport(800, 450), quiet, 'menu')
    expect(plan.trees.length).toBeGreaterThanOrEqual(1)
    expect(plan.rowTrees.length).toBeGreaterThan(8)
    expect(plan.flowers.length).toBeGreaterThan(2)
  })

  it('fills the empty bottom band on portrait screens', () => {
    const quiet: SceneryRect[] = [{ x: 24, y: 199, width: 402, height: 402 }]
    const plan = planOrchard(viewport(450, 800), quiet, 'game')
    expect(plan.trees.some((tree) => tree.y > 600)).toBe(true)
    expect(plan.flowers.some((flower) => flower.y > 620)).toBe(true)
  })
})
