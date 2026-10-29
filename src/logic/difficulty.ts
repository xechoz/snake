import type { LevelDef } from './levels'

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface DifficultyProfile {
  readonly id: Difficulty
  /** Multiplies the level's step limit. */
  readonly limitScale: number
  /** Milliseconds added to every level tick; positive is slower. */
  readonly tickDelta: number
}

/**
 * Campaign difficulty only changes the pace and the step budget. Star
 * thresholds stay at the authored par, so a higher difficulty never inflates a
 * level's score and an easier run still has to be efficient for two stars.
 */
const PROFILES = {
  easy: { id: 'easy', limitScale: 1.3, tickDelta: 26 },
  normal: { id: 'normal', limitScale: 1, tickDelta: 0 },
  hard: { id: 'hard', limitScale: 0.85, tickDelta: -16 },
} as const satisfies Record<Difficulty, DifficultyProfile>

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']

export const DEFAULT_DIFFICULTY: Difficulty = 'normal'

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard'
}

export function difficultyProfile(difficulty: Difficulty): DifficultyProfile {
  return PROFILES[difficulty]
}

/** Applies a difficulty profile to a level without touching its geometry. */
export function applyDifficulty(level: LevelDef, difficulty: Difficulty): LevelDef {
  const profile = difficultyProfile(difficulty)
  if (profile.id === 'normal') return level

  return {
    ...level,
    limit: Math.max(level.par + 1, Math.round(level.limit * profile.limitScale)),
    baseTickMs: Math.max(100, level.baseTickMs + profile.tickDelta),
  }
}
