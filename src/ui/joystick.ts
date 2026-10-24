import type { Direction } from '../logic/types'

const AXIS_HYSTERESIS = 1.15

/**
 * Snake only has four directions, so a diagonal stick push must not alternate
 * between two axes every frame. The previous direction wins inside a small
 * diagonal band until one axis clearly dominates.
 */
export function resolveJoystickDirection(
  x: number,
  y: number,
  deadZone: number,
  previous: Direction | null,
): Direction | null {
  if (x * x + y * y < deadZone * deadZone) return null

  const ax = Math.abs(x)
  const ay = Math.abs(y)
  if (ax > ay * AXIS_HYSTERESIS) return x > 0 ? 'right' : 'left'
  if (ay > ax * AXIS_HYSTERESIS) return y > 0 ? 'down' : 'up'
  if (previous) return previous
  return ax >= ay ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up'
}
