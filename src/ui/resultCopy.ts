import type { I18n } from '@mg/core'

/** The only i18n capability the result copy needs, so it stays Phaser-free and testable. */
export type ResultStrings = Pick<I18n, 't'>

export interface ResultInfo {
  readonly score: number
  readonly best: number
  readonly newBest: boolean
  readonly won: boolean
  readonly reason: 'wall' | 'self' | 'win'
}

/**
 * The title owns the headline result. A record outranks the plain "game over"
 * so the honour lands in the biggest type on the card instead of a body line.
 */
export function resultTitle(strings: ResultStrings, info: ResultInfo): string {
  if (info.won) return strings.t('over.winTitle')
  if (info.newBest) return strings.t('over.newBest')
  return strings.t('over.title')
}

/**
 * One caption under the score: how the run ended plus the record it missed.
 * A new best is already the title and the hero number, so the caption stays
 * silent about it — except on a win, where the title is spent on the win.
 */
export function resultMeta(strings: ResultStrings, info: ResultInfo): string {
  const parts = info.won ? [] : [strings.t(info.reason === 'self' ? 'over.self' : 'over.wall')]
  if (info.won && info.newBest) parts.push(strings.t('over.newBest'))
  else if (!info.newBest && info.best > 0) parts.push(strings.t('over.best', { best: info.best }))
  return parts.join(' · ')
}
