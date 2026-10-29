import { getServices, type SfxName, type SfxOptions } from '@mg/core'
import { snakeSave } from '../save'

/**
 * Plays a sound effect at the player's chosen level. The manager's per-call
 * gain is multiplied rather than replaced, so deliberately quiet cues (feast
 * bites, combo pitch ladders) keep their authored balance.
 */
export function playSfx(name: SfxName, options: SfxOptions = {}): void {
  const services = getServices()
  const volume = snakeSave(services).read().settings.sfxVolume
  const clamped = Math.min(1, Math.max(0, volume))
  services.audio.play(name, { ...options, gain: (options.gain ?? 1) * clamped })
}
