import type { GameServices, SaveStore } from '@mg/core'
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
}

const isSkinId = (value: unknown): value is SnakeSkinId =>
  typeof value === 'string' && SNAKE_SKINS.some((skin) => skin.id === value)

/**
 * v1 stored only `best` and `plays`; v2 added the pending ad reward; v3 added
 * skins. v4 adds level stars, coins and the daily record. Every version keeps
 * its old fields and starts the new progression empty.
 */
export function migrateSnakeSave(data: unknown, fromVersion: number): SnakeSave | null {
  if (fromVersion < 1 || fromVersion > 3) return null
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
    coins: 0,
    levels: {},
    daily: null,
  }
}

let store: SaveStore<SnakeSave> | null = null

export function snakeSave(services: GameServices): SaveStore<SnakeSave> {
  store ??= services.createSave<SnakeSave>({
    name: 'save',
    version: 4,
    initial: () => ({
      best: 0,
      plays: 0,
      pendingSuper: false,
      unlockedSkins: [],
      activeSkin: 'random',
      coins: 0,
      levels: {},
      daily: null,
    }),
    migrate: migrateSnakeSave,
  })
  return store
}
