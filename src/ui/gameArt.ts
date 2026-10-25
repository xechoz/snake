import { mixColor, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import { snakeConfig } from '../logic/config'
import type { Cell, Direction, FruitKind, SnakeState } from '../logic/types'
import {
  drawBlockSnakeBody,
  drawEffectRing,
  drawFruit,
  drawPowerUp,
  drawSnakeHead,
  type SnakeBlock,
} from './snakeArt'

export interface BoardMetrics {
  x: number
  y: number
  width: number
  cell: number
}

const DIRECTION_VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function drawBoardFrame(
  graphics: Phaser.GameObjects.Graphics,
  board: BoardMetrics,
  theme: Theme,
): void {
  const { x, y, width, cell } = board
  const radius = 30

  graphics.clear()
  graphics.fillStyle(theme.shadow, 0.16)
  graphics.fillRoundedRect(x - 10, y - 2, width + 20, width + 28, radius + 4)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillRoundedRect(x - 16, y - 16, width + 32, width + 32, radius)
  graphics.fillStyle(theme.surface, 1)
  graphics.fillRoundedRect(x - 10, y - 10, width + 20, width + 20, radius - 6)
  graphics.fillStyle(theme.board, 1)
  graphics.fillRect(x, y, width, width)

  for (let row = 0; row < snakeConfig.height; row++) {
    for (let column = 0; column < snakeConfig.width; column++) {
      if ((column + row) % 2 === 0) {
        graphics.fillStyle(theme.boardAlt, 0.7)
        graphics.fillRect(x + column * cell, y + row * cell, cell + 0.5, cell + 0.5)
      }
    }
  }

  graphics.lineStyle(2, mixColor(theme.accentAlt, theme.highlight, 0.35), 0.7)
  graphics.strokeRect(x, y, width, width)
}

export function drawBoardActors(
  snakeGraphics: Phaser.GameObjects.Graphics,
  foodGraphics: Phaser.GameObjects.Graphics,
  powerUpGraphics: Phaser.GameObjects.Graphics,
  state: SnakeState,
  prevCells: readonly Cell[],
  board: BoardMetrics,
  progress: number,
  time: number,
  theme: Theme,
): void {
  const snake = state.snake
  const cell = board.cell
  const dead = state.status === 'dead'
  const points = snake.map((current, index) => {
    const previous = prevCells[index] ?? current
    return {
      x: cellCenterX(board, previous.x + (current.x - previous.x) * progress),
      y: cellCenterY(board, previous.y + (current.y - previous.y) * progress),
    }
  })

  const blocks: SnakeBlock[] = points.map((point, index) => {
    const t = snake.length === 1 ? 0 : index / (snake.length - 1)
    return {
      x: point.x,
      y: point.y,
      color: segmentColor(state.segmentColors[index] ?? null, t, theme, dead),
    }
  })

  snakeGraphics.clear()
  drawBlockSnakeBody(snakeGraphics, blocks, cell, theme.ink, 2.2)

  const head = points[0]
  if (head) {
    const direction = DIRECTION_VECTORS[state.direction]
    const cycle = time % 2500
    const tongue = !dead && cycle < 240 ? Math.sin((cycle / 240) * Math.PI) : 0
    const headKind = state.segmentColors[0] ?? null
    const headColor = headKind ? snakeColors.art.fruits[headKind].light : snakeColors.art.snakeHead
    drawSnakeHead(
      snakeGraphics,
      head.x,
      head.y,
      direction,
      cell * 0.48,
      theme.ink,
      dead ? theme.danger : headColor,
      3.6,
      { dead, tongue },
    )

    if (state.effect) {
      const ratio = state.effect.remaining / state.config.effectTicks[state.effect.kind]
      drawEffectRing(snakeGraphics, head.x, head.y, cell * 0.72, state.effect.kind, ratio, theme)
      drawEffectFlair(snakeGraphics, head, direction, cell, state.effect.kind, time)
    }
  }

  foodGraphics.clear()
  for (const food of state.foods) {
    drawFruit(
      foodGraphics,
      cellCenterX(board, food.cell.x),
      cellCenterY(board, food.cell.y),
      cell * 0.3,
      food.kind,
      theme,
      time,
    )
  }

  powerUpGraphics.clear()
  const powerUp = state.powerUp
  if (powerUp) {
    const alpha = powerUp.ttl <= 10 ? 0.45 + 0.55 * Math.abs(Math.sin(time * 0.012)) : 1
    powerUpGraphics.setAlpha(alpha)
    drawPowerUp(
      powerUpGraphics,
      cellCenterX(board, powerUp.cell.x),
      cellCenterY(board, powerUp.cell.y),
      cell * 0.34,
      powerUp.kind,
      time,
    )
  } else {
    powerUpGraphics.setAlpha(1)
  }
}

export function drawCountdownBadge(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  theme: Theme,
): void {
  graphics.clear()
  graphics.fillStyle(theme.shadow, 0.16)
  graphics.fillCircle(centerX + 2, centerY + 8, 82)
  graphics.fillStyle(theme.surface, 1)
  graphics.fillCircle(centerX, centerY, 82)
  graphics.lineStyle(7, theme.accentInk, 1)
  graphics.strokeCircle(centerX, centerY, 71)
}

export function cellCenterX(board: BoardMetrics, x: number): number {
  return board.x + (x + 0.5) * board.cell
}

export function cellCenterY(board: BoardMetrics, y: number): number {
  return board.y + (y + 0.5) * board.cell
}

export function fruitColor(kind: FruitKind): number {
  return snakeColors.art.fruits[kind].body
}

export function segmentColor(
  kind: FruitKind | null,
  t: number,
  theme: Theme,
  dead: boolean,
): number {
  const color = kind
    ? mixColor(
        snakeColors.art.fruits[kind].light,
        snakeColors.art.fruits[kind].dark,
        Math.min(1, t * 1.15),
      )
    : mixColor(snakeColors.art.snakeHead, snakeColors.art.snakeTail, t)
  return dead ? mixColor(color, theme.muted, 0.55) : color
}

function drawEffectFlair(
  graphics: Phaser.GameObjects.Graphics,
  head: { x: number; y: number },
  direction: Cell,
  cell: number,
  effect: 'slow' | 'fast',
  time: number,
): void {
  if (effect === 'fast') {
    graphics.lineStyle(2, snakeColors.art.effects.fast, 0.5)
    for (let index = 0; index < 3; index += 1) {
      const side = (index - 1) * cell * 0.24
      const back = cell * (0.9 + index * 0.18)
      const startX = head.x - direction.x * back - direction.y * side
      const startY = head.y - direction.y * back + direction.x * side
      graphics.lineBetween(
        startX,
        startY,
        startX - direction.x * cell * 0.45,
        startY - direction.y * cell * 0.45,
      )
    }
    return
  }

  graphics.fillStyle(snakeColors.art.effects.slow, 0.55)
  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * 2 * index) / 4 + time * 0.001
    graphics.fillCircle(
      head.x + Math.cos(angle) * cell * 0.82,
      head.y + Math.sin(angle) * cell * 0.82,
      Math.max(1.5, cell * 0.055),
    )
  }
}
