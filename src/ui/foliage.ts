import type Phaser from 'phaser'
import { snakeColors } from '../colors'

/**
 * Background flora: the game's "habitat" vocabulary.
 *
 * Leaves carry the fruit theme without ever reading as edible. They
 * deliberately avoid the three signatures every fruit on the board has — a
 * round body, a glow halo and a breathing pulse — so nothing in the scenery
 * competes with the player's search for the next pickup.
 */

export interface LeafSpec {
  /** Tail of the leaf; the blade grows along `angle`. */
  readonly x: number
  readonly y: number
  readonly length: number
  readonly width: number
  /** Radians, 0 points right. */
  readonly angle: number
  readonly color: number
  readonly alpha: number
}

const LEAF_SEGMENTS = 6

/** A pointed leaf: two sine-tapered edges swept along the blade axis. */
export function drawLeaf(graphics: Phaser.GameObjects.Graphics, leaf: LeafSpec): void {
  const dirX = Math.cos(leaf.angle)
  const dirY = Math.sin(leaf.angle)
  const normalX = -dirY
  const normalY = dirX

  graphics.fillStyle(leaf.color, leaf.alpha)

  let previousA = { x: leaf.x, y: leaf.y }
  let previousB = { x: leaf.x, y: leaf.y }

  for (let step = 1; step <= LEAF_SEGMENTS; step += 1) {
    const t = step / LEAF_SEGMENTS
    const along = t * leaf.length
    const half = (leaf.width / 2) * Math.sin(Math.PI * t) ** 0.72
    const midX = leaf.x + dirX * along
    const midY = leaf.y + dirY * along
    const a = { x: midX + normalX * half, y: midY + normalY * half }
    const b = { x: midX - normalX * half, y: midY - normalY * half }

    // Triangles instead of `fillPoints`: the latter only takes Phaser Vector2
    // instances, and the whole art layer stays free of a runtime Phaser import.
    graphics.fillTriangle(previousA.x, previousA.y, previousB.x, previousB.y, b.x, b.y)
    graphics.fillTriangle(previousA.x, previousA.y, b.x, b.y, a.x, a.y)

    previousA = a
    previousB = b
  }
}

/** Leaf angles relative to the outward diagonal, plus length, tone and weight. */
const SPRIG_LEAVES = [
  { tilt: -0.3, length: 26, width: 10.4, tone: 'mid', alpha: 0.65 },
  { tilt: 0.04, length: 17, width: 6.8, tone: 'light', alpha: 0.9 },
  { tilt: 0.36, length: 13, width: 5.2, tone: 'mid', alpha: 0.45 },
] as const

/**
 * Three leaves fanning out of a frame corner. `outward` is a unit vector
 * pointing away from the playfield, so the sprig never reaches over a cell.
 */
export function drawCornerSprig(
  graphics: Phaser.GameObjects.Graphics,
  corner: { readonly x: number; readonly y: number },
  outward: { readonly x: number; readonly y: number },
): void {
  const base = Math.atan2(outward.y, outward.x)
  const foliage = snakeColors.art.foliage

  graphics.lineStyle(1.8, foliage.mid, 0.35)
  graphics.lineBetween(corner.x, corner.y, corner.x + outward.x * 6, corner.y + outward.y * 6)

  for (const leaf of SPRIG_LEAVES) {
    const angle = base + leaf.tilt
    drawLeaf(graphics, {
      x: corner.x + Math.cos(angle) * 1.5,
      y: corner.y + Math.sin(angle) * 1.5,
      length: leaf.length,
      width: leaf.width,
      angle,
      color: leaf.tone === 'light' ? foliage.light : foliage.mid,
      alpha: leaf.alpha,
    })
  }
}
