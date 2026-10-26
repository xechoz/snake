import type { Rng } from '@mg/core/rng'
import { snakeConfig } from './config'
import { createInitialState, enqueueDirection, step } from './state'
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

/** The attract loop: a safe 12-step tour that eats twice and grows to 5. */
export const MENU_DEMO_SCRIPT: readonly Direction[] = [
  'right',
  'right',
  'up',
  'up',
  'left',
  'left',
  'left',
  'down',
  'down',
  'down',
  'right',
  'right',
]

const FIRST_FOOD = { x: 4, y: 2 } as const
const SECOND_FOOD = { x: 2, y: 3 } as const

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
  readonly mode: 'auto' | 'manual'
  readonly scriptIndex: number
  readonly round: number
}

export interface MenuDemoAdvance {
  readonly state: MenuDemoState
  readonly events: readonly SnakeEvent[]
  readonly scriptDone: boolean
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
    mode: 'auto',
    scriptIndex: 0,
    round,
  }
}

/**
 * Advances one fixed step. The auto tour follows a curated script; once the
 * player steers, the same rules as the real game take over without a script.
 */
export function advanceMenuDemo(state: MenuDemoState, rng: Rng): MenuDemoAdvance {
  if (state.snake.status !== 'alive') {
    return { state, events: [], scriptDone: state.mode === 'auto' }
  }

  let snake = state.snake
  let scriptIndex = state.scriptIndex

  if (state.mode === 'auto') {
    const direction = MENU_DEMO_SCRIPT[scriptIndex]
    if (!direction) return { state, events: [], scriptDone: true }
    snake = enqueueDirection(snake, direction)
    scriptIndex += 1
  }

  const result = step(snake, rng)
  let next: MenuDemoState = { ...state, snake: result.state, scriptIndex }

  // The attract loop needs a second visible meal. Only the scripted run gets
  // the curated cell; a manual run keeps the normal random respawn.
  if (
    state.mode === 'auto' &&
    scriptIndex === 1 &&
    result.events.some((event) => event.type === 'eat')
  ) {
    next = {
      ...next,
      snake: {
        ...result.state,
        foods: [{ cell: { ...SECOND_FOOD }, kind: fruitKindAt(state.round + 1) }],
      },
    }
  }

  return {
    state: next,
    events: result.events,
    scriptDone: state.mode === 'auto' && scriptIndex >= MENU_DEMO_SCRIPT.length,
  }
}

/** Returns accepted=false for a duplicate or illegal reversal. */
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
