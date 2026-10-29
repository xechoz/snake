import { describe, expect, it } from 'vitest'
import type { SnakeSave } from '../save'
import { LEVELS } from './levels'
import {
  applyLevelResult,
  isLevelUnlocked,
  MAX_STARS,
  nextLevelId,
  nextUnlockedLevel,
  totalStars,
} from './progress'

function save(patch: Partial<SnakeSave> = {}): SnakeSave {
  return {
    best: 0,
    plays: 0,
    pendingSuper: false,
    unlockedSkins: [],
    activeSkin: 'random',
    coins: 0,
    levels: {},
    daily: null,
    ...patch,
  }
}

describe('level progress', () => {
  it('unlocks levels in order and opens the second world after four stars', () => {
    const fresh = save()
    expect(isLevelUnlocked(fresh, '1-1')).toBe(true)
    expect(isLevelUnlocked(fresh, '1-2')).toBe(false)
    expect(isLevelUnlocked(fresh, '2-1')).toBe(false)

    const oneStar = save({ levels: { '1-1': { stars: 1, bestSteps: 20, golden: false } } })
    expect(isLevelUnlocked(oneStar, '1-2')).toBe(true)
    expect(isLevelUnlocked(oneStar, '2-1')).toBe(false)

    const fourStars = save({
      levels: {
        '1-1': { stars: 1, bestSteps: 20, golden: false },
        '1-2': { stars: 1, bestSteps: 20, golden: false },
        '1-3': { stars: 1, bestSteps: 20, golden: false },
        '1-4': { stars: 1, bestSteps: 20, golden: false },
      },
    })
    expect(totalStars(fourStars)).toBe(4)
    expect(isLevelUnlocked(fourStars, '2-1')).toBe(true)
    expect(isLevelUnlocked(fourStars, '2-2')).toBe(false)
  })

  it('continues at the first level without a star', () => {
    expect(nextLevelId(save())).toBe('1-1')
    const progressed = save({
      levels: { '1-1': { stars: 2, bestSteps: 20, golden: false } },
    })
    expect(nextLevelId(progressed)).toBe('1-2')
    expect(
      nextLevelId(
        save({
          levels: Object.fromEntries(
            LEVELS.map((level) => [level.id, { stars: 1, bestSteps: 1, golden: false }]),
          ),
        }),
      ),
    ).toBe('1-1')
  })

  it('only offers the next level when it is unlocked', () => {
    const fresh = save()
    expect(nextUnlockedLevel(fresh, '1-1')).toBeNull()
    const oneStar = save({ levels: { '1-1': { stars: 1, bestSteps: 20, golden: false } } })
    expect(nextUnlockedLevel(oneStar, '1-1')).toBe('1-2')
  })

  it('keeps the best stars and steps and pays coins once per clear', () => {
    const first = applyLevelResult(save(), '1-1', 2, 30, false)
    expect(first.levels['1-1']).toEqual({ stars: 2, bestSteps: 30, golden: false })
    expect(first.coins).toBe(40)

    const better = applyLevelResult(first, '1-1', 3, 24, true)
    expect(better.levels['1-1']).toEqual({ stars: 3, bestSteps: 24, golden: true })
    expect(better.coins).toBe(40 + 10)

    const worse = applyLevelResult(better, '1-1', 1, 50, false)
    expect(worse.levels['1-1']).toEqual({ stars: 3, bestSteps: 24, golden: true })
    expect(worse.coins).toBe(better.coins)
  })

  it('reports the full star ceiling', () => {
    expect(MAX_STARS).toBe(LEVELS.length * 3)
  })
})
