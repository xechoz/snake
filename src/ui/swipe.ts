import type { Direction } from '../logic/types'

export function resolveSwipe(dx: number, dy: number, threshold: number): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}
