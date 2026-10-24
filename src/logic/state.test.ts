import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { snakeConfig } from './config'
import { cellKey, createInitialState, enqueueDirection, isOpposite, step, tickMs } from './state'
import type { SnakeConfig, SnakeState } from './types'

const config: SnakeConfig = { ...snakeConfig, width: 6, height: 6, initialLength: 3 }

function makeState(patch: Partial<SnakeState> = {}): SnakeState {
  return {
    config,
    snake: [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ],
    direction: 'right',
    queue: [],
    food: null,
    score: 0,
    status: 'alive',
    deathReason: null,
    ...patch,
  }
}

describe('createInitialState', () => {
  it('places a contiguous snake and food outside the body', () => {
    const state = createInitialState(config, createRng(1))
    expect(state.snake).toHaveLength(3)
    expect(state.status).toBe('alive')
    const food = state.food
    expect(food).not.toBeNull()
    if (!food) throw new Error('expected food')
    expect(
      state.snake.some((cell) => cellKey(cell, config.width) === cellKey(food, config.width)),
    ).toBe(false)
  })
})

describe('direction input', () => {
  it('ignores a direct reversal', () => {
    const state = makeState()
    expect(enqueueDirection(state, 'left')).toBe(state)
  })

  it('ignores repeating the current direction', () => {
    const state = makeState()
    expect(enqueueDirection(state, 'right')).toBe(state)
  })

  it('queues at most two turns', () => {
    const state = makeState()
    const first = enqueueDirection(state, 'up')
    const second = enqueueDirection(first, 'left')
    const third = enqueueDirection(second, 'down')
    expect(second.queue).toEqual(['up', 'left'])
    expect(third.queue).toEqual(['up', 'left'])
  })

  it('applies queued turns one per tick', () => {
    const rng = createRng(1)
    const first = step(enqueueDirection(enqueueDirection(makeState(), 'up'), 'left'), rng)
    expect(first.state.snake[0]).toEqual({ x: 2, y: 1 })
    const second = step(first.state, rng)
    expect(second.state.snake[0]).toEqual({ x: 1, y: 1 })
  })

  it('knows opposite directions', () => {
    expect(isOpposite('up', 'down')).toBe(true)
    expect(isOpposite('left', 'right')).toBe(true)
    expect(isOpposite('up', 'left')).toBe(false)
  })
})

describe('step', () => {
  it('moves the head and keeps the length', () => {
    const result = step(makeState(), createRng(1))
    expect(result.state.snake[0]).toEqual({ x: 3, y: 2 })
    expect(result.state.snake).toHaveLength(3)
    expect(result.events).toEqual([])
  })

  it('grows and scores when eating', () => {
    const state = makeState({ food: { x: 3, y: 2 } })
    const result = step(state, createRng(7))
    expect(result.state.snake).toHaveLength(4)
    expect(result.state.score).toBe(10)
    const food = result.state.food
    expect(food).not.toBeNull()
    if (!food) throw new Error('expected food')
    expect(result.state.snake.some((cell) => cellKey(cell, 6) === cellKey(food, 6))).toBe(false)
    expect(result.events[0]).toMatchObject({ type: 'eat', score: 10 })
  })

  it('dies against a wall', () => {
    const state = makeState({
      snake: [
        { x: 5, y: 2 },
        { x: 4, y: 2 },
        { x: 3, y: 2 },
      ],
    })
    const result = step(state, createRng(1))
    expect(result.state.status).toBe('dead')
    expect(result.state.deathReason).toBe('wall')
    expect(result.events).toEqual([{ type: 'die', reason: 'wall' }])
  })

  it('dies when biting a non-tail body segment', () => {
    const state = makeState({
      snake: [
        { x: 2, y: 2 },
        { x: 1, y: 2 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      direction: 'up',
    })
    const result = step(state, createRng(1))
    expect(result.state.status).toBe('dead')
    expect(result.state.deathReason).toBe('self')
  })

  it('wins when the last free cell is eaten', () => {
    const tiny: SnakeConfig = { ...config, width: 2, height: 2 }
    const state = makeState({
      config: tiny,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      direction: 'right',
      food: { x: 1, y: 0 },
    })
    const result = step(state, createRng(1))
    expect(result.state.status).toBe('won')
    expect(result.state.food).toBeNull()
    expect(result.events).toContainEqual({ type: 'win' })
  })

  it('is deterministic for the same seed', () => {
    const state = makeState({ food: { x: 3, y: 2 } })
    const a = step(state, createRng(42))
    const b = step(state, createRng(42))
    expect(a.state.food).toEqual(b.state.food)
  })
})

describe('tickMs', () => {
  it('speeds up with score and clamps at the minimum', () => {
    expect(tickMs(makeState({ score: 0 }))).toBe(145)
    expect(tickMs(makeState({ score: 30 }))).toBe(138)
    expect(tickMs(makeState({ score: 9999 }))).toBe(70)
  })
})
