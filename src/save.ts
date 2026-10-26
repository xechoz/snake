import type { GameServices, SaveStore } from '@mg/core'
import type { SnakeSkinId } from './skins'

export interface SnakeSave {
  best: number
  plays: number
  /** Ad-reward super fruit waiting for the next run. */
  pendingSuper: boolean
  /** Skin ids unlocked by rewarded ads; default skins are always available. */
  unlockedSkins: readonly SnakeSkinId[]
  /** Fixed skin chosen by the player, or a new random skin each run. */
  activeSkin: SnakeSkinId | 'random'
}

/**
 * v1 stored only `best` and `plays`; v2 added the pending ad reward. Both keep
 * their records and start with the default random skin.
 */
export function migrateSnakeSave(data: unknown, fromVersion: number): SnakeSave | null {
  if (fromVersion !== 1 && fromVersion !== 2) return null
  if (typeof data !== 'object' || data === null) return null

  const old = data as Record<string, unknown>
  if (typeof old.best !== 'number' || typeof old.plays !== 'number') return null
  return {
    best: old.best,
    plays: old.plays,
    pendingSuper: fromVersion === 2 && old.pendingSuper === true,
    unlockedSkins: [],
    activeSkin: 'random',
  }
}

let store: SaveStore<SnakeSave> | null = null

export function snakeSave(services: GameServices): SaveStore<SnakeSave> {
  store ??= services.createSave<SnakeSave>({
    name: 'save',
    version: 3,
    initial: () => ({
      best: 0,
      plays: 0,
      pendingSuper: false,
      unlockedSkins: [],
      activeSkin: 'random',
    }),
    migrate: migrateSnakeSave,
  })
  return store
}
