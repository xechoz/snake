import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { snakeColors } from './colors'
import { resolveSkin, SNAKE_SKINS, type SnakeSkin, selectableSkins } from './skins'

describe('snake skins', () => {
  it('has unique ids and valid, distinct three-fruit palettes', () => {
    const ids = SNAKE_SKINS.map((skin) => skin.id)
    const fruits = new Set(Object.keys(snakeColors.art.fruits))

    expect(new Set(ids).size).toBe(ids.length)
    for (const skin of SNAKE_SKINS) {
      expect(new Set(skin.palette).size).toBe(3)
      for (const kind of skin.palette) expect(fruits.has(kind)).toBe(true)
      // Lemon's pale yellow gives the white eye almost no contrast.
      expect(skin.palette[0]).not.toBe('lemon')
    }
  })

  it('ships every current skin as default', () => {
    expect(SNAKE_SKINS.every((skin) => skin.unlock === 'default')).toBe(true)
  })

  it('only includes rewarded skins after they are unlocked', () => {
    const locked: SnakeSkin = { ...SNAKE_SKINS[0], unlock: 'rewarded' }

    expect(selectableSkins([locked], [])).toEqual([])
    expect(selectableSkins([locked], ['orchard'])).toEqual([locked])
  })

  it('uses a saved active skin when it is available', () => {
    expect(resolveSkin(createRng(1), { unlocked: [], active: 'berry' }).id).toBe('berry')
  })

  it('picks deterministically and avoids repeating the last skin', () => {
    const first = resolveSkin(createRng(7), { unlocked: [], active: 'random' })
    const second = resolveSkin(createRng(7), { unlocked: [], active: 'random' })
    expect(second.id).toBe(first.id)

    for (let seed = 0; seed < 20; seed += 1) {
      const skin = resolveSkin(createRng(seed), {
        unlocked: [],
        active: 'random',
        last: 'orchard',
      })
      expect(skin.id).not.toBe('orchard')
    }
  })
})
