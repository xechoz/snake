import { describe, expect, it } from 'vitest'
import { shouldRestartGameOver } from './restartGate'

describe('shouldRestartGameOver', () => {
  it('allows an ordinary restart while the result modal is open', () => {
    expect(shouldRestartGameOver(true)).toBe(true)
  })

  it('rejects an ordinary restart after the result modal closed', () => {
    expect(shouldRestartGameOver(false)).toBe(false)
  })

  it('allows the rewarded-ad restart even after the modal closed', () => {
    expect(shouldRestartGameOver(false, { commercial: false })).toBe(true)
  })
})
