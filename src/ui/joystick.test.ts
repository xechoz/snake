import { describe, expect, it } from 'vitest'
import { resolveJoystickDirection } from './joystick'

describe('resolveJoystickDirection', () => {
  it('ignores movement inside the dead zone', () => {
    expect(resolveJoystickDirection(0, 0, 30, null)).toBeNull()
    expect(resolveJoystickDirection(20, 19, 30, null)).toBeNull()
    expect(resolveJoystickDirection(0, 29, 30, null)).toBeNull()
    expect(resolveJoystickDirection(0, 30, 30, null)).toBe('down')
  })

  it('maps cardinal pushes', () => {
    expect(resolveJoystickDirection(0, -60, 30, null)).toBe('up')
    expect(resolveJoystickDirection(0, 60, 30, null)).toBe('down')
    expect(resolveJoystickDirection(-60, 0, 30, null)).toBe('left')
    expect(resolveJoystickDirection(60, 0, 30, null)).toBe('right')
  })

  it('keeps the previous axis near a diagonal', () => {
    expect(resolveJoystickDirection(50, -50, 30, 'up')).toBe('up')
    expect(resolveJoystickDirection(50, -50, 30, 'right')).toBe('right')
    expect(resolveJoystickDirection(50, -50, 30, null)).toBe('right')
  })

  it('switches once an axis clearly dominates', () => {
    expect(resolveJoystickDirection(70, -40, 30, 'up')).toBe('right')
    expect(resolveJoystickDirection(40, -70, 30, 'right')).toBe('up')
  })
})
