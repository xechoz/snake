import type Phaser from 'phaser'
import { describe, expect, it } from 'vitest'
import { drawCornerSprig, drawLeaf } from './foliage'

interface Point {
  x: number
  y: number
}

interface Recorder {
  graphics: Phaser.GameObjects.Graphics
  vertices: Point[]
}

function record(): Recorder {
  const vertices: Point[] = []
  const stub = {
    fillStyle: () => undefined,
    lineStyle: () => undefined,
    fillTriangle: (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
      vertices.push({ x: ax, y: ay }, { x: bx, y: by }, { x: cx, y: cy })
    },
    lineBetween: (ax: number, ay: number, bx: number, by: number) => {
      vertices.push({ x: ax, y: ay }, { x: bx, y: by })
    },
  }
  return {
    graphics: stub as unknown as Phaser.GameObjects.Graphics,
    vertices,
  }
}

describe('frame foliage', () => {
  const corners = [
    { outward: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 } },
    { outward: { x: Math.SQRT1_2, y: -Math.SQRT1_2 } },
    { outward: { x: -Math.SQRT1_2, y: Math.SQRT1_2 } },
    { outward: { x: Math.SQRT1_2, y: Math.SQRT1_2 } },
  ] as const

  it('grows outward only, so it can never cover a playable cell', () => {
    for (const { outward } of corners) {
      const recorder = record()
      drawCornerSprig(recorder.graphics, { x: 500, y: 500 }, outward)

      expect(recorder.vertices.length).toBeGreaterThan(0)
      for (const vertex of recorder.vertices) {
        const projection = (vertex.x - 500) * outward.x + (vertex.y - 500) * outward.y
        expect(projection).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('stays inside the 28px reach the frame leaves room for', () => {
    for (const { outward } of corners) {
      const recorder = record()
      drawCornerSprig(recorder.graphics, { x: 500, y: 500 }, outward)

      const reach = Math.max(
        ...recorder.vertices.map(
          (vertex) => (vertex.x - 500) * outward.x + (vertex.y - 500) * outward.y,
        ),
      )
      expect(reach).toBeLessThanOrEqual(28)
    }
  })
})

describe('backdrop leaves', () => {
  it('builds a closed tapered blade with finite geometry', () => {
    const recorder = record()
    drawLeaf(recorder.graphics, {
      x: 40,
      y: 40,
      length: 18,
      width: 7,
      angle: 0.9,
      color: 0x4fae7e,
      alpha: 0.2,
    })

    // Two triangles per blade segment, tail included.
    expect(recorder.vertices).toHaveLength(36)
    for (const vertex of recorder.vertices) {
      expect(Number.isFinite(vertex.x)).toBe(true)
      expect(Number.isFinite(vertex.y)).toBe(true)
    }
    const spread = Math.max(...recorder.vertices.map((vertex) => vertex.x)) - 40
    expect(spread).toBeLessThan(20)
  })
})
