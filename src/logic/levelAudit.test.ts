import { describe, expect, it } from 'vitest'
import { LEVELS, type LevelDef } from './levels'
import type { Cell, Direction } from './types'

interface Bounds {
  /** Fewest steps to bloom every bud, ignoring the snake body as an obstacle. */
  readonly minWin: number
  /** Fewest steps to bloom every bud with the golden seed already collected. */
  readonly minGolden: number
}

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right']
const DELTAS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}
const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}
const DIRECTION_INDEX: Record<Direction, number> = { up: 0, down: 1, left: 2, right: 3 }

function relaxedBounds(level: LevelDef): Bounds {
  const width = level.width
  const height = level.height
  const blocked = new Set(level.blocked.map((cell) => cell.y * width + cell.x))
  const seedIndex = new Map(
    level.seeds.map((seed, index) => [seed.cell.y * width + seed.cell.x, index]),
  )
  const allSeeds = (1 << level.seeds.length) - 1
  const goldenKey = level.golden ? level.golden.y * width + level.golden.x : -1
  const kinds: (string | null)[] = [null, ...new Set(level.fruitPlan.map((fruit) => fruit.kind))]
  const colorCount = kinds.length
  const stateSize =
    width *
    height *
    DIRECTIONS.length *
    (allSeeds + 1) *
    (level.fruitPlan.length + 1) *
    2 *
    colorCount

  const key = (
    pos: number,
    direction: number,
    mask: number,
    fruitIndex: number,
    golden: number,
    color: number,
  ): number =>
    ((((pos * DIRECTIONS.length + direction) * (allSeeds + 1) + mask) *
      (level.fruitPlan.length + 1) +
      fruitIndex) *
      2 +
      golden) *
      colorCount +
    color

  const seen = new Uint8Array(stateSize)
  const startHead = level.start.head
  const start = {
    pos: startHead.y * width + startHead.x,
    direction: DIRECTION_INDEX[level.start.direction],
    mask: 0,
    fruitIndex: 0,
    golden: 0,
    color: 0,
    steps: 0,
  }
  const queue = [start]
  seen[key(start.pos, start.direction, 0, 0, 0, 0)] = 1
  let head = 0
  let minWin = Number.POSITIVE_INFINITY
  let minGolden = Number.POSITIVE_INFINITY

  while (head < queue.length) {
    const current = queue[head]
    head += 1
    if (!current) break

    if (current.mask === allSeeds) {
      minWin = Math.min(minWin, current.steps)
      if (current.golden === 1) minGolden = Math.min(minGolden, current.steps)
      // The level ends on the bloom that completes the garden, so no later
      // move can reach the golden seed.
      continue
    }

    const currentDirection = DIRECTIONS[current.direction]
    if (!currentDirection) continue
    for (const direction of DIRECTIONS) {
      if (direction === OPPOSITE[currentDirection]) continue
      const delta = DELTAS[direction]
      const x = (current.pos % width) + delta.x
      const y = Math.floor(current.pos / width) + delta.y
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const pos = y * width + x
      if (blocked.has(pos)) continue

      let mask = current.mask
      let fruitIndex = current.fruitIndex
      let golden = current.golden
      let color = current.color

      const seedAt = seedIndex.get(pos)
      if (seedAt !== undefined && (mask & (1 << seedAt)) === 0) {
        const seed = level.seeds[seedAt]
        if (seed && (seed.color === 'any' || seed.color === kinds[color])) {
          mask |= 1 << seedAt
        }
      }

      const fruit = level.fruitPlan[fruitIndex]
      if (fruit && fruit.cell.y * width + fruit.cell.x === pos) {
        color = kinds.indexOf(fruit.kind)
        fruitIndex += 1
      }
      if (pos === goldenKey) golden = 1

      const nextDirection = DIRECTION_INDEX[direction]
      const stateKey = key(pos, nextDirection, mask, fruitIndex, golden, color)
      if (seen[stateKey] === 1) continue
      seen[stateKey] = 1
      queue.push({
        pos,
        direction: nextDirection,
        mask,
        fruitIndex,
        golden,
        color,
        steps: current.steps + 1,
      })
    }
  }

  return { minWin, minGolden }
}

const BOUNDS = new Map(LEVELS.map((level) => [level.id, relaxedBounds(level)]))

describe('level audit', () => {
  it('keeps every two-star par within reach of the relaxed route', () => {
    for (const level of LEVELS) {
      const bounds = BOUNDS.get(level.id)
      expect(bounds, level.id).toBeDefined()
      expect(bounds?.minWin, level.id).toBeLessThanOrEqual(level.par)
      expect(level.par, level.id).toBeLessThanOrEqual((bounds?.minWin ?? 0) + 16)
    }
  })

  it('keeps the golden seed a real detour with room under the step limit', () => {
    for (const level of LEVELS) {
      const bounds = BOUNDS.get(level.id)
      expect(Number.isFinite(bounds?.minGolden), level.id).toBe(true)
      expect(bounds?.minGolden ?? 0, level.id).toBeGreaterThanOrEqual((bounds?.minWin ?? 0) + 4)
      expect(bounds?.minGolden ?? 0, level.id).toBeLessThanOrEqual(level.limit)
      expect(level.limit, level.id).toBeGreaterThanOrEqual(level.par + 10)
    }
  })
})
