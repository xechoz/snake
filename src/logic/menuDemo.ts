import type { Rng } from '@mg/core/rng'
import { snakeConfig } from './config'
import { createInitialState, enqueueDirection, sameCell, step } from './state'
import type { Direction, FruitKind, SnakeConfig, SnakeEvent, SnakeState } from './types'

export const MENU_DEMO_COLS = 7
export const MENU_DEMO_ROWS = 5
export const MENU_DEMO_CELL = 46

export const MENU_DEMO_CONFIG: SnakeConfig = {
  ...snakeConfig,
  width: MENU_DEMO_COLS,
  height: MENU_DEMO_ROWS,
  initialLength: 3,
  baseTickMs: 460,
  minTickMs: 460,
  speedUpEvery: 1_000_000,
  speedUpStep: 0,
  foodTarget: 1,
  powerUpChance: 0,
  powerUpPity: 1_000_000,
  powerUpTtl: 1,
}

export interface MenuDemoBeat {
  readonly direction: Direction
  readonly steps: number
}

/**
 * The guided tour is a closed rectangle: each beat turns the snake and walks
 * two cells, so every turn is legal and the last beat returns to the start.
 */
export const MENU_DEMO_BEATS: readonly MenuDemoBeat[] = [
  { direction: 'up', steps: 2 },
  { direction: 'left', steps: 2 },
  { direction: 'down', steps: 2 },
  { direction: 'right', steps: 2 },
]

const FIRST_FOOD = { x: 3, y: 1 } as const
const SECOND_FOOD = { x: 1, y: 1 } as const

const FOOD_KINDS: readonly FruitKind[] = [
  'banana',
  'watermelon',
  'mango',
  'strawberry',
  'pineapple',
  'kiwi',
  'peach',
  'pomegranate',
]

export interface MenuDemoState {
  readonly snake: SnakeState
  readonly mode: 'guided' | 'manual'
  readonly round: number
}

export interface MenuDemoAdvance {
  readonly state: MenuDemoState
  readonly events: readonly SnakeEvent[]
}

export function createMenuDemoState(
  rng: Rng,
  startingFruits: readonly FruitKind[] = [],
  round = 0,
): MenuDemoState {
  const snake = createInitialState(MENU_DEMO_CONFIG, rng, startingFruits)
  return {
    snake: {
      ...snake,
      foods: [{ cell: { ...FIRST_FOOD }, kind: fruitKindAt(round) }],
    },
    mode: 'guided',
    round,
  }
}

/**
 * Advances one fixed step without choosing a direction. The guide owns every
 * turn; the demo only follows the queued direction and keeps the two fruit
 * placements that make the tour readable.
 */
export function stepMenuDemo(state: MenuDemoState, rng: Rng): MenuDemoAdvance {
  if (state.snake.status !== 'alive') {
    return { state, events: [] }
  }

  const result = step(state.snake, rng)
  let next: MenuDemoState = { ...state, snake: result.state }

  if (result.events.some((event) => event.type === 'eat' && sameCell(event.at, FIRST_FOOD))) {
    next = {
      ...next,
      snake: {
        ...result.state,
        foods: [{ cell: { ...SECOND_FOOD }, kind: fruitKindAt(state.round + 1) }],
      },
    }
  } else if (
    result.events.some((event) => event.type === 'eat' && sameCell(event.at, SECOND_FOOD))
  ) {
    // The right beat closes the loop on an empty board. Without this the normal
    // respawn could put a random fruit under the returning snake.
    next = { ...next, snake: { ...result.state, foods: [] } }
  }

  return { state: next, events: result.events }
}

/** Queues a guide-driven turn. Returns accepted=false for a duplicate or illegal reversal. */
export function guideMenuDemo(
  state: MenuDemoState,
  direction: Direction,
): { readonly state: MenuDemoState; readonly accepted: boolean } {
  const snake = enqueueDirection(state.snake, direction)
  if (snake === state.snake) return { state, accepted: false }
  return { state: { ...state, snake, mode: 'guided' }, accepted: true }
}

/** Queues a player-driven turn and hands the demo over to manual play. */
export function steerMenuDemo(
  state: MenuDemoState,
  direction: Direction,
): { readonly state: MenuDemoState; readonly accepted: boolean } {
  const snake = enqueueDirection(state.snake, direction)
  if (snake === state.snake) return { state, accepted: false }
  return { state: { ...state, snake, mode: 'manual' }, accepted: true }
}

function fruitKindAt(index: number): FruitKind {
  return FOOD_KINDS[index % FOOD_KINDS.length] ?? 'apple'
}
