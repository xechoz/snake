export interface Cell {
  x: number
  y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface SnakeConfig {
  width: number
  height: number
  initialLength: number
  baseTickMs: number
  minTickMs: number
  speedUpEvery: number
  speedUpStep: number
  scorePerFood: number
}

export type SnakeStatus = 'alive' | 'dead' | 'won'

export interface SnakeState {
  readonly config: SnakeConfig
  readonly snake: readonly Cell[]
  readonly direction: Direction
  readonly queue: readonly Direction[]
  readonly food: Cell | null
  readonly score: number
  readonly status: SnakeStatus
  readonly deathReason: 'wall' | 'self' | null
}

export type SnakeEvent =
  | { type: 'eat'; at: Cell; score: number }
  | { type: 'die'; reason: 'wall' | 'self' }
  | { type: 'win' }

export interface StepResult {
  state: SnakeState
  events: SnakeEvent[]
}
