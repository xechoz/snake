import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { highValueFruits, snakeConfig } from './config'
import {
  boostFruitWeights,
  cellKey,
  createInitialState,
  enqueueDirection,
  grantSuperItem,
  isOpposite,
  step,
  tickMs,
} from './state'
import type { FruitFeast, SnakeConfig, SnakeState } from './types'

const config: SnakeConfig = {
  ...snakeConfig,
  width: 6,
  height: 6,
  initialLength: 3,
  powerUpChance: 0,
  powerUpPity: 99,
}

const START: SnakeState['snake'] = [
  { x: 2, y: 2 },
  { x: 1, y: 2 },
  { x: 0, y: 2 },
]

function makeState(patch: Partial<SnakeState> = {}): SnakeState {
  const snake = patch.snake ?? START
  return {
    config,
    snake,
    segmentColors: snake.map(() => null),
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
    speedScore: patch.score ?? 0,
    status: 'alive',
    deathReason: null,
    ...patch,
  }
}

function feastState(patch: Partial<FruitFeast> = {}): FruitFeast {
  return { remainingMs: config.feastDurationMs, eaten: 0, ...patch }
}

describe('createInitialState', () => {
  it('places a contiguous snake, fruit and colour slots', () => {
    const state = createInitialState(config, createRng(1))
    expect(state.snake).toHaveLength(3)
    expect(state.segmentColors).toEqual([null, null, null])
    expect(state.score).toBe(0)
    expect(state.speedScore).toBe(0)
    expect(state.status).toBe('alive')
    expect(state.fruitWeights).toEqual(config.fruitWeight)
    expect(state.fruitWeights).not.toBe(config.fruitWeight)
    expect(state.superItem).toBeNull()
    expect(state.feast).toBeNull()
    expect(state.foods).toHaveLength(config.foodTarget)

    const food = state.foods[0]
    expect(food).toBeDefined()
    if (!food) throw new Error('expected food')
    expect(
      state.snake.some((cell) => cellKey(cell, config.width) === cellKey(food.cell, config.width)),
    ).toBe(false)
  })

  it('paints starting fruit colours from head to tail without scoring', () => {
    const state = createInitialState(config, createRng(1), ['apple', 'orange', 'lemon'])

    expect(state.segmentColors).toEqual(['apple', 'orange', 'lemon'])
    expect(state.score).toBe(0)
    expect(state.speedScore).toBe(0)
    expect(state.snake).toHaveLength(3)
  })

  it('supports multiple fruit slots for future rewards', () => {
    const multi: SnakeConfig = { ...config, foodTarget: 3 }
    const state = createInitialState(multi, createRng(7))
    expect(state.foods).toHaveLength(3)
    const keys = new Set(state.foods.map((food) => cellKey(food.cell, multi.width)))
    expect(keys.size).toBe(3)
    for (const food of state.foods) {
      expect(
        state.snake.some((cell) => cellKey(cell, multi.width) === cellKey(food.cell, multi.width)),
      ).toBe(false)
    }
  })
})

describe('fruit odds', () => {
  it('exposes the high-value fruits used by reward boosts', () => {
    expect(highValueFruits).toEqual(['grape', 'berry', 'melon'])
    for (const kind of highValueFruits) {
      expect(config.fruitScore[kind]).toBeGreaterThanOrEqual(15)
    }
  })

  it('multiplies only the selected weights without mutating the old state', () => {
    const state = makeState()
    const boosted = boostFruitWeights(state, 2, highValueFruits)

    expect(boosted.fruitWeights).toEqual({
      apple: 3,
      orange: 3,
      lemon: 3,
      grape: 4,
      berry: 4,
      melon: 2,
    })
    expect(state.fruitWeights).toEqual(config.fruitWeight)
    expect(config.fruitWeight.grape).toBe(2)
  })

  it('uses the state weights for the next fruit', () => {
    const state = makeState({
      foods: [{ cell: { x: 3, y: 2 }, kind: 'apple' }],
      fruitWeights: { apple: 0, orange: 0, lemon: 0, grape: 0, berry: 0, melon: 1 },
    })

    const result = step(state, createRng(1))
    expect(result.state.foods[0]?.kind).toBe('melon')
  })
})

