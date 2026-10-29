import { describe, expect, it } from 'vitest'
import { migrateSnakeSave } from './save'

const emptyProgress = {
  coins: 0,
  levels: {},
  daily: null,
}

describe('snake save migration', () => {
  it('keeps v1 records and starts progression empty', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 1)).toEqual({
      best: 120,
      plays: 4,
      pendingSuper: false,
      unlockedSkins: [],
      activeSkin: 'random',
      ...emptyProgress,
    })
  })

  it('keeps a v2 pending reward and adds the skin defaults', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4, pendingSuper: true }, 2)).toEqual({
      best: 120,
      plays: 4,
      pendingSuper: true,
      unlockedSkins: [],
      activeSkin: 'random',
      ...emptyProgress,
    })
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 2)).toMatchObject({ pendingSuper: false })
  })

  it('keeps v3 skins and adds level progression', () => {
    expect(
      migrateSnakeSave(
        {
          best: 300,
          plays: 9,
          pendingSuper: false,
          unlockedSkins: ['berry'],
          activeSkin: 'berry',
        },
        3,
      ),
    ).toEqual({
      best: 300,
      plays: 9,
      pendingSuper: false,
      unlockedSkins: ['berry'],
      activeSkin: 'berry',
      ...emptyProgress,
    })
  })

  it('drops unknown skins but keeps the record', () => {
    expect(
      migrateSnakeSave({ best: 12, plays: 2, unlockedSkins: ['nope'], activeSkin: 'nope' }, 3),
    ).toMatchObject({ best: 12, unlockedSkins: [], activeSkin: 'random' })
  })

  it('rejects unknown versions and malformed records', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 4)).toBeNull()
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 0)).toBeNull()
    expect(migrateSnakeSave(null, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 'nope', plays: 4 }, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 120 }, 1)).toBeNull()
  })
})
