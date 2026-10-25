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
  const steps = Math.floor(state.score / state.config.speedUpEvery)
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

export function createInitialState(config: SnakeConfig, rng: Rng): SnakeState {
  const headX = Math.floor(config.width / 2)
  const headY = Math.floor(config.height / 2)
  const snake: Cell[] = []
  for (let i = 0; i < config.initialLength; i++) {
    snake.push({ x: headX - i, y: headY })
  }

  const base: SnakeState = {
    config,
    snake,
    segmentColors: snake.map(() => null),
    direction: 'right',
    queue: [],
    foods: [],
    powerUp: null,
    effect: null,
    powerUpDrought: 0,
    score: 0,
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

export function step(state: SnakeState, rng: Rng): StepResult {
  if (state.status !== 'alive') return { state, events: [] }

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
        status: 'dead',
        deathReason: 'wall',
      },
      events: [{ type: 'die', reason: 'wall' }],
    }
  }

  const foodIndex = state.foods.findIndex((food) => sameCell(food.cell, nextHead))
  const food = foodIndex >= 0 ? state.foods[foodIndex] : null
  const eating = food !== null
  const bodyToCheck = eating ? state.snake : state.snake.slice(0, -1)
  if (bodyToCheck.some((cell) => sameCell(cell, nextHead))) {
    return {
      state: {
        ...state,
        direction,
        queue: state.queue.slice(1),
        effect,
        powerUp,
        powerUpDrought: drought,
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
  const nextSnake = eating ? [nextHead, ...state.snake] : [nextHead, ...state.snake.slice(0, -1)]
  const nextColors = eating ? [food.kind, ...state.segmentColors] : state.segmentColors

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
    powerUpDrought: drought,
    score: state.score + points,
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
      state: { ...settled, foods: [], powerUp: null, effect: null, status: 'won' },
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
    foods.push({ cell, kind: pickFruitKind(state.config, rng) })
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

function pickFruitKind(config: SnakeConfig, rng: Rng): FruitKind {
  const total = FRUIT_KINDS.reduce((sum, kind) => sum + config.fruitWeight[kind], 0)
  let roll = rng.next() * total
  for (const kind of FRUIT_KINDS) {
    roll -= config.fruitWeight[kind]
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

  const free: Cell[] = []
  for (let y = 0; y < state.config.height; y += 1) {
    for (let x = 0; x < state.config.width; x += 1) {
      if (!occupied.has(y * state.config.width + x)) free.push({ x, y })
    }
  }
  return free
}
