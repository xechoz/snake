import { describe, expect, it } from 'vitest'
import { resolveSwipe } from './swipe'

describe('resolveSwipe', () => {
  it('returns null below the threshold', () => {
    expect(resolveSwipe(0, 0, 40)).toBeNull()
    expect(resolveSwipe(30, 20, 40)).toBeNull()
  })

  it('maps the dominant axis', () => {
    expect(resolveSwipe(50, 10, 40)).toBe('right')
    expect(resolveSwipe(-50, 10, 40)).toBe('left')
    expect(resolveSwipe(10, 50, 40)).toBe('down')
    expect(resolveSwipe(10, -50, 40)).toBe('up')
  })

  it('prefers horizontal on an exact diagonal', () => {
    expect(resolveSwipe(50, 50, 40)).toBe('right')
    expect(resolveSwipe(-50, 50, 40)).toBe('left')
  })
})
