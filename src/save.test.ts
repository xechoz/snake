import { describe, expect, it } from 'vitest'
import { migrateSnakeSave } from './save'

describe('snake save migration', () => {
  it('keeps v1 records and starts without a pending reward', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 1)).toEqual({
      best: 120,
      plays: 4,
      pendingSuper: false,
    })
  })

  it('rejects unknown versions and malformed records', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 2)).toBeNull()
    expect(migrateSnakeSave(null, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 'nope', plays: 4 }, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 120 }, 1)).toBeNull()
  })
})
