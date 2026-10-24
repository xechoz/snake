import type { Rng } from '@mg/core/rng'
import type { Cell, Direction, SnakeConfig, SnakeEvent, SnakeState, StepResult } from './types'

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
  return Math.max(
    state.config.minTickMs,
    state.config.baseTickMs - steps * state.config.speedUpStep,
  )
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
    direction: 'right',
    queue: [],
    food: null,
    score: 0,
    status: 'alive',
    deathReason: null,
  }

  return { ...base, food: spawnFood(base, rng) }
}

export function spawnFood(state: SnakeState, rng: Rng): Cell | null {
  const occupied = new Set(state.snake.map((cell) => cellKey(cell, state.config.width)))
  const free: Cell[] = []
  for (let y = 0; y < state.config.height; y++) {
    for (let x = 0; x < state.config.width; x++) {
      if (!occupied.has(y * state.config.width + x)) free.push({ x, y })
    }
  }
  if (free.length === 0) return null
  return free[rng.int(free.length)] ?? null
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
        status: 'dead',
        deathReason: 'wall',
      },
      events: [{ type: 'die', reason: 'wall' }],
    }
  }

  const eating = state.food !== null && sameCell(nextHead, state.food)
  const bodyToCheck = eating ? state.snake : state.snake.slice(0, -1)
  if (bodyToCheck.some((cell) => sameCell(cell, nextHead))) {
    return {
      state: {
        ...state,
        direction,
        queue: state.queue.slice(1),
        status: 'dead',
        deathReason: 'self',
      },
      events: [{ type: 'die', reason: 'self' }],
    }
  }

  const nextSnake = eating ? [nextHead, ...state.snake] : [nextHead, ...state.snake.slice(0, -1)]
  const nextScore = eating ? state.score + state.config.scorePerFood : state.score

  const moved: SnakeState = {
    ...state,
    snake: nextSnake,
    direction,
    queue: state.queue.slice(1),
    score: nextScore,
  }

  if (!eating) return { state: moved, events: [] }

  const food = spawnFood(moved, rng)
  const events: SnakeEvent[] = [{ type: 'eat', at: nextHead, score: nextScore }]

  if (food === null) {
    events.push({ type: 'win' })
    return { state: { ...moved, food: null, status: 'won' }, events }
  }

  return { state: { ...moved, food }, events }
}
