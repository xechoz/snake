import type { SnakeConfig } from './types'

export const snakeConfig: SnakeConfig = {
  width: 20,
  height: 20,
  initialLength: 3,
  baseTickMs: 145,
  minTickMs: 70,
  speedUpEvery: 30,
  speedUpStep: 7,
  scorePerFood: 10,
}
