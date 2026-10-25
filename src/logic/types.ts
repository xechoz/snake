export interface Cell {
  x: number
  y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export const FRUIT_KINDS = ['apple', 'orange', 'lemon', 'grape', 'berry', 'melon'] as const

export type FruitKind = (typeof FRUIT_KINDS)[number]

export type PowerUpKind = 'ice' | 'chili'

export type EffectKind = 'slow' | 'fast'

export interface FoodItem {
  readonly cell: Cell
  readonly kind: FruitKind
}

export interface PowerUpItem {
  readonly cell: Cell
  readonly kind: PowerUpKind
  /** Ticks left on the board before the pickup disappears. */
  readonly ttl: number
}

export interface ActiveEffect {
  readonly kind: EffectKind
  /** Ticks left before the speed change wears off. */
  readonly remaining: number
}

export interface SnakeConfig {
  width: number
  height: number
  initialLength: number
  baseTickMs: number
  minTickMs: number
  speedUpEvery: number
  speedUpStep: number
  /** Fruit slots on the board. Ad rewards can raise this without changing the rules. */
  foodTarget: number
  fruitScore: Record<FruitKind, number>
  /** Relative spawn weight per fruit kind. */
  fruitWeight: Record<FruitKind, number>
  powerUpChance: number
  /** Fruits eaten without a pickup are capped here before one is guaranteed. */
  powerUpPity: number
  powerUpTtl: number
  effectTicks: Record<EffectKind, number>
  slowFactor: number
  fastFactor: number
  slowMaxTickMs: number
  fastMinTickMs: number
  fastScoreMultiplier: number
}

export type SnakeStatus = 'alive' | 'dead' | 'won'

export interface SnakeState {
  readonly config: SnakeConfig
  readonly snake: readonly Cell[]
  /** One entry per snake cell; the fruit that segment was born from, or null for the brand blue. */
  readonly segmentColors: readonly (FruitKind | null)[]
  readonly direction: Direction
  readonly queue: readonly Direction[]
  readonly foods: readonly FoodItem[]
  readonly powerUp: PowerUpItem | null
  readonly effect: ActiveEffect | null
  /** Fruits eaten since the last pickup spawned, used for the pity guarantee. */
  readonly powerUpDrought: number
  readonly score: number
  readonly status: SnakeStatus
  readonly deathReason: 'wall' | 'self' | null
}

export type SnakeEvent =
  | { type: 'eat'; at: Cell; kind: FruitKind; points: number; score: number }
  | { type: 'power'; at: Cell; kind: PowerUpKind; effect: EffectKind }
  | { type: 'powerExpired'; at: Cell }
  | { type: 'effectEnd'; effect: EffectKind }
  | { type: 'die'; reason: 'wall' | 'self' }
  | { type: 'win' }

export interface StepResult {
  state: SnakeState
  events: SnakeEvent[]
}
