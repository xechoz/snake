import type { GameServices, SaveStore } from '@mg/core'

export interface SnakeSave {
  best: number
  plays: number
  /** Ad-reward super fruit waiting for the next run. */
  pendingSuper: boolean
}

/**
 * v1 stored only `best` and `plays`. The reward flag starts empty so old saves
 * keep their records and simply have no pending ad reward.
 */
export function migrateSnakeSave(data: unknown, fromVersion: number): SnakeSave | null {
  if (fromVersion !== 1) return null
  if (typeof data !== 'object' || data === null) return null

  const old = data as Record<string, unknown>
  if (typeof old.best !== 'number' || typeof old.plays !== 'number') return null
  return { best: old.best, plays: old.plays, pendingSuper: false }
}

let store: SaveStore<SnakeSave> | null = null

export function snakeSave(services: GameServices): SaveStore<SnakeSave> {
  store ??= services.createSave<SnakeSave>({
    name: 'save',
    version: 2,
    initial: () => ({ best: 0, plays: 0, pendingSuper: false }),
    migrate: migrateSnakeSave,
  })
  return store
}
