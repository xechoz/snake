import type { GameServices, SaveStore } from '@mg/core'

export interface SnakeSave {
  best: number
  plays: number
}

let store: SaveStore<SnakeSave> | null = null

export function snakeSave(services: GameServices): SaveStore<SnakeSave> {
  store ??= services.createSave<SnakeSave>({
    name: 'save',
    version: 1,
    initial: () => ({ best: 0, plays: 0 }),
  })
  return store
}
