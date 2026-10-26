import type { RewardedOutcome } from '@mg/core'
import { describe, expect, it, vi } from 'vitest'
import { superOfferActions } from './superOfferActions'

function build(outcome: RewardedOutcome) {
  const showRewarded = vi.fn(async () => outcome)
  const grant = vi.fn()
  const restart = vi.fn()
  const actions = superOfferActions({
    ads: { showRewarded },
    standardLabel: 'Play again',
    rewardedLabel: 'Watch ad',
    loadingLabel: 'Loading',
    grant,
    restart,
  })
  return { actions, showRewarded, grant, restart }
}

describe('superOfferActions', () => {
  it('keeps the standard-first compliance shape', () => {
    const { actions } = build('rewarded')

    expect(actions).toHaveLength(2)
    expect(actions[0]).toMatchObject({ variant: 'primary', height: 92 })
    expect(actions[1]).toMatchObject({
      variant: 'soft',
      icon: 'video',
      height: 92,
      closeOnClick: false,
      loadingLabel: 'Loading',
    })
  })

  it('grants before restarting when the ad completes', async () => {
    const { actions, showRewarded, grant, restart } = build('rewarded')

    await actions[1]?.onClick()

    expect(showRewarded).toHaveBeenCalledWith('superfruit')
    expect(grant).toHaveBeenCalledTimes(1)
    expect(restart).toHaveBeenCalledTimes(1)
    const [grantOrder = 0] = grant.mock.invocationCallOrder
    const [restartOrder = 0] = restart.mock.invocationCallOrder
    expect(grantOrder).toBeLessThan(restartOrder)
  })

  it.each(['skipped', 'failed'] as const)(
    'restarts without a reward when the ad is %s',
    async (outcome) => {
      const { actions, grant, restart } = build(outcome)

      await actions[1]?.onClick()

      expect(grant).not.toHaveBeenCalled()
      expect(restart).toHaveBeenCalledTimes(1)
    },
  )

  it('restarts from the standard action without an ad', () => {
    const { actions, showRewarded, grant, restart } = build('rewarded')

    actions[0]?.onClick()

    expect(showRewarded).not.toHaveBeenCalled()
    expect(grant).not.toHaveBeenCalled()
    expect(restart).toHaveBeenCalledTimes(1)
  })
})
