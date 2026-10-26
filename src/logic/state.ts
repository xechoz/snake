import type { Rng } from '@mg/core/rng'
import {
  type Cell,
  type Direction,
  type FoodItem,
  FRUIT_KINDS,
  type FruitKind,
  type PowerUpItem,
  type SnakeConfig,
  type SnakeEvent,
  type SnakeState,
  type StepResult,
} from './types'

const DELTAS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export function cellKey(cell: Cell, width: number): number {
  return cell.y * width + cell.x
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITES[a] === b
}

export function tickMs(state: SnakeState): number {
  const steps = Math.floor(state.speedScore / state.config.speedUpEvery)
  const base = Math.max(
    state.config.minTickMs,
    state.config.baseTickMs - steps * state.config.speedUpStep,
  )
  if (!state.effect) return base
  if (state.effect.kind === 'slow') {
    return Math.min(state.config.slowMaxTickMs, Math.round(base * state.config.slowFactor))
  }
  return Math.max(state.config.fastMinTickMs, Math.round(base * state.config.fastFactor))
}

export function createInitialState(
  config: SnakeConfig,
  rng: Rng,
  startingFruits: readonly FruitKind[] = [],
): SnakeState {
  const headX = Math.floor(config.width / 2)
  const headY = Math.floor(config.height / 2)
  const snake: Cell[] = []
  for (let i = 0; i < config.initialLength; i++) {
    snake.push({ x: headX - i, y: headY })
  }

  const base: SnakeState = {
    config,
    snake,
    segmentColors: snake.map((_, index) => startingFruits[index] ?? null),
    direction: 'right',
    queue: [],
    fruitWeights: { ...config.fruitWeight },
    foods: [],
    superItem: null,
    powerUp: null,
    effect: null,
    feast: null,
    powerUpDrought: 0,
    score: 0,
    speedScore: 0,
    status: 'alive',
    deathReason: null,
  }

  return { ...base, foods: spawnFoods(base, rng) }
}

export function enqueueDirection(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== 'alive') return state

  const last = state.queue.length > 0 ? state.queue[state.queue.length - 1] : state.direction
  if (!last) return state
  if (direction === last || isOpposite(direction, last)) return state
  if (state.queue.length >= 2) return state

  return { ...state, queue: [...state.queue, direction] }
}

/**
 * Multiplies the spawn weight of the given fruits for the rest of the run.
 * Rewarded ads can use this with `highValueFruits`; apply it to the current
 * state for an immediate boost, or to a fresh initial state for the next run.
 * Repeated calls stack.
 */
export function boostFruitWeights(
  state: SnakeState,
  multiplier: number,
  kinds: readonly FruitKind[],
): SnakeState {
  const fruitWeights: Record<FruitKind, number> = { ...state.fruitWeights }
  for (const kind of kinds) {
    fruitWeights[kind] *= multiplier
  }
  return { ...state, fruitWeights }
}

/** Places the ad-reward super fruit on a random free cell. */
export function grantSuperItem(state: SnakeState, rng: Rng): SnakeState {
  if (state.status !== 'alive' || state.superItem) return state

  const free = freeCells(state)
  if (free.length === 0) return state

  const cell = free[rng.int(free.length)]
  if (!cell) return state
  return { ...state, superItem: cell }
}

