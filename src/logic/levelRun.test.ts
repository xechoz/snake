import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import {
  createLevelState,
  type LevelState,
  levelConfig,
  starsFor,
  stepLevel,
  validateAllLevels,
} from './levelRun'
import { LEVELS, type LevelDef, levelById, startSnake } from './levels'

const baseLevel: LevelDef = {
  id: 'test',
  world: 'orchard',
  width: 6,
  height: 6,
  start: { head: { x: 2, y: 1 }, direction: 'right' },
  blocked: [],
  seeds: [
    { cell: { x: 4, y: 1 }, color: 'any' },
    { cell: { x: 5, y: 1 }, color: 'apple' },
  ],
  fruitPlan: [{ cell: { x: 3, y: 1 }, kind: 'apple' }],
  golden: { x: 4, y: 0 },
  par: 5,
  limit: 10,
  baseTickMs: 160,
  powerUps: false,
}

describe('level authoring', () => {
  it('has valid, non-overlapping levels', () => {
    expect(validateAllLevels()).toEqual([])
  })

  it('starts the snake behind its head', () => {
    expect(startSnake({ head: { x: 2, y: 2 }, direction: 'right' })).toEqual([
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ])
    expect(startSnake({ head: { x: 2, y: 2 }, direction: 'up' })).toEqual([
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ])
  })

  it('builds a level board with the scripted first fruit', () => {
    const state = createLevelState(baseLevel, createRng(1))
    expect(state.snake.snake).toEqual(startSnake(baseLevel.start))
    expect(state.snake.foods).toEqual([{ cell: { x: 3, y: 1 }, kind: 'apple' }])
    expect(state.snake.segmentColors).toEqual([null, null, null])
    expect(state.steps).toBe(0)
    expect(state.status).toBe('playing')
    expect(state.bloomed).toEqual([false, false])
  })

  it('keeps walls and reserved cells out of spawn slots', () => {
    const level: LevelDef = {
      ...baseLevel,
      id: 'reserved',
      width: 4,
      height: 3,
      start: { head: { x: 2, y: 1 }, direction: 'right' },
      seeds: [{ cell: { x: 0, y: 0 }, color: 'any' }],
      fruitPlan: [{ cell: { x: 3, y: 1 }, kind: 'apple' }],
      golden: null,
      blocked: [{ x: 3, y: 2 }],
    }
    const config = levelConfig(level)
    expect(config.blocked).toContainEqual({ x: 3, y: 2 })
    expect(config.reserved).toContainEqual({ x: 0, y: 0 })
    expect(config.reserved).toContainEqual({ x: 3, y: 1 })
  })
})

