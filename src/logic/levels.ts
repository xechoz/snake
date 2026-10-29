import type { Cell, Direction, FruitKind } from './types'

export type WorldId = 'orchard' | 'bog'

export interface LevelSeed {
  readonly cell: Cell
  readonly color: FruitKind | 'any'
}

export interface LevelFruit {
  readonly cell: Cell
  readonly kind: FruitKind
}

export interface LevelStart {
  readonly head: Cell
  readonly direction: Direction
}

export interface LevelDef {
  readonly id: string
  readonly world: WorldId
  readonly width: number
  readonly height: number
  readonly start: LevelStart
  readonly blocked: readonly Cell[]
  readonly seeds: readonly LevelSeed[]
  readonly fruitPlan: readonly LevelFruit[]
  readonly golden: Cell | null
  /** Step count that awards the second star. */
  readonly par: number
  /** Step count that fails the level. */
  readonly limit: number
  readonly baseTickMs: number
  readonly powerUps: boolean
}

export interface WorldDef {
  readonly id: WorldId
  readonly nameKey: string
  /** Stars needed before the world opens. */
  readonly starGate: number
}

export const WORLDS: readonly WorldDef[] = [
  { id: 'orchard', nameKey: 'world.orchard', starGate: 0 },
  { id: 'bog', nameKey: 'world.bog', starGate: 4 },
]

const at = (x: number, y: number): Cell => ({ x, y })
const any = (x: number, y: number): LevelSeed => ({ cell: at(x, y), color: 'any' })
const seed = (x: number, y: number, color: FruitKind): LevelSeed => ({
  cell: at(x, y),
  color,
})
const fruit = (x: number, y: number, kind: FruitKind): LevelFruit => ({
  cell: at(x, y),
  kind,
})

