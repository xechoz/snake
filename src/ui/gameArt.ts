import { mixColor, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import { snakeConfig } from '../logic/config'
import type { Cell, Direction, SnakeState } from '../logic/types'
import { drawFruit, drawSnakeBody, drawSnakeHead, type SnakeSegment } from './snakeArt'

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

export function drawSnakeAndFood(
  snakeGraphics: Phaser.GameObjects.Graphics,
  foodGraphics: Phaser.GameObjects.Graphics,
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

  const segments: SnakeSegment[] = points.map((point, index) => {
    const t = snake.length === 1 ? 0 : index / (snake.length - 1)
    const color = mixColor(snakeColors.art.snakeHead, snakeColors.art.snakeTail, t)
    return {
      x: point.x,
      y: point.y,
      radius: cell * (0.4 - t * 0.14),
      color: dead ? mixColor(color, theme.muted, 0.55) : color,
    }
  })

  snakeGraphics.clear()
  drawSnakeBody(snakeGraphics, segments, theme.ink, 3.2)

  const head = points[0]
  if (head) {
    const direction = DIRECTION_VECTORS[state.direction]
    const cycle = time % 2500
    const tongue = !dead && cycle < 240 ? Math.sin((cycle / 240) * Math.PI) : 0
    drawSnakeHead(
      snakeGraphics,
      head.x,
      head.y,
      direction,
      cell * 0.48,
      theme.ink,
      dead ? theme.danger : snakeColors.art.snakeHead,
      3.6,
      { dead, tongue },
    )
  }

  foodGraphics.clear()
  if (state.food) {
    drawFruit(
      foodGraphics,
      cellCenterX(board, state.food.x),
      cellCenterY(board, state.food.y),
      cell * 0.3,
      fruitColorAt(state.food),
      theme,
      time,
    )
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

export function fruitColorAt(cell: Cell): number {
  const index = Math.abs(cell.x * 7 + cell.y * 13) % snakeColors.art.fruit.length
  return snakeColors.art.fruit[index] ?? snakeColors.art.fruit[0]
}
