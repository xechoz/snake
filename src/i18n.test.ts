import type { Lang } from '@mg/platform'
import { describe, expect, it } from 'vitest'
import { snakeI18n } from './i18n'

const LANGS: Lang[] = ['en', 'fr', 'it', 'de', 'es', 'tr', 'zh', 'ja', 'ko', 'pt', 'ru']

describe('snake i18n', () => {
  it('has the same keys in every language', () => {
    const expected = Object.keys(snakeI18n.en).sort()
    for (const lang of LANGS) {
      expect(Object.keys(snakeI18n[lang]).sort(), lang).toEqual(expected)
    }
  })

  it('keeps the score placeholders', () => {
    for (const lang of LANGS) {
      expect(snakeI18n[lang]['menu.best'], lang).toContain('{score}')
      expect(snakeI18n[lang]['over.best'], lang).toContain('{best}')
    }
  })

  it('has no empty strings', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(snakeI18n[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe('')
      }
    }
  })
})