describe('level rules', () => {
  it('advances the scripted fruit after eating it', () => {
    const level: LevelDef = {
      ...baseLevel,
      id: 'plan',
      seeds: [{ cell: { x: 0, y: 5 }, color: 'any' }],
      fruitPlan: [
        { cell: { x: 3, y: 1 }, kind: 'apple' },
        { cell: { x: 4, y: 3 }, kind: 'orange' },
      ],
    }
    const first = createLevelState(level, createRng(1))
    const result = stepLevel(first, createRng(2))

    expect(result.snakeEvents).toContainEqual(
      expect.objectContaining({ type: 'eat', kind: 'apple' }),
    )
    expect(result.state.snake.foods).toEqual([{ cell: { x: 4, y: 3 }, kind: 'orange' }])
    expect(result.state.fruitIndex).toBe(1)
  })

  it('blooms any seed and keeps the head colour', () => {
    const state = createLevelState(baseLevel, createRng(1))
    const afterFruit = stepLevel(state, createRng(1)).state
    const afterSeed = stepLevel(afterFruit, createRng(1))

    expect(afterSeed.events).toContainEqual({
      type: 'bloom',
      at: { x: 4, y: 1 },
      index: 0,
      color: 'apple',
    })
    expect(afterSeed.state.bloomed).toEqual([true, false])
    expect(afterSeed.state.bloomColors).toEqual(['apple', null])
    expect(afterSeed.state.snake.segmentColors[0]).toBe('apple')
  })

  it('only blooms a colour seed when the head matches', () => {
    const wrongColour: LevelDef = {
      ...baseLevel,
      id: 'wrong',
      seeds: [{ cell: { x: 4, y: 1 }, color: 'apple' }],
      fruitPlan: [{ cell: { x: 3, y: 1 }, kind: 'orange' }],
      golden: null,
    }
    const state = createLevelState(wrongColour, createRng(1))
    const afterFruit = stepLevel(state, createRng(1)).state
    const afterSeed = stepLevel(afterFruit, createRng(1))

    expect(afterSeed.state.bloomed).toEqual([false])
    expect(afterSeed.events.some((event) => event.type === 'bloom')).toBe(false)
  })

  it('wins after the last seed and awards three stars with the golden seed', () => {
    let current = createLevelState(baseLevel, createRng(1))
    const events: ReturnType<typeof stepLevel>['events'][number][] = []

    current = stepLevel(current, createRng(1)).state
    current = move(current, 'up')
    current = move(current, 'right')
    expect(current.golden).toBe(true)
    current = move(current, 'down')
    const result = stepLevel(
      { ...current, snake: { ...current.snake, queue: ['right'] } },
      createRng(1),
    )
    events.push(...result.events)

    expect(result.state.bloomed).toEqual([true, true])
    expect(result.state.status).toBe('won')
    expect(result.state.stars).toBe(3)
    expect(events.some((event) => event.type === 'win')).toBe(true)
  })

  it('fails when the step limit is consumed', () => {
    const level: LevelDef = {
      ...baseLevel,
      id: 'limit',
      seeds: [{ cell: { x: 0, y: 5 }, color: 'any' }],
      fruitPlan: [{ cell: { x: 3, y: 1 }, kind: 'apple' }],
      golden: null,
      par: 1,
      limit: 2,
    }
    const state = createLevelState(level, createRng(1))
    const afterFruit = stepLevel(state, createRng(1)).state
    const result = stepLevel(afterFruit, createRng(1))
    expect(result.state.status).toBe('lost')
    expect(result.state.lostReason).toBe('steps')
    expect(result.events).toContainEqual({ type: 'lose', reason: 'steps' })
  })

  it('fails on a wall before blooming later seeds', () => {
    const level: LevelDef = {
      ...baseLevel,
      id: 'wall',
      width: 4,
      height: 2,
      start: { head: { x: 2, y: 0 }, direction: 'right' },
      seeds: [{ cell: { x: 0, y: 1 }, color: 'any' }],
      fruitPlan: [{ cell: { x: 3, y: 0 }, kind: 'apple' }],
      golden: null,
      par: 1,
      limit: 10,
    }
    const state = createLevelState(level, createRng(1))
    const afterFruit = stepLevel(state, createRng(1)).state
    const afterWall = stepLevel(afterFruit, createRng(1)).state
    expect(afterWall.status).toBe('lost')
    expect(afterWall.lostReason).toBe('wall')
  })

  it('keeps the golden seed and par stars independent', () => {
    expect(starsFor(baseLevel, 4, true)).toBe(3)
    expect(starsFor(baseLevel, 4, false)).toBe(2)
    expect(starsFor(baseLevel, 6, true)).toBe(3)
    expect(starsFor(baseLevel, 6, false)).toBe(1)
  })

  it('keeps every real level playable by construction', () => {
    for (const level of LEVELS) {
      expect(levelById(level.id)?.id, level.id).toBe(level.id)
      expect(level.seeds.length, level.id).toBeGreaterThan(0)
    }
  })
})

function move(state: LevelState, direction: 'up' | 'down' | 'left' | 'right'): LevelState {
  return stepLevel({ ...state, snake: { ...state.snake, queue: [direction] } }, createRng(1)).state
}
