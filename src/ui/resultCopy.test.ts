import { describe, expect, it } from 'vitest'
import { type ResultInfo, type ResultStrings, resultMeta, resultTitle } from './resultCopy'

// The copy itself lives in the dictionary; these tests pin down which keys are
// composed, in which order, and when a segment is dropped.
const strings: ResultStrings = {
  t: (key, params) => (params ? `${key}(${Object.values(params).join(',')})` : key),
}

const info = (overrides: Partial<ResultInfo>): ResultInfo => ({
  score: 120,
  best: 90,
  newBest: false,
  won: false,
  reason: 'wall',
  ...overrides,
})

describe('resultTitle', () => {
  it('names the plain outcome when nothing special happened', () => {
    expect(resultTitle(strings, info({}))).toBe('over.title')
  })

  it('promotes a record to the title', () => {
    expect(resultTitle(strings, info({ newBest: true }))).toBe('over.newBest')
  })

  it('prefers the win over the record', () => {
    expect(resultTitle(strings, info({ won: true, newBest: true, reason: 'win' }))).toBe(
      'over.winTitle',
    )
  })
})

describe('resultMeta', () => {
  it('pairs the death cause with the record it missed', () => {
    expect(resultMeta(strings, info({}))).toBe('over.wall · over.best(90)')
    expect(resultMeta(strings, info({ reason: 'self' }))).toBe('over.self · over.best(90)')
  })

  it('drops the best score on a record, since the hero number already is it', () => {
    expect(resultMeta(strings, info({ newBest: true }))).toBe('over.wall')
  })

  it('hides a zero best on the first run', () => {
    expect(resultMeta(strings, info({ best: 0, score: 0 }))).toBe('over.wall')
  })

  it('keeps both signals on a win', () => {
    expect(resultMeta(strings, info({ won: true, reason: 'win' }))).toBe('over.best(90)')
    expect(resultMeta(strings, info({ won: true, newBest: true, reason: 'win' }))).toBe(
      'over.newBest',
    )
  })
})
