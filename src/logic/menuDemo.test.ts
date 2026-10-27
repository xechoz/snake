import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import {
  createMenuDemoState,
  guideMenuDemo,
  MENU_DEMO_BEATS,
  MENU_DEMO_CONFIG,
  type MenuDemoState,
  steerMenuDemo,
  stepMenuDemo,
} from './menuDemo'
import type { SnakeEvent } from './types'

function runGuide(round = 0): {
  state: MenuDemoState
  events: SnakeEvent[]
} {
  const rng = createRng(42 + round)
  let state = createMenuDemoState(rng, [], round)
  const events: SnakeEvent[] = []

  for (const beat of MENU_DEMO_BEATS) {
    const guided = guideMenuDemo(state, beat.direction)
    expect(guided.accepted).toBe(true)
    state = guided.state

    for (let index = 0; index < beat.steps; index += 1) {
      const advanced = stepMenuDemo(state, rng)
      state = advanced.state
      events.push(...advanced.events)
    }
  }

  return { state, events }
}

describe('menu demo state', () => {
  it('starts a 7x5 board with the snake facing the first fruit', () => {
    const state = createMenuDemoState(createRng(1))

    expect(MENU_DEMO_CONFIG.width).toBe(7)
    expect(MENU_DEMO_CONFIG.height).toBe(5)
    expect(state.snake.config).toBe(MENU_DEMO_CONFIG)
    expect(state.snake.snake).toEqual([
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ])
    expect(state.snake.direction).toBe('right')
    expect(state.snake.foods).toEqual([{ cell: { x: 3, y: 1 }, kind: 'banana' }])
    expect(state.mode).toBe('guided')
    expect(state.snake.powerUp).toBeNull()
  })

  it('turns through all four guide beats without dying and eats exactly twice', () => {
    const { state, events } = runGuide()
    const eats = events.filter((event) => event.type === 'eat')

    expect(events.some((event) => event.type === 'die')).toBe(false)
    expect(eats).toHaveLength(2)
    expect(state.snake.status).toBe('alive')
    expect(state.snake.snake).toHaveLength(5)
    expect(state.snake.snake[0]).toEqual({ x: 3, y: 2 })
    expect(state.snake.snake).toEqual([
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ])
    expect(state.snake.foods).toEqual([])
    expect(state.mode).toBe('guided')
  })

  it('curates the second fruit for the next beat and clears it after the second meal', () => {
    const rng = createRng(42)
    const firstTurn = guideMenuDemo(createMenuDemoState(rng), 'up')
    expect(firstTurn.accepted).toBe(true)

    const firstStep = stepMenuDemo(firstTurn.state, rng)
    expect(firstStep.events.some((event) => event.type === 'eat')).toBe(true)
    expect(firstStep.state.snake.foods).toEqual([{ cell: { x: 1, y: 1 }, kind: 'watermelon' }])

    const secondStep = stepMenuDemo(firstStep.state, rng)
    expect(secondStep.events.some((event) => event.type === 'eat')).toBe(false)
    expect(secondStep.state.snake.foods).toEqual([{ cell: { x: 1, y: 1 }, kind: 'watermelon' }])
  })

  it('rejects a same-direction or reverse guide and still accepts legal turns', () => {
    const state = createMenuDemoState(createRng(3))

    expect(guideMenuDemo(state, 'right')).toEqual({ state, accepted: false })
    expect(guideMenuDemo(state, 'left')).toEqual({ state, accepted: false })

    const up = guideMenuDemo(state, 'up')
    expect(up.accepted).toBe(true)
    expect(up.state.mode).toBe('guided')
    expect(up.state.snake.queue).toEqual(['up'])

    expect(guideMenuDemo(up.state, 'down')).toEqual({ state: up.state, accepted: false })

    const queued = guideMenuDemo(up.state, 'right')
    expect(queued.accepted).toBe(true)
    expect(guideMenuDemo(queued.state, 'down').accepted).toBe(false)
  })

  it('hands control to the player and can die on a manual run', () => {
    const rng = createRng(4)
    const turned = steerMenuDemo(createMenuDemoState(rng), 'up')
    expect(turned.accepted).toBe(true)
    expect(turned.state.mode).toBe('manual')

    let state = turned.state
    const events: SnakeEvent[] = []

    for (let index = 0; index < 3; index += 1) {
      const advanced = stepMenuDemo(state, rng)
      state = advanced.state
      events.push(...advanced.events)
    }

    expect(events.some((event) => event.type === 'die')).toBe(true)
    expect(state.snake.status).toBe('dead')
  })
})
