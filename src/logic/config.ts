import { FRUIT_KINDS, type FruitKind, type SnakeConfig } from './types'

export const snakeConfig: SnakeConfig = {
  width: 20,
  height: 20,
  initialLength: 3,
  baseTickMs: 145,
  minTickMs: 70,
  speedUpEvery: 30,
  speedUpStep: 7,
  foodTarget: 1,
  fruitScore: {
    apple: 10,
    orange: 10,
    lemon: 10,
    grape: 15,
    berry: 15,
    melon: 20,
  },
  fruitWeight: {
    apple: 3,
    orange: 3,
    lemon: 3,
    grape: 2,
    berry: 2,
    melon: 1,
  },
  powerUpChance: 0.35,
  powerUpPity: 5,
  powerUpTtl: 40,
  effectTicks: {
    slow: 24,
    fast: 36,
  },
  slowFactor: 1.5,
  fastFactor: 0.6,
  slowMaxTickMs: 240,
  fastMinTickMs: 58,
  fastScoreMultiplier: 2,
}

/**
 * Fruits worth at least 15 points. Rewarded ads can boost these weights
 * without changing the base config or having to know the fruit list.
 */
export const highValueFruits: readonly FruitKind[] = FRUIT_KINDS.filter(
  (kind) => snakeConfig.fruitScore[kind] >= 15,
)
