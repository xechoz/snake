import { describe, expect, it } from 'vitest'
import { migrateSnakeSave } from './save'

describe('snake save migration', () => {
  it('keeps v1 records and starts without a pending reward', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 1)).toEqual({
      best: 120,
      plays: 4,
      pendingSuper: false,
      unlockedSkins: [],
      activeSkin: 'random',
    })
  })

  it('keeps a v2 pending reward and adds the skin defaults', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4, pendingSuper: true }, 2)).toEqual({
      best: 120,
      plays: 4,
      pendingSuper: true,
      unlockedSkins: [],
      activeSkin: 'random',
    })
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 2)).toMatchObject({ pendingSuper: false })
  })

  it('rejects unknown versions and malformed records', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 3)).toBeNull()
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 4)).toBeNull()
    expect(migrateSnakeSave(null, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 'nope', plays: 4 }, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 120 }, 1)).toBeNull()
  })
})
