import type { LevelRecord, SnakeSave } from '../save'
import { LEVELS, levelById, levelsOf, WORLDS, type WorldId } from './levels'

export const MAX_STARS = LEVELS.length * 3

export function totalStars(save: SnakeSave): number {
  return LEVELS.reduce((sum, level) => sum + (save.levels[level.id]?.stars ?? 0), 0)
}

export function starsInWorld(save: SnakeSave, world: WorldId): number {
  return levelsOf(world).reduce((sum, level) => sum + (save.levels[level.id]?.stars ?? 0), 0)
}

export function worldUnlocked(save: SnakeSave, world: WorldId): boolean {
  const def = WORLDS.find((candidate) => candidate.id === world)
  return def ? totalStars(save) >= def.starGate : false
}

export function isLevelUnlocked(save: SnakeSave, levelId: string): boolean {
  const level = levelById(levelId)
  if (!level) return false
  if (!worldUnlocked(save, level.world)) return false

  const worldLevels = levelsOf(level.world)
  const index = worldLevels.findIndex((candidate) => candidate.id === levelId)
  if (index <= 0) return true
  const previous = worldLevels[index - 1]
  return previous ? (save.levels[previous.id]?.stars ?? 0) > 0 : false
}

/** Menu "Continue": the first level that still needs a star. */
export function nextLevelId(save: SnakeSave): string {
  const first = LEVELS.find((level) => (save.levels[level.id]?.stars ?? 0) === 0)
  return first?.id ?? LEVELS[0]?.id ?? '1-1'
}

/** Result screen "Next": only offer the next level when it is already open. */
export function nextUnlockedLevel(save: SnakeSave, levelId: string): string | null {
  const index = LEVELS.findIndex((level) => level.id === levelId)
  const next = index >= 0 ? LEVELS[index + 1] : undefined
  if (!next || !isLevelUnlocked(save, next.id)) return null
  return next.id
}

export function levelRecord(save: SnakeSave, levelId: string): LevelRecord | undefined {
  return save.levels[levelId]
}

/** Pure merge of a finished level; the caller persists the returned save. */
export function applyLevelResult(
  save: SnakeSave,
  levelId: string,
  stars: number,
  steps: number,
  golden: boolean,
): SnakeSave {
  const previous = save.levels[levelId]
  const previousStars = previous?.stars ?? 0
  const firstClear = previousStars === 0
  const gainedStars = Math.max(0, stars - previousStars)
  const record: LevelRecord = {
    stars: Math.max(previousStars, stars),
    bestSteps: Math.min(previous?.bestSteps ?? Number.POSITIVE_INFINITY, steps),
    golden: (previous?.golden ?? false) || golden,
  }

  return {
    ...save,
    coins: save.coins + gainedStars * 10 + (firstClear ? 20 : 0),
    levels: { ...save.levels, [levelId]: record },
  }
}
