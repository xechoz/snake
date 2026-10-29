import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, migrateSnakeSave } from './save'

const emptyProgress = {
  coins: 0,
  levels: {},
  daily: null,
  settings: DEFAULT_SETTINGS,
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

  it('keeps v4 campaign progress and adds default settings', () => {
    const migrated = migrateSnakeSave(
      {
        best: 840,
        plays: 31,
        pendingSuper: true,
        unlockedSkins: ['berry'],
        activeSkin: 'random',
        coins: 7,
        levels: {
          '1-1': { stars: 3, bestSteps: 21, golden: true },
          '1-2': { stars: 1, bestSteps: 61, golden: false },
          broken: { stars: 'nope' },
        },
        daily: { date: '2026-10-29', stars: 2 },
      },
      4,
    )

    expect(migrated).toEqual({
      best: 840,
      plays: 31,
      pendingSuper: true,
      unlockedSkins: ['berry'],
      activeSkin: 'random',
      coins: 7,
      levels: {
        '1-1': { stars: 3, bestSteps: 21, golden: true },
        '1-2': { stars: 1, bestSteps: 61, golden: false },
      },
      daily: { date: '2026-10-29', stars: 2 },
      settings: DEFAULT_SETTINGS,
    })
  })

  it('repairs out-of-range v5 settings', () => {
    expect(
      migrateSnakeSave(
        {
          best: 12,
          plays: 2,
          pendingSuper: false,
          unlockedSkins: [],
          activeSkin: 'random',
          coins: 0,
          levels: {},
          daily: null,
          settings: { musicVolume: 4, sfxVolume: -2, difficulty: 'insane' },
        },
        5,
      )?.settings,
    ).toEqual({ musicVolume: 1, sfxVolume: 0, difficulty: 'normal' })
  })

  it('rejects unknown versions and malformed records', () => {
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 6)).toBeNull()
    expect(migrateSnakeSave({ best: 120, plays: 4 }, 0)).toBeNull()
    expect(migrateSnakeSave(null, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 'nope', plays: 4 }, 1)).toBeNull()
    expect(migrateSnakeSave({ best: 120 }, 1)).toBeNull()
  })
})