export function step(state: SnakeState, rng: Rng): StepResult {
  if (state.status !== 'alive') return { state, events: [] }

  // The feast timer follows game time: each fixed step consumes the tick that
  // the loop is about to play, so pausing stops the clock without using frames.
  const stepMs = tickMs(state)
  const events: SnakeEvent[] = []
  let effect = state.effect
  if (effect) {
    const remaining = effect.remaining - 1
    if (remaining <= 0) {
      events.push({ type: 'effectEnd', effect: effect.kind })
      effect = null
    } else {
      effect = { ...effect, remaining }
    }
  }

  let powerUp = state.powerUp
  let drought = state.powerUpDrought
  if (powerUp) {
    const ttl = powerUp.ttl - 1
    if (ttl <= 0) {
      events.push({ type: 'powerExpired', at: powerUp.cell })
      powerUp = null
      drought = 0
    } else {
      powerUp = { ...powerUp, ttl }
    }
  }

  const feastActive = state.feast !== null
  const feastRemaining = state.feast ? state.feast.remainingMs - stepMs : 0
  const feastExpired = feastActive && feastRemaining <= 0

  const direction = state.queue[0] ?? state.direction
  const head = state.snake[0]
  if (!head) return { state, events: [] }

  const delta = DELTAS[direction]
  const nextHead: Cell = { x: head.x + delta.x, y: head.y + delta.y }

  if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.config.width ||
    nextHead.y >= state.config.height
  ) {
    return {
      state: {
        ...state,
        direction,
        queue: state.queue.slice(1),
        effect,
        powerUp,
        powerUpDrought: drought,
        feast: null,
        status: 'dead',
        deathReason: 'wall',
      },
      events: [{ type: 'die', reason: 'wall' }],
    }
  }

  const foodIndex = state.foods.findIndex((food) => sameCell(food.cell, nextHead))
  const food = foodIndex >= 0 ? state.foods[foodIndex] : null
  const eating = food !== null
  const superAtHead = state.superItem !== null && sameCell(state.superItem, nextHead)
  const feastEaten = state.feast ? state.feast.eaten + (eating ? 1 : 0) : 0
  const feastGrows = feastActive && eating && feastEaten % state.config.feastGrowthEvery === 0
  const grows = superAtHead || (eating && (!feastActive || feastGrows))
  const nextFeast =
    feastActive && !feastExpired ? { remainingMs: feastRemaining, eaten: feastEaten } : null
  const bodyToCheck = grows ? state.snake : state.snake.slice(0, -1)
  if (bodyToCheck.some((cell) => sameCell(cell, nextHead))) {
    return {
      state: {
        ...state,
        direction,
        queue: state.queue.slice(1),
        effect,
        powerUp,
        powerUpDrought: drought,
        feast: null,
        status: 'dead',
        deathReason: 'self',
      },
      events: [{ type: 'die', reason: 'self' }],
    }
  }

  // The movement of this tick used the effect that was active when tickMs was
  // read, even if the timer runs out at the end of the same step.
  const multiplier = state.effect?.kind === 'fast' ? state.config.fastScoreMultiplier : 1
  const points = eating ? state.config.fruitScore[food.kind] * multiplier : 0
  const nextSnake = grows ? [nextHead, ...state.snake] : [nextHead, ...state.snake.slice(0, -1)]
  const nextColors = grows ? [food?.kind ?? null, ...state.segmentColors] : state.segmentColors

  if (superAtHead) {
    const cleared: SnakeState = {
      ...state,
      snake: nextSnake,
      segmentColors: nextColors,
      direction,
      queue: state.queue.slice(1),
      superItem: null,
      powerUp: null,
      effect,
      feast: { remainingMs: state.config.feastDurationMs, eaten: 0 },
      powerUpDrought: 0,
      score: state.score,
    }
    events.push({ type: 'feast', at: nextHead })
    return { state: { ...cleared, foods: fillFoods(cleared, rng) }, events }
  }

  const picked = powerUp !== null && sameCell(powerUp.cell, nextHead) ? powerUp : null
  if (picked) {
    effect = {
      kind: picked.kind === 'ice' ? 'slow' : 'fast',
      remaining: state.config.effectTicks[picked.kind === 'ice' ? 'slow' : 'fast'],
    }
    powerUp = null
    drought = 0
    events.push({ type: 'power', at: nextHead, kind: picked.kind, effect: effect.kind })
  }

  const remainingFoods = eating
    ? state.foods.filter((_food, index) => index !== foodIndex)
    : state.foods

  const moved: SnakeState = {
    ...state,
    snake: nextSnake,
    segmentColors: nextColors,
    direction,
    queue: state.queue.slice(1),
    foods: remainingFoods,
    powerUp,
    effect,
    feast: nextFeast,
    powerUpDrought: drought,
    score: state.score + points,
    speedScore: feastActive ? state.speedScore : state.speedScore + points,
  }

  if (feastActive) {
    if (eating) {
      events.push({ type: 'eat', at: nextHead, kind: food.kind, points, score: moved.score })
    }

    // Feast fruit now grows the snake, so the last bite can fill the board
    // before the feast would otherwise fall through to a normal respawn.
    if (nextSnake.length >= state.config.width * state.config.height) {
      events.push({ type: 'win' })
      return {
        state: { ...moved, foods: [], powerUp: null, effect: null, feast: null, status: 'won' },
        events,
      }
    }

    if (remainingFoods.length === 0 || feastExpired) {
      const ended: SnakeState = { ...moved, foods: [], feast: null }
      events.push({ type: 'feastEnd' })
      return { state: { ...ended, foods: spawnFoods(ended, rng) }, events }
    }

    return { state: moved, events }
  }

  if (!eating) return { state: moved, events }

  events.push({ type: 'eat', at: nextHead, kind: food.kind, points, score: moved.score })

  let foods = spawnFoods(moved, rng)
  let finalPowerUp = moved.powerUp
  let finalDrought = moved.powerUpDrought

  // The board can be one cell short at the end. A pickup sitting on that last
  // free cell would leave no fruit and no way to win, so the fruit wins the tie.
  if (foods.length < moved.config.foodTarget && finalPowerUp) {
    const freed = { ...moved, powerUp: null, powerUpDrought: 0 }
    const retry = spawnFoods(freed, rng)
    if (retry.length > foods.length) {
      events.push({ type: 'powerExpired', at: finalPowerUp.cell })
      foods = retry
      finalPowerUp = null
      finalDrought = 0
    }
  }

  if (finalPowerUp === null && nextSnake.length < state.config.width * state.config.height) {
    const rolled = rollPowerUp(
      { ...moved, foods, powerUp: null, powerUpDrought: finalDrought },
      rng,
    )
    finalPowerUp = rolled.powerUp
    finalDrought = rolled.drought
  }

  const settled: SnakeState = {
    ...moved,
    foods,
    powerUp: finalPowerUp,
    powerUpDrought: finalDrought,
  }

  if (nextSnake.length >= state.config.width * state.config.height) {
    events.push({ type: 'win' })
    return {
      state: { ...settled, foods: [], powerUp: null, effect: null, feast: null, status: 'won' },
      events,
    }
  }

  return { state: settled, events }
}

