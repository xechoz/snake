import type { Rng } from '@mg/core/rng'
import { snakeConfig } from './config'
import { LEVELS, type LevelDef, levelIndex, startSnake } from './levels'
import { createStateFrom, sameCell, step } from './state'
import type { Cell, FruitKind, SnakeConfig, SnakeEvent, SnakeState } from './types'

export type LevelStatus = 'playing' | 'won' | 'lost'
export type LevelFailReason = 'wall' | 'self' | 'steps'

export interface LevelState {
  readonly def: LevelDef
  readonly snake: SnakeState
  readonly bloomed: readonly boolean[]
  readonly bloomColors: readonly (FruitKind | null)[]
  readonly golden: boolean
  readonly steps: number
  /** Index of the fruit currently on the board, or -1 when the plan is empty. */
  readonly fruitIndex: number
  readonly status: LevelStatus
  readonly lostReason: LevelFailReason | null
  readonly stars: number
  readonly score: number
}

export type LevelEvent =
  | {
      readonly type: 'bloom'
      readonly at: Cell
      readonly index: number
      readonly color: FruitKind | null
    }
  | { readonly type: 'golden'; readonly at: Cell }
  | { readonly type: 'win'; readonly stars: number }
  | { readonly type: 'lose'; readonly reason: LevelFailReason }

export interface LevelStepResult {
  readonly state: LevelState
  readonly events: readonly LevelEvent[]
  readonly snakeEvents: readonly SnakeEvent[]
}

/** Per-level overrides on top of the shared tuning table. */
export function levelConfig(level: LevelDef): SnakeConfig {
  return {
    ...snakeConfig,
    width: level.width,
    height: level.height,
    initialLength: 3,
    baseTickMs: level.baseTickMs,
    minTickMs: level.baseTickMs,
    // Levels have a handcrafted pace; only ice cream and chili change it.
    speedUpEvery: Number.MAX_SAFE_INTEGER,
    speedUpStep: 0,
    foodTarget: 1,
    powerUpChance: level.powerUps ? snakeConfig.powerUpChance : 0,
    powerUpPity: level.powerUps ? snakeConfig.powerUpPity : Number.MAX_SAFE_INTEGER,
    blocked: level.blocked,
    reserved: [
      ...level.seeds.map((seed) => seed.cell),
      ...level.fruitPlan.map((fruit) => fruit.cell),
      ...(level.golden ? [level.golden] : []),
    ],
  }
}

export function createLevelState(level: LevelDef, rng: Rng): LevelState {
  const snake = startSnake(level.start, 3)
  const base = createStateFrom(
    levelConfig(level),
    rng,
    snake,
    level.start.direction,
    snake.map(() => null),
  )
  const first = level.fruitPlan[0]
  const withFood: SnakeState = {
    ...base,
    foods: first ? [{ cell: first.cell, kind: first.kind }] : [],
  }

  return {
    def: level,
    snake: withFood,
    bloomed: level.seeds.map(() => false),
    bloomColors: level.seeds.map(() => null),
    golden: false,
    steps: 0,
    fruitIndex: first ? 0 : -1,
    status: 'playing',
    lostReason: null,
    stars: 0,
    score: 0,
  }
}

