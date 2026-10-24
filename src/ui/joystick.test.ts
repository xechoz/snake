import { describe, expect, it } from 'vitest'
import { resolveJoystickDirection } from './joystick'

describe('resolveJoystickDirection', () => {
  it('ignores movement inside the dead zone', () => {
    expect(resolveJoystickDirection(0, 0, 28, null)).toBeNull()
    expect(resolveJoystickDirection(20, 19, 28, null)).toBeNull()
  })

  it('maps cardinal pushes', () => {
    expect(resolveJoystickDirection(0, -60, 28, null)).toBe('up')
    expect(resolveJoystickDirection(0, 60, 28, null)).toBe('down')
    expect(resolveJoystickDirection(-60, 0, 28, null)).toBe('left')
    expect(resolveJoystickDirection(60, 0, 28, null)).toBe('right')
  })

  it('keeps the previous axis near a diagonal', () => {
    expect(resolveJoystickDirection(50, -50, 28, 'up')).toBe('up')
    expect(resolveJoystickDirection(50, -50, 28, 'right')).toBe('right')
    expect(resolveJoystickDirection(50, -50, 28, null)).toBe('right')
  })

  it('switches once an axis clearly dominates', () => {
    expect(resolveJoystickDirection(70, -40, 28, 'up')).toBe('right')
    expect(resolveJoystickDirection(40, -70, 28, 'right')).toBe('up')
  })
})
