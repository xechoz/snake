import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import {
  advanceMenuDemo,
  createMenuDemoState,
  MENU_DEMO_CONFIG,
  MENU_DEMO_SCRIPT,
  type MenuDemoState,
  steerMenuDemo,
} from './menuDemo'
import type { SnakeEvent } from './types'

function runAuto(round = 0): {
  state: MenuDemoState
  events: SnakeEvent[]
} {
  const rng = createRng(42 + round)
  let state = createMenuDemoState(rng, [], round)
  const events: SnakeEvent[] = []

  for (let index = 0; index < MENU_DEMO_SCRIPT.length; index += 1) {
    const advanced = advanceMenuDemo(state, rng)
    state = advanced.state
    events.push(...advanced.events)
  }

  return { state, events }
}

describe('menu demo state', () => {
  it('starts a 7x5 board with the snake facing the first fruit', () => {
    const rng = createRng(1)
    const state = createMenuDemoState(rng)

    expect(MENU_DEMO_CONFIG.width).toBe(7)
    expect(MENU_DEMO_CONFIG.height).toBe(5)
    expect(state.snake.config).toBe(MENU_DEMO_CONFIG)
    expect(state.snake.snake).toEqual([
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ])
    expect(state.snake.direction).toBe('right')
    expect(state.snake.foods).toEqual([{ cell: { x: 4, y: 2 }, kind: 'banana' }])
    expect(state.mode).toBe('auto')
    expect(state.scriptIndex).toBe(0)
    expect(state.snake.powerUp).toBeNull()
  })

  it('completes the script without dying and eats exactly twice', () => {
    const { state, events } = runAuto()
    const eats = events.filter((event) => event.type === 'eat')

    expect(events.some((event) => event.type === 'die')).toBe(false)
    expect(eats).toHaveLength(2)
    expect(state.snake.status).toBe('alive')
    expect(state.snake.snake).toHaveLength(5)
    expect(state.scriptIndex).toBe(MENU_DEMO_SCRIPT.length)
    expect(state.mode).toBe('auto')
  })

  it('curates the second fruit for the attract loop only', () => {
    const rng = createRng(42)
    const first = advanceMenuDemo(createMenuDemoState(rng), rng)
    const second = advanceMenuDemo(first.state, rng)

    expect(first.events.some((event) => event.type === 'eat')).toBe(true)
    expect(first.state.snake.foods).toEqual([{ cell: { x: 2, y: 3 }, kind: 'watermelon' }])
    expect(second.events.some((event) => event.type === 'eat')).toBe(false)
  })

  it('rejects a same-direction or reverse swipe and keeps the script running', () => {
    const rng = createRng(3)
    const state = createMenuDemoState(rng)

    expect(steerMenuDemo(state, 'right')).toEqual({ state, accepted: false })
    expect(steerMenuDemo(state, 'left')).toEqual({ state, accepted: false })

    const up = steerMenuDemo(state, 'up')
    expect(up.accepted).toBe(true)
    expect(up.state.mode).toBe('manual')
    expect(up.state.snake.queue).toEqual(['up'])

    expect(steerMenuDemo(up.state, 'down')).toEqual({ state: up.state, accepted: false })

    const queued = steerMenuDemo(up.state, 'right')
    expect(queued.accepted).toBe(true)
    expect(steerMenuDemo(queued.state, 'down').accepted).toBe(false)
  })

  it('follows player input instead of the script after a swipe and can die', () => {
    const rng = createRng(4)
    const turned = steerMenuDemo(createMenuDemoState(rng), 'up')
    let state = turned.state
    const events: SnakeEvent[] = []

    for (let index = 0; index < 3; index += 1) {
      const advanced = advanceMenuDemo(state, rng)
      state = advanced.state
      events.push(...advanced.events)
    }

    expect(events.some((event) => event.type === 'die')).toBe(true)
    expect(state.snake.status).toBe('dead')
  })
})