export function stepLevel(run: LevelState, rng: Rng): LevelStepResult {
  if (run.status !== 'playing') {
    return { state: run, events: [], snakeEvents: [] }
  }

  const result = step(run.snake, rng)
  const events: LevelEvent[] = []
  let snake = result.state
  let fruitIndex = run.fruitIndex

  const eaten = result.events.find((event) => event.type === 'eat')
  const planned = run.def.fruitPlan[run.fruitIndex]
  if (eaten && planned && sameCell(planned.cell, eaten.at)) {
    fruitIndex = run.fruitIndex + 1
    const next = run.def.fruitPlan[fruitIndex]
    snake = { ...snake, foods: next ? [{ cell: next.cell, kind: next.kind }] : [] }
  }

  const head = snake.snake[0]
  const headColor = snake.segmentColors[0] ?? null
  const bloomed = [...run.bloomed]
  const bloomColors = [...run.bloomColors]

  if (head) {
    for (let index = 0; index < run.def.seeds.length; index += 1) {
      if (bloomed[index]) continue
      const seed = run.def.seeds[index]
      if (!seed || !sameCell(seed.cell, head)) continue
      if (seed.color !== 'any' && seed.color !== headColor) continue
      bloomed[index] = true
      bloomColors[index] = headColor
      events.push({ type: 'bloom', at: head, index, color: headColor })
      break
    }
  }

  let golden = run.golden
  if (!golden && head && run.def.golden && sameCell(run.def.golden, head)) {
    golden = true
    events.push({ type: 'golden', at: head })
  }

  const steps = run.steps + 1
  const completed = bloomed.every(Boolean) || snake.status === 'won'
  let status: LevelStatus = 'playing'
  let lostReason: LevelFailReason | null = null

  if (snake.status !== 'alive' && snake.status !== 'won') {
    status = 'lost'
    lostReason = snake.deathReason ?? 'wall'
  } else if (completed) {
    status = 'won'
  } else if (steps >= run.def.limit) {
    status = 'lost'
    lostReason = 'steps'
  }

  if (status === 'won') events.push({ type: 'win', stars: starsFor(run.def, steps, golden) })
  if (status === 'lost') events.push({ type: 'lose', reason: lostReason ?? 'wall' })

  const blooms = bloomed.filter(Boolean).length
  const stars = status === 'won' ? starsFor(run.def, steps, golden) : 0

  return {
    state: {
      ...run,
      snake,
      bloomed,
      bloomColors,
      golden,
      steps,
      fruitIndex,
      status,
      lostReason,
      stars,
      score: snake.score + blooms * 25 + (golden ? 100 : 0),
    },
    events,
    snakeEvents: result.events,
  }
}

/**
 * Stars measure two independent goals: finishing within par earns the second
 * star, and the golden seed earns the third. Keeping them separate means a
 * handcrafted par never has to double as a golden-seed detour budget.
 */
export function starsFor(level: LevelDef, steps: number, golden: boolean): number {
  if (golden) return 3
  return steps <= level.par ? 2 : 1
}

export function bloomCount(run: LevelState): number {
  return run.bloomed.filter(Boolean).length
}

export function levelNumber(id: string): number {
  return levelIndex(id) + 1
}

/** Authoring guard: every level is within bounds and free of overlapping cells. */
export function validateLevel(level: LevelDef): readonly string[] {
  const errors: string[] = []
  const width = level.width
  const height = level.height
  const inBounds = (cell: Cell): boolean =>
    cell.x >= 0 && cell.y >= 0 && cell.x < width && cell.y < height

  if (level.par <= 0) errors.push(`${level.id}: par must be positive`)
  if (level.limit <= level.par) errors.push(`${level.id}: limit must be greater than par`)
  if (level.seeds.length === 0) errors.push(`${level.id}: needs at least one seed`)
  if (level.fruitPlan.length === 0) errors.push(`${level.id}: needs a fruit plan`)
  if (!level.golden) errors.push(`${level.id}: needs a golden seed for three stars`)

  const occupied = new Map<number, string>()
  const claim = (cell: Cell, label: string): void => {
    if (!inBounds(cell)) {
      errors.push(`${level.id}: ${label} out of bounds (${cell.x},${cell.y})`)
      return
    }
    const key = cell.y * width + cell.x
    const previous = occupied.get(key)
    if (previous) errors.push(`${level.id}: ${label} overlaps ${previous} at (${cell.x},${cell.y})`)
    else occupied.set(key, label)
  }

  for (const [index, cell] of startSnake(level.start, 3).entries()) {
    claim(cell, `start cell ${index}`)
  }
  for (const [index, cell] of level.blocked.entries()) claim(cell, `blocked ${index}`)
  for (const [index, seed] of level.seeds.entries()) claim(seed.cell, `seed ${index}`)
  for (const [index, fruit] of level.fruitPlan.entries()) claim(fruit.cell, `fruit ${index}`)
  if (level.golden) claim(level.golden, 'golden')

  return errors
}

export function validateAllLevels(): readonly string[] {
  return LEVELS.flatMap(validateLevel)
}