function spawnFoods(state: SnakeState, rng: Rng): FoodItem[] {
  const foods = [...state.foods]
  if (foods.length >= state.config.foodTarget) return foods

  const free = freeCells(state)
  for (let index = foods.length; index < state.config.foodTarget; index += 1) {
    if (free.length === 0) break
    const freeIndex = rng.int(free.length)
    const cell = free[freeIndex]
    if (!cell) break
    free.splice(freeIndex, 1)
    foods.push({ cell, kind: pickFruitKind(state, rng) })
  }
  return foods
}

/** Fills every free cell with fruit while keeping fruit already on the board. */
function fillFoods(state: SnakeState, rng: Rng): FoodItem[] {
  const foods = [...state.foods]
  for (const cell of freeCells(state)) {
    foods.push({ cell, kind: pickFruitKind(state, rng) })
  }
  return foods
}

function rollPowerUp(
  state: SnakeState,
  rng: Rng,
): { powerUp: PowerUpItem | null; drought: number } {
  const drought = state.powerUpDrought + 1
  const spawn = drought >= state.config.powerUpPity || rng.next() < state.config.powerUpChance
  if (!spawn) return { powerUp: null, drought }

  const free = freeCells(state)
  if (free.length === 0) return { powerUp: null, drought }

  const cell = free[rng.int(free.length)]
  if (!cell) return { powerUp: null, drought }

  return {
    powerUp: {
      cell,
      kind: rng.next() < 0.5 ? 'ice' : 'chili',
      ttl: state.config.powerUpTtl,
    },
    drought: 0,
  }
}

function pickFruitKind(state: SnakeState, rng: Rng): FruitKind {
  const total = FRUIT_KINDS.reduce((sum, kind) => sum + state.fruitWeights[kind], 0)
  let roll = rng.next() * total
  for (const kind of FRUIT_KINDS) {
    roll -= state.fruitWeights[kind]
    if (roll < 0) return kind
  }
  return FRUIT_KINDS[0]
}

function freeCells(state: SnakeState): Cell[] {
  const occupied = new Set<number>()
  for (const cell of state.snake) {
    occupied.add(cellKey(cell, state.config.width))
  }
  for (const food of state.foods) {
    occupied.add(cellKey(food.cell, state.config.width))
  }
  if (state.powerUp) {
    occupied.add(cellKey(state.powerUp.cell, state.config.width))
  }
  if (state.superItem) {
    occupied.add(cellKey(state.superItem, state.config.width))
  }

  const free: Cell[] = []
  for (let y = 0; y < state.config.height; y += 1) {
    for (let x = 0; x < state.config.width; x += 1) {
      if (!occupied.has(y * state.config.width + x)) free.push({ x, y })
    }
  }
  return free
}
