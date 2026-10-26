import type { AdService, ModalAction } from '@mg/core'
import { SUPER_PLACEMENT } from '../ads'

export interface SuperOfferActionsOptions {
  ads: Pick<AdService, 'showRewarded'>
  standardLabel: string
  rewardedLabel: string
  loadingLabel: string
  grant: () => void
  restart: () => void
}

/**
 * Game-over actions for the super-fruit rewarded ad.
 *
 * Keeps the compliance shape of `rewardOfferActions` (standard action first,
 * the rewarded action soft with a video icon) but ends the ad flow by
 * restarting the run for every outcome: a completed ad grants the fruit first,
 * while a skip or failure still moves on without it.
 *
 * Both actions share the same height: the standard action keeps the primary
 * position and styling, while the taller rewarded action is easier to read and
 * tap instead of hiding at the bottom of the card.
 */
export function superOfferActions(options: SuperOfferActionsOptions): ModalAction[] {
  return [
    {
      label: options.standardLabel,
      variant: 'primary',
      height: 92,
      onClick: options.restart,
    },
    {
      label: options.rewardedLabel,
      variant: 'soft',
      icon: 'video',
      height: 92,
      closeOnClick: false,
      loadingLabel: options.loadingLabel,
      onClick: async () => {
        const outcome = await options.ads.showRewarded(SUPER_PLACEMENT)
        if (outcome === 'rewarded') options.grant()
        options.restart()
      },
    },
  ]
}
