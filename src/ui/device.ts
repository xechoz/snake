import { getServices } from '@mg/core'
import { POKI_HUD_SAFE_TOP } from './layout'

export function hasTouchInput(): boolean {
  return window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0
}

/**
 * The Poki mobile pill sits at the top-left of the game area. Reserve enough
 * room above the side HUD so it never covers the pause button.
 */
export function hostHudSafeTop(): number {
  return getServices().platform.name === 'poki' && hasTouchInput() ? POKI_HUD_SAFE_TOP : 0
}
