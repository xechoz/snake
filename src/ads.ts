import type { GameServices } from '@mg/core'
import { snakeSave } from './save'

export const SUPER_PLACEMENT = 'superfruit'

export function hasPendingSuperReward(services: GameServices): boolean {
  return snakeSave(services).read().pendingSuper
}

/** The reward can be offered when ads exist and one is not already pending. */
export function canOfferSuperReward(services: GameServices): boolean {
  return services.ads.available && !hasPendingSuperReward(services)
}

/** Stores the ad reward so the next run can place the super fruit. */
export function grantSuperReward(services: GameServices): void {
  const save = snakeSave(services)
  save.write({ ...save.read(), pendingSuper: true })
}

/** Consumes the pending reward when a run starts. */
export function takeSuperReward(services: GameServices): boolean {
  const save = snakeSave(services)
  const current = save.read()
  if (!current.pendingSuper) return false

  save.write({ ...current, pendingSuper: false })
  return true
}