describe('super fruit and feast', () => {
  it('places the ad reward on a free cell without stacking', () => {
    const state = makeState({
      foods: [{ cell: { x: 4, y: 4 }, kind: 'apple' }],
      powerUp: { cell: { x: 5, y: 5 }, kind: 'ice', ttl: 10 },
    })
    const granted = grantSuperItem(state, createRng(1))

    expect(granted.superItem).not.toBeNull()
    expect(granted.superItem).not.toEqual({ x: 4, y: 4 })
    expect(granted.superItem).not.toEqual({ x: 5, y: 5 })
    expect(state.superItem).toBeNull()
    expect(grantSuperItem(granted, createRng(2))).toBe(granted)
  })

  it('only offers the last free cell to the super fruit', () => {
    const tiny: SnakeConfig = { ...config, width: 2, height: 2 }
    const state = makeState({
      config: tiny,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
    })
    const granted = grantSuperItem(state, createRng(1))
    expect(granted.superItem).toEqual({ x: 1, y: 0 })
  })

  it('starts a feast, floods every free cell and grows from the pickup', () => {
    const state = makeState({ superItem: { x: 3, y: 2 } })
    const result = step(state, createRng(1))

    expect(result.state.snake).toHaveLength(4)
    expect(result.state.segmentColors).toEqual([null, null, null, null])
    expect(result.state.superItem).toBeNull()
    expect(result.state.score).toBe(0)
    expect(result.state.feast).toEqual(feastState())
    expect(result.state.foods).toHaveLength(config.width * config.height - 4)
    expect(new Set(result.state.foods.map((food) => cellKey(food.cell, config.width))).size).toBe(
      result.state.foods.length,
    )
    expect(result.events).toContainEqual({ type: 'feast', at: { x: 3, y: 2 } })
  })

  it('clears the board pickup when the feast starts', () => {
    const state = makeState({
      superItem: { x: 3, y: 2 },
      powerUp: { cell: { x: 4, y: 4 }, kind: 'chili', ttl: 20 },
      foods: [{ cell: { x: 5, y: 5 }, kind: 'melon' }],
    })
    const result = step(state, createRng(1))

    expect(result.state.powerUp).toBeNull()
    expect(result.state.foods).toHaveLength(config.width * config.height - 4)
    expect(result.state.foods).toContainEqual({ cell: { x: 5, y: 5 }, kind: 'melon' })
  })

  it('scores feast fruit without growing before the configured interval', () => {
    const state = makeState({
      feast: feastState(),
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'grape' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const result = step(state, createRng(1))

    expect(result.state.snake).toHaveLength(3)
    expect(result.state.segmentColors).toEqual([null, null, null])
    expect(result.state.score).toBe(15)
    expect(result.state.foods).toHaveLength(1)
    expect(result.state.feast).toEqual(
      feastState({ remainingMs: config.feastDurationMs - 160, eaten: 1 }),
    )
    expect(result.events[0]).toMatchObject({ type: 'eat', kind: 'grape', points: 15 })
  })

  it('grows and tints the head when the feast growth interval is reached', () => {
    const state = makeState({
      feast: feastState({ eaten: config.feastGrowthEvery - 1 }),
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'grape' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const result = step(state, createRng(1))

    expect(result.state.snake).toHaveLength(4)
    expect(result.state.segmentColors).toEqual(['grape', null, null, null])
    expect(result.state.score).toBe(15)
    expect(result.state.feast?.eaten).toBe(config.feastGrowthEvery)
  })

  it('uses the configured feast growth interval', () => {
    const custom: SnakeConfig = { ...config, feastGrowthEvery: 2 }
    const state = makeState({
      config: custom,
      feast: feastState({ eaten: 1 }),
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'apple' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const result = step(state, createRng(1))

    expect(result.state.snake).toHaveLength(4)
    expect(result.state.feast?.eaten).toBe(2)
  })

  it('keeps the chili multiplier during the feast', () => {
    const state = makeState({
      feast: feastState(),
      effect: { kind: 'fast', remaining: 5 },
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'melon' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const result = step(state, createRng(1))
    expect(result.state.score).toBe(40)
    expect(result.state.snake).toHaveLength(3)
    expect(result.state.segmentColors).toEqual([null, null, null])
  })

  it('keeps feast points out of the speed curve', () => {
    const state = makeState({
      feast: feastState(),
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'melon' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const result = step(state, createRng(1))

    expect(result.state.score).toBe(20)
    expect(result.state.speedScore).toBe(0)
    expect(result.state.snake).toHaveLength(3)
    expect(tickMs(result.state)).toBe(config.baseTickMs)
  })

  it('returns to the pre-feast speed when the feast ends', () => {
    const state = makeState({
      score: 300,
      speedScore: 300,
      feast: feastState(),
      foods: [{ cell: { x: 3, y: 2 }, kind: 'apple' }],
    })
    const result = step(state, createRng(1))

    expect(result.state.score).toBe(310)
    expect(result.state.speedScore).toBe(300)
    expect(result.state.feast).toBeNull()
    expect(tickMs(result.state)).toBe(90)
  })

  it('still advances the speed curve on normal fruit', () => {
    const state = makeState({
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'apple' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const result = step(state, createRng(1))

    expect(result.state.score).toBe(10)
    expect(result.state.speedScore).toBe(10)
  })

  it('keeps the feast when the snake moves onto an already eaten cell', () => {
    const state = makeState({
      feast: feastState(),
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'apple' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const first = step(state, createRng(1))
    expect(first.state.feast).not.toBeNull()

    const second = step(first.state, createRng(1))

    expect(second.state.feast).not.toBeNull()
    expect(second.state.foods).toHaveLength(1)
    expect(second.state.feast?.eaten).toBe(1)
    expect(second.events).toEqual([])
  })

  it('ends early when the last feast fruit is eaten and restores normal food', () => {
    const state = makeState({
      feast: feastState(),
      foods: [{ cell: { x: 3, y: 2 }, kind: 'apple' }],
    })
    const result = step(state, createRng(1))

    expect(result.state.feast).toBeNull()
    expect(result.state.foods).toHaveLength(config.foodTarget)
    expect(result.events).toContainEqual({ type: 'feastEnd' })
  })

  it('wins when feast growth fills the board', () => {
    const tiny: SnakeConfig = { ...config, width: 2, height: 2 }
    const state = makeState({
      config: tiny,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      feast: feastState({ eaten: config.feastGrowthEvery - 1 }),
      foods: [{ cell: { x: 1, y: 0 }, kind: 'apple' }],
    })
    const result = step(state, createRng(1))

    expect(result.state.snake).toHaveLength(4)
    expect(result.state.status).toBe('won')
    expect(result.state.feast).toBeNull()
    expect(result.state.foods).toEqual([])
    expect(result.events).toContainEqual({ type: 'win' })
  })

  it('clears the remaining fruit when the timer runs out', () => {
    const state = makeState({
      feast: feastState({ remainingMs: 100 }),
      foods: [{ cell: { x: 4, y: 4 }, kind: 'apple' }],
    })
    const result = step(state, createRng(1))

    expect(result.state.feast).toBeNull()
    expect(result.state.foods).toHaveLength(config.foodTarget)
    expect(result.events).toContainEqual({ type: 'feastEnd' })
  })

  it('does not roll pickups while the feast is active', () => {
    const state = makeState({
      config: { ...config, powerUpChance: 1, powerUpPity: 1 },
      feast: feastState(),
      foods: [
        { cell: { x: 3, y: 2 }, kind: 'apple' },
        { cell: { x: 5, y: 5 }, kind: 'apple' },
      ],
    })
    const result = step(state, createRng(1))
    expect(result.state.powerUp).toBeNull()
  })

  it('does not spawn a normal fruit on the super fruit cell', () => {
    const tiny: SnakeConfig = { ...config, width: 2, height: 2 }
    const state = makeState({
      config: tiny,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      direction: 'right',
      superItem: { x: 1, y: 1 },
      foods: [{ cell: { x: 1, y: 0 }, kind: 'apple' }],
    })
    const result = step(state, createRng(1))

    expect(result.state.superItem).toEqual({ x: 1, y: 1 })
    expect(result.state.foods).toHaveLength(0)
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
    expect(result.state.segmentColors).toEqual([null, null, null])
    expect(result.events).toEqual([])
  })

  it('grows, scores and tints the new head when eating', () => {
    const state = makeState({ foods: [{ cell: { x: 3, y: 2 }, kind: 'apple' }] })
    const result = step(state, createRng(7))
    expect(result.state.snake).toHaveLength(4)
    expect(result.state.segmentColors[0]).toBe('apple')
    expect(result.state.score).toBe(10)
    expect(result.state.foods).toHaveLength(1)
    const food = result.state.foods[0]
    expect(food).toBeDefined()
    if (!food) throw new Error('expected food')
    expect(
      result.state.snake.some(
        (cell) => cellKey(cell, config.width) === cellKey(food.cell, config.width),
      ),
    ).toBe(false)
    expect(result.events[0]).toMatchObject({
      type: 'eat',
      kind: 'apple',
      points: 10,
      score: 10,
    })
  })

  it.each([
    ['apple', 10],
    ['grape', 15],
    ['melon', 20],
  ] as const)('scores %s as %i points', (kind, points) => {
    const state = makeState({ foods: [{ cell: { x: 3, y: 2 }, kind }] })
    const result = step(state, createRng(3))
    expect(result.state.score).toBe(points)
    expect(result.events[0]).toMatchObject({ type: 'eat', kind, points })
  })

  it('keeps colour bands on normal movement and stacks new ones on eat', () => {
    const first = step(
      makeState({ foods: [{ cell: { x: 3, y: 2 }, kind: 'apple' }] }),
      createRng(1),
    )
    expect(first.state.segmentColors).toEqual(['apple', null, null, null])

    const moved = step(first.state, createRng(2))
    expect(moved.state.segmentColors).toEqual(['apple', null, null, null])

    const second = step(
      { ...moved.state, foods: [{ cell: { x: 5, y: 2 }, kind: 'grape' }] },
      createRng(3),
    )
    expect(second.state.segmentColors).toEqual(['grape', 'apple', null, null, null])
  })

  it('doubles fruit points while the chili effect is active', () => {
    const state = makeState({
      foods: [{ cell: { x: 3, y: 2 }, kind: 'melon' }],
      effect: { kind: 'fast', remaining: 5 },
    })
    const result = step(state, createRng(1))
    expect(result.state.score).toBe(40)
    expect(result.state.effect).toEqual({ kind: 'fast', remaining: 4 })
    expect(result.events[0]).toMatchObject({ type: 'eat', points: 40 })
  })

  it('still doubles points on the tick the chili expires', () => {
    const state = makeState({
      foods: [{ cell: { x: 3, y: 2 }, kind: 'grape' }],
      effect: { kind: 'fast', remaining: 1 },
    })
    const result = step(state, createRng(1))
    expect(result.state.score).toBe(30)
    expect(result.state.effect).toBeNull()
    expect(result.events).toContainEqual({ type: 'effectEnd', effect: 'fast' })
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
      foods: [{ cell: { x: 1, y: 0 }, kind: 'apple' }],
    })
    const result = step(state, createRng(1))
    expect(result.state.status).toBe('won')
    expect(result.state.foods).toEqual([])
    expect(result.events).toContainEqual({ type: 'win' })
  })

  it('finishes a multi-fruit board without stalling', () => {
    const tiny: SnakeConfig = { ...config, width: 2, height: 2, foodTarget: 2 }
    const state = makeState({
      config: tiny,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      direction: 'right',
      foods: [
        { cell: { x: 1, y: 0 }, kind: 'apple' },
        { cell: { x: 1, y: 1 }, kind: 'grape' },
      ],
    })
    const first = step(state, createRng(1))
    expect(first.state.status).toBe('alive')
    expect(first.state.foods).toHaveLength(1)

    const second = step(enqueueDirection(first.state, 'down'), createRng(1))
    expect(second.state.status).toBe('won')
    expect(second.state.foods).toEqual([])
  })

  it('frees a pickup on the final cell so a fruit can spawn', () => {
    const tiny: SnakeConfig = { ...config, width: 2, height: 2 }
    const state = makeState({
      config: tiny,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      direction: 'right',
      foods: [{ cell: { x: 1, y: 0 }, kind: 'apple' }],
      powerUp: { cell: { x: 1, y: 1 }, kind: 'ice', ttl: 10 },
    })
    const result = step(state, createRng(1))
    expect(result.state.status).toBe('alive')
    expect(result.state.powerUp).toBeNull()
    expect(result.state.foods).toHaveLength(1)
    expect(result.state.foods[0]?.cell).toEqual({ x: 1, y: 1 })
    expect(result.events).toContainEqual({
      type: 'powerExpired',
      at: { x: 1, y: 1 },
    })
  })

  it('is deterministic for the same seed', () => {
    const state = makeState({ foods: [{ cell: { x: 3, y: 2 }, kind: 'apple' }] })
    const a = step(state, createRng(42))
    const b = step(state, createRng(42))
    expect(a.state.foods).toEqual(b.state.foods)
    expect(a.state.powerUp).toEqual(b.state.powerUp)
  })
})

describe('power-ups', () => {
  it('spawns a pickup after eating when the pity threshold is reached', () => {
    const state = makeState({
      config: { ...config, powerUpChance: 0, powerUpPity: 1 },
      foods: [{ cell: { x: 3, y: 2 }, kind: 'apple' }],
    })
    const result = step(state, createRng(5))
    expect(result.state.powerUp).not.toBeNull()
    expect(result.state.powerUpDrought).toBe(0)
    const powerUp = result.state.powerUp
    if (!powerUp) throw new Error('expected pickup')
    expect(['ice', 'chili']).toContain(powerUp.kind)
    expect(powerUp.ttl).toBe(config.powerUpTtl)
    expect(
      result.state.snake.some(
        (cell) => cellKey(cell, config.width) === cellKey(powerUp.cell, config.width),
      ),
    ).toBe(false)
    expect(
      result.state.foods.some(
        (food) => cellKey(food.cell, config.width) === cellKey(powerUp.cell, config.width),
      ),
    ).toBe(false)
  })

  it('applies ice cream as a slow effect without growing or scoring', () => {
    const state = makeState({
      powerUp: { cell: { x: 3, y: 2 }, kind: 'ice', ttl: 20 },
    })
    const result = step(state, createRng(1))
    expect(result.state.effect).toEqual({
      kind: 'slow',
      remaining: config.effectTicks.slow,
    })
    expect(result.state.snake).toHaveLength(3)
    expect(result.state.score).toBe(0)
    expect(result.state.powerUp).toBeNull()
    expect(result.events[0]).toMatchObject({ type: 'power', kind: 'ice', effect: 'slow' })
  })

  it('applies chili as a fast effect and replaces a slow effect', () => {
    const state = makeState({
      powerUp: { cell: { x: 3, y: 2 }, kind: 'chili', ttl: 20 },
      effect: { kind: 'slow', remaining: 10 },
    })
    const result = step(state, createRng(1))
    expect(result.state.effect).toEqual({
      kind: 'fast',
      remaining: config.effectTicks.fast,
    })
  })

  it('counts down and expires effects', () => {
    const state = makeState({ effect: { kind: 'slow', remaining: 2 } })
    const first = step(state, createRng(1))
    expect(first.state.effect).toEqual({ kind: 'slow', remaining: 1 })
    const second = step(first.state, createRng(1))
    expect(second.state.effect).toBeNull()
    expect(second.events).toContainEqual({ type: 'effectEnd', effect: 'slow' })
  })

  it('expires an untouched pickup and resets the drought counter', () => {
    const state = makeState({
      powerUp: { cell: { x: 4, y: 4 }, kind: 'ice', ttl: 1 },
      powerUpDrought: 3,
    })
    const result = step(state, createRng(1))
    expect(result.state.powerUp).toBeNull()
    expect(result.state.powerUpDrought).toBe(0)
    expect(result.events).toContainEqual({ type: 'powerExpired', at: { x: 4, y: 4 } })
  })
})

describe('tickMs', () => {
  it('speeds up with score and clamps at the minimum', () => {
    expect(tickMs(makeState({ score: 0 }))).toBe(160)
    expect(tickMs(makeState({ score: 30 }))).toBe(153)
    expect(tickMs(makeState({ score: 9999 }))).toBe(70)
  })

  it('slows down and speeds up while preserving the clamps', () => {
    expect(tickMs(makeState({ effect: { kind: 'slow', remaining: 5 } }))).toBe(240)
    expect(
      tickMs(
        makeState({
          config: { ...config, baseTickMs: 200, slowFactor: 2 },
          effect: { kind: 'slow', remaining: 5 },
        }),
      ),
    ).toBe(240)
    expect(tickMs(makeState({ effect: { kind: 'fast', remaining: 5 } }))).toBe(96)
    expect(tickMs(makeState({ score: 9999, effect: { kind: 'fast', remaining: 5 } }))).toBe(58)
  })
})
