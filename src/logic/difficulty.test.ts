import { describe, expect, it } from 'vitest'
import { applyDifficulty, DIFFICULTIES, difficultyProfile } from './difficulty'
import { LEVELS } from './levels'

describe('campaign difficulty', () => {
  it('leaves levels untouched on normal', () => {
    for (const level of LEVELS) {
      expect(applyDifficulty(level, 'normal')).toBe(level)
    }
  })

  it('gives easy runs more steps and a slower tick', () => {
    for (const level of LEVELS) {
      const easy = applyDifficulty(level, 'easy')
      expect(easy.limit).toBeGreaterThan(level.limit)
      expect(easy.baseTickMs).toBeGreaterThan(level.baseTickMs)
      expect(easy.par).toBe(level.par)
    }
  })

  it('tightens hard runs without dropping below par', () => {
    for (const level of LEVELS) {
      const hard = applyDifficulty(level, 'hard')
      expect(hard.limit).toBeGreaterThan(hard.par)
      expect(hard.limit).toBeLessThanOrEqual(level.limit)
      expect(hard.baseTickMs).toBeLessThan(level.baseTickMs)
      expect(hard.baseTickMs).toBeGreaterThanOrEqual(100)
    }
  })

  it('exposes every profile', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(difficultyProfile(difficulty).id).toBe(difficulty)
    }
  })
})
