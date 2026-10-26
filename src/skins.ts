import type { Rng } from '@mg/core/rng'
import type { FruitKind } from './logic/types'

export type SnakeSkinId = 'orchard' | 'berry' | 'tropic' | 'dusk'

/** Three starting fruit colours in eating order, oldest (tail) → newest (head). */
export type SkinPalette = readonly [FruitKind, FruitKind, FruitKind]

export interface SnakeSkin {
  readonly id: SnakeSkinId
  readonly palette: SkinPalette
  readonly unlock: 'default' | 'rewarded'
}

/**
 * Curated skins keep the starting snake legible and stop two pastel fruits from
 * fighting each other. Lemon is never last: the last fruit is the head, and its
 * pale yellow makes the white eye nearly invisible.
 */
export const SNAKE_SKINS = [
  { id: 'orchard', palette: ['lemon', 'orange', 'apple'], unlock: 'default' },
  { id: 'berry', palette: ['grape', 'berry', 'apple'], unlock: 'default' },
  { id: 'tropic', palette: ['melon', 'lemon', 'orange'], unlock: 'default' },
  { id: 'dusk', palette: ['apple', 'orange', 'grape'], unlock: 'default' },
] as const satisfies readonly SnakeSkin[]

/** Head → tail colours for a fresh run: the last fruit eaten is the head. */
export function startingSegmentColors(palette: SkinPalette): readonly FruitKind[] {
  return [palette[2], palette[1], palette[0]]
}

export interface SkinChoice {
  readonly unlocked: readonly SnakeSkinId[]
  readonly active: SnakeSkinId | 'random'
  readonly last?: SnakeSkinId
}

export function selectableSkins(
  catalog: readonly SnakeSkin[],
  unlocked: readonly SnakeSkinId[],
): readonly SnakeSkin[] {
  return catalog.filter((skin) => skin.unlock === 'default' || unlocked.includes(skin.id))
}

/**
 * Resolves the saved choice to a concrete skin. A locked or unknown saved id
 * falls back to random, so a removed or not-yet-unlocked skin never blocks play.
 */
export function resolveSkin(rng: Rng, choice: SkinChoice): SnakeSkin {
  const pool = selectableSkins(SNAKE_SKINS, choice.unlocked)
  const active = pool.find((skin) => skin.id === choice.active)
  if (active) return active

  const candidates =
    pool.length > 1 && choice.last ? pool.filter((skin) => skin.id !== choice.last) : pool
  return rng.pick(candidates)
}
