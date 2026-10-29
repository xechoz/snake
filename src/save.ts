import type { GameServices, SaveStore } from '@mg/core'
import { DEFAULT_DIFFICULTY, type Difficulty, isDifficulty } from './logic/difficulty'
import { SNAKE_SKINS, type SnakeSkinId } from './skins'

export interface LevelRecord {
  /** Best star count, 0–3. */
  readonly stars: number
  /** Fewest steps used to clear the level. */
  readonly bestSteps: number
  readonly golden: boolean
}

export interface DailyRecord {
  readonly date: string
  readonly stars: number
}

export interface SnakeSettings {
  /** 0–1 multiplier on the base music volume. */
  readonly musicVolume: number
  /** 0–1 multiplier on every sound effect. */
  readonly sfxVolume: number
  readonly difficulty: Difficulty
}

export interface SnakeSave {
  best: number
  plays: number
  /** Ad-reward super fruit waiting for the next endless run. */
  pendingSuper: boolean
  /** Skin ids unlocked by rewarded ads; default skins are always available. */
  unlockedSkins: readonly SnakeSkinId[]
  /** Fixed skin chosen by the player, or a new random skin each run. */
  activeSkin: SnakeSkinId | 'random'
  coins: number
  /** Cleared levels keyed by level id, e.g. `1-3`. */
  levels: Readonly<Record<string, LevelRecord>>
  daily: DailyRecord | null
  settings: SnakeSettings
}

export const DEFAULT_SETTINGS: SnakeSettings = {
  musicVolume: 0.8,
  sfxVolume: 1,
  difficulty: DEFAULT_DIFFICULTY,
}

const isSkinId = (value: unknown): value is SnakeSkinId =>
  typeof value === 'string' && SNAKE_SKINS.some((skin) => skin.id === value)

function clampUnit(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

function sanitizeSettings(value: unknown): SnakeSettings {
  const old = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return {
    musicVolume: clampUnit(old.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clampUnit(old.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    difficulty: isDifficulty(old.difficulty) ? old.difficulty : DEFAULT_SETTINGS.difficulty,
  }
}

function sanitizeLevels(value: unknown): Record<string, LevelRecord> {
  if (typeof value !== 'object' || value === null) return {}
  const levels: Record<string, LevelRecord> = {}
  for (const [id, raw] of Object.entries(value)) {
    if (typeof raw !== 'object' || raw === null) continue
    const record = raw as Record<string, unknown>
    if (typeof record.stars !== 'number' || typeof record.bestSteps !== 'number') continue
    levels[id] = {
      stars: Math.min(3, Math.max(0, Math.round(record.stars))),
      bestSteps: Math.max(0, Math.round(record.bestSteps)),
      golden: record.golden === true,
    }
  }
  return levels
}

function sanitizeDaily(value: unknown): DailyRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.date !== 'string' || typeof record.stars !== 'number') return null
  return {
    date: record.date,
    stars: Math.min(3, Math.max(0, Math.round(record.stars))),
  }
}

/**
 * v1 stored only `best` and `plays`; v2 added the pending ad reward; v3 added
 * skins. v4 adds level stars, coins and the daily record. v5 adds player
 * settings (volume and campaign difficulty). Every version keeps its old fields
 * and starts anything new at its default.
 */
export function migrateSnakeSave(data: unknown, fromVersion: number): SnakeSave | null {
  if (fromVersion < 1 || fromVersion > 5) return null
  if (typeof data !== 'object' || data === null) return null

  const old = data as Record<string, unknown>
  if (typeof old.best !== 'number' || typeof old.plays !== 'number') return null

  const unlockedSkins =
    fromVersion >= 3 && Array.isArray(old.unlockedSkins) ? old.unlockedSkins.filter(isSkinId) : []
  const activeSkin =
    fromVersion >= 3 && (old.activeSkin === 'random' || isSkinId(old.activeSkin))
      ? old.activeSkin
      : 'random'

  return {
    best: old.best,
    plays: old.plays,
    pendingSuper: fromVersion >= 2 && old.pendingSuper === true,
    unlockedSkins,
    activeSkin,
    coins:
      fromVersion >= 4 && typeof old.coins === 'number' && Number.isFinite(old.coins)
        ? Math.max(0, old.coins)
        : 0,
    levels: fromVersion >= 4 ? sanitizeLevels(old.levels) : {},
    daily: fromVersion >= 4 ? sanitizeDaily(old.daily) : null,
    settings: fromVersion >= 5 ? sanitizeSettings(old.settings) : { ...DEFAULT_SETTINGS },
  }
}

let store: SaveStore<SnakeSave> | null = null

export function snakeSave(services: GameServices): SaveStore<SnakeSave> {
  store ??= services.createSave<SnakeSave>({
    name: 'save',
    version: 5,
    initial: () => ({
      best: 0,
      plays: 0,
      pendingSuper: false,
      unlockedSkins: [],
      activeSkin: 'random',
      coins: 0,
      levels: {},
      daily: null,
      settings: { ...DEFAULT_SETTINGS },
    }),
    migrate: migrateSnakeSave,
  })
  return store
}