export const LEVELS: readonly LevelDef[] = [
  {
    id: '1-1',
    world: 'orchard',
    width: 12,
    height: 12,
    start: { head: at(2, 6), direction: 'right' },
    blocked: [],
    seeds: [any(4, 6), any(6, 6), any(8, 6), any(9, 9)],
    fruitPlan: [fruit(3, 6, 'apple'), fruit(7, 6, 'orange'), fruit(9, 7, 'lemon')],
    golden: at(11, 11),
    par: 20,
    limit: 40,
    baseTickMs: 185,
    powerUps: false,
  },
  {
    id: '1-2',
    world: 'orchard',
    width: 12,
    height: 12,
    start: { head: at(2, 2), direction: 'right' },
    blocked: [
      at(6, 0),
      at(6, 1),
      at(6, 2),
      at(6, 3),
      at(6, 4),
      at(6, 5),
      at(6, 6),
      at(6, 9),
      at(6, 10),
      at(6, 11),
    ],
    seeds: [any(4, 2), any(9, 2), any(9, 8), any(3, 9)],
    fruitPlan: [fruit(3, 2, 'apple'), fruit(8, 2, 'orange'), fruit(8, 9, 'lemon')],
    golden: at(11, 11),
    par: 34,
    limit: 62,
    baseTickMs: 180,
    powerUps: false,
  },
  {
    id: '1-3',
    world: 'orchard',
    width: 12,
    height: 12,
    start: { head: at(2, 6), direction: 'right' },
    blocked: [],
    seeds: [seed(5, 6, 'apple'), seed(7, 9, 'orange'), seed(9, 9, 'apple')],
    fruitPlan: [fruit(3, 6, 'apple'), fruit(6, 6, 'orange'), fruit(8, 8, 'apple')],
    golden: at(10, 7),
    par: 24,
    limit: 48,
    baseTickMs: 180,
    powerUps: false,
  },
  {
    id: '1-4',
    world: 'orchard',
    width: 12,
    height: 12,
    start: { head: at(2, 9), direction: 'up' },
    blocked: [at(5, 5), at(6, 5), at(7, 5), at(8, 5), at(9, 5)],
    seeds: [any(2, 4), seed(5, 2, 'apple'), seed(8, 2, 'orange'), seed(10, 7, 'grape'), any(4, 10)],
    fruitPlan: [
      fruit(2, 7, 'apple'),
      fruit(7, 1, 'orange'),
      fruit(6, 3, 'orange'),
      fruit(9, 3, 'grape'),
      fruit(9, 10, 'apple'),
    ],
    golden: at(11, 11),
    par: 45,
    limit: 82,
    baseTickMs: 175,
    powerUps: false,
  },
  {
    id: '1-5',
    world: 'orchard',
    width: 12,
    height: 12,
    start: { head: at(6, 9), direction: 'up' },
    blocked: [
      at(2, 2),
      at(3, 2),
      at(2, 3),
      at(9, 2),
      at(9, 3),
      at(8, 2),
      at(2, 9),
      at(2, 10),
      at(3, 10),
      at(9, 9),
      at(9, 10),
      at(8, 10),
    ],
    seeds: [any(6, 2), any(3, 6), any(9, 6), any(5, 9), any(8, 8)],
    fruitPlan: [
      fruit(6, 6, 'apple'),
      fruit(3, 5, 'orange'),
      fruit(9, 5, 'lemon'),
      fruit(6, 3, 'grape'),
    ],
    golden: at(1, 1),
    par: 32,
    limit: 62,
    baseTickMs: 175,
    powerUps: false,
  },
  {
    id: '1-6',
    world: 'orchard',
    width: 12,
    height: 12,
    start: { head: at(3, 1), direction: 'right' },
    blocked: [
      at(2, 3),
      at(3, 3),
      at(4, 3),
      at(5, 3),
      at(8, 3),
      at(9, 3),
      at(10, 3),
      at(2, 6),
      at(3, 6),
      at(4, 6),
      at(7, 6),
      at(8, 6),
      at(9, 6),
      at(2, 9),
      at(3, 9),
      at(4, 9),
      at(5, 9),
      at(8, 9),
      at(9, 9),
      at(10, 9),
    ],
    seeds: [
      seed(5, 1, 'apple'),
      seed(9, 1, 'orange'),
      any(6, 4),
      seed(5, 7, 'grape'),
      seed(9, 7, 'lemon'),
      any(6, 10),
    ],
    fruitPlan: [
      fruit(4, 1, 'apple'),
      fruit(5, 2, 'orange'),
      fruit(6, 5, 'grape'),
      fruit(9, 5, 'lemon'),
      fruit(6, 8, 'grape'),
    ],
    golden: at(11, 0),
    par: 43,
    limit: 88,
    baseTickMs: 170,
    powerUps: false,
  },
  {
    id: '2-1',
    world: 'bog',
    width: 14,
    height: 14,
    start: { head: at(2, 7), direction: 'right' },
    blocked: [
      at(7, 0),
      at(7, 1),
      at(7, 2),
      at(7, 3),
      at(7, 4),
      at(7, 9),
      at(7, 10),
      at(7, 11),
      at(7, 12),
      at(7, 13),
    ],
    seeds: [any(4, 7), any(9, 3), any(10, 7), any(9, 11), any(4, 10)],
    fruitPlan: [
      fruit(3, 7, 'berry'),
      fruit(8, 7, 'melon'),
      fruit(9, 2, 'lemon'),
      fruit(9, 12, 'orange'),
    ],
    golden: at(13, 13),
    par: 36,
    limit: 74,
    baseTickMs: 175,
    powerUps: true,
  },
  {
    id: '2-2',
    world: 'bog',
    width: 14,
    height: 14,
    start: { head: at(6, 11), direction: 'up' },
    blocked: [
      at(2, 4),
      at(3, 4),
      at(4, 4),
      at(5, 4),
      at(8, 4),
      at(9, 4),
      at(10, 4),
      at(11, 4),
      at(2, 9),
      at(3, 9),
      at(4, 9),
      at(9, 9),
      at(10, 9),
      at(11, 9),
    ],
    seeds: [any(6, 2), seed(1, 1, 'berry'), seed(12, 1, 'melon'), any(1, 12), any(12, 12)],
    fruitPlan: [
      fruit(6, 7, 'berry'),
      fruit(1, 7, 'melon'),
      fruit(12, 7, 'lemon'),
      fruit(6, 10, 'orange'),
    ],
    golden: at(7, 0),
    par: 60,
    limit: 86,
    baseTickMs: 170,
    powerUps: true,
  },
  {
    id: '2-3',
    world: 'bog',
    width: 14,
    height: 14,
    start: { head: at(2, 2), direction: 'right' },
    blocked: [
      at(5, 5),
      at(7, 5),
      at(8, 5),
      at(5, 8),
      at(6, 8),
      at(7, 8),
      at(8, 8),
      at(5, 6),
      at(8, 6),
      at(5, 7),
      at(8, 7),
    ],
    seeds: [
      any(4, 2),
      seed(9, 2, 'berry'),
      seed(12, 6, 'melon'),
      seed(9, 11, 'berry'),
      any(4, 11),
      any(6, 6),
    ],
    fruitPlan: [
      fruit(3, 2, 'berry'),
      fruit(10, 2, 'melon'),
      fruit(12, 9, 'berry'),
      fruit(8, 12, 'lemon'),
    ],
    golden: at(0, 13),
    par: 50,
    limit: 94,
    baseTickMs: 170,
    powerUps: true,
  },
  {
    id: '2-4',
    world: 'bog',
    width: 14,
    height: 14,
    start: { head: at(7, 11), direction: 'up' },
    blocked: [
      at(3, 3),
      at(4, 3),
      at(3, 4),
      at(9, 3),
      at(10, 3),
      at(10, 4),
      at(3, 9),
      at(4, 9),
      at(4, 10),
      at(9, 9),
      at(10, 9),
      at(9, 10),
    ],
    seeds: [
      seed(2, 2, 'melon'),
      seed(6, 2, 'berry'),
      seed(11, 2, 'orange'),
      seed(2, 11, 'orange'),
      seed(6, 11, 'melon'),
      seed(11, 11, 'berry'),
    ],
    fruitPlan: [
      fruit(7, 7, 'melon'),
      fruit(2, 5, 'berry'),
      fruit(12, 3, 'orange'),
      fruit(2, 12, 'orange'),
      fruit(11, 12, 'melon'),
    ],
    golden: at(7, 0),
    par: 88,
    limit: 104,
    baseTickMs: 165,
    powerUps: true,
  },
  {
    id: '2-5',
    world: 'bog',
    width: 14,
    height: 14,
    start: { head: at(2, 7), direction: 'right' },
    blocked: [
      at(4, 2),
      at(5, 2),
      at(8, 2),
      at(9, 2),
      at(4, 11),
      at(5, 11),
      at(8, 11),
      at(9, 11),
      at(12, 5),
      at(12, 6),
      at(12, 7),
      at(12, 8),
    ],
    seeds: [
      any(4, 7),
      seed(6, 4, 'berry'),
      seed(9, 7, 'melon'),
      seed(6, 10, 'orange'),
      seed(11, 2, 'berry'),
      seed(11, 12, 'orange'),
    ],
    fruitPlan: [
      fruit(3, 7, 'berry'),
      fruit(6, 3, 'melon'),
      fruit(10, 7, 'orange'),
      fruit(6, 11, 'berry'),
      fruit(11, 6, 'melon'),
    ],
    golden: at(0, 0),
    par: 53,
    limit: 108,
    baseTickMs: 165,
    powerUps: true,
  },
  {
    id: '2-6',
    world: 'bog',
    width: 14,
    height: 14,
    start: { head: at(7, 2), direction: 'down' },
    blocked: [
      at(2, 5),
      at(3, 5),
      at(4, 5),
      at(5, 5),
      at(8, 5),
      at(9, 5),
      at(10, 5),
      at(11, 5),
      at(2, 9),
      at(3, 9),
      at(4, 9),
      at(9, 9),
      at(10, 9),
      at(11, 9),
    ],
    seeds: [
      seed(7, 3, 'melon'),
      seed(2, 2, 'berry'),
      seed(11, 2, 'orange'),
      seed(2, 12, 'orange'),
      seed(7, 11, 'berry'),
      seed(11, 12, 'melon'),
      any(5, 7),
      any(9, 7),
    ],
    fruitPlan: [
      fruit(7, 6, 'melon'),
      fruit(4, 2, 'berry'),
      fruit(10, 2, 'orange'),
      fruit(2, 11, 'orange'),
      fruit(9, 11, 'berry'),
    ],
    golden: at(0, 0),
    par: 86,
    limit: 120,
    baseTickMs: 160,
    powerUps: true,
  },
]

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((level) => level.id === id)
}

export function levelIndex(id: string): number {
  return LEVELS.findIndex((level) => level.id === id)
}

export function nextLevel(id: string): LevelDef | undefined {
  const index = levelIndex(id)
  return index >= 0 ? LEVELS[index + 1] : undefined
}

export function levelsOf(world: WorldId): readonly LevelDef[] {
  return LEVELS.filter((level) => level.world === world)
}

/** Head → tail cells for the fixed start snake, so the body sits behind the head. */
export function startSnake(start: LevelStart, length = 3): readonly Cell[] {
  const delta: Record<Direction, Cell> = {
    up: { x: 0, y: 1 },
    down: { x: 0, y: -1 },
    left: { x: 1, y: 0 },
    right: { x: -1, y: 0 },
  }
  const step = delta[start.direction]
  const cells: Cell[] = []
  for (let index = 0; index < length; index += 1) {
    cells.push({ x: start.head.x + step.x * index, y: start.head.y + step.y * index })
  }
  return cells
}
