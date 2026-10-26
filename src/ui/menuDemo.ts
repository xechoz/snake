import { getServices, mixColor } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import type { FruitKind } from '../logic/types'
import type { SkinPalette } from '../skins'
import { segmentColor } from './gameArt'
import { MENU_DEMO_HEIGHT, MENU_DEMO_WIDTH } from './layout'
import { drawBlockSnakeBody, drawFruit, drawSnakeHead, type SnakeBlock } from './snakeArt'

const COLS = 6
const ROWS = 4
const CELL = 46
const PADDING = 14
const STEP_MS = 460
const MOVE_MS = 320
const RESET_PAUSE = 620

interface Cell {
  x: number
  y: number
}

type DemoDirection = 'right' | 'up' | 'left' | 'down'

const START: readonly Cell[] = [
  { x: 2, y: 2 },
  { x: 1, y: 2 },
  { x: 0, y: 2 },
]

const SCRIPT: readonly DemoDirection[] = [
  'right',
  'right',
  'up',
  'left',
  'left',
  'down',
  'down',
  'left',
]

const FOOD: readonly Cell[] = [
  { x: 4, y: 2 },
  { x: 2, y: 3 },
]

const FOOD_KINDS: readonly FruitKind[] = ['apple', 'melon']

const VECTORS: Record<DemoDirection, Cell> = {
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
}

export interface MenuDemo {
  container: Phaser.GameObjects.Container
  width: number
  height: number
}

/**
 * A tiny self-playing board used as the menu's hero art. It shows turning,
 * eating and growing instead of explaining them in two lines of copy.
 */
export function createMenuDemo(scene: Phaser.Scene, skin: SkinPalette | null = null): MenuDemo {
  const theme = getServices().theme
  const boardWidth = COLS * CELL
  const boardHeight = ROWS * CELL
  const container = scene.add.container(0, 0)

  const frame = scene.add.graphics()
  drawFrame(frame, boardWidth, boardHeight)
  const snake = scene.add.graphics()
  const food = scene.add.graphics()
  container.add([frame, snake, food])

  let cells: Cell[] = cloneCells(START)
  let previous: Cell[] = cloneCells(START)
  let segmentColors: (FruitKind | null)[] = cells.map(() => null)
  let fruit: Cell | null = firstFood()
  let fruitIndex = 0
  let demoRound = 0
  let stepIndex = 0
  let progress = 1
  let resetting = false

  const redraw = (): void => {
    const points = cells.map((cell, index) => {
      const from = previous[index] ?? cell
      return {
        x: cellX(from.x + (cell.x - from.x) * progress),
        y: cellY(from.y + (cell.y - from.y) * progress),
      }
    })

    snake.clear()
    // The head cell is drawn as a circle below. Leaving its square body tile in
    // the body pass would make the tile's ink corners poke out around the
    // circular head, reading as a second, squarish border.
    const blocks: SnakeBlock[] = points.slice(1).map((point, index) => {
      const segmentIndex = index + 1
      const t = points.length <= 1 ? 0 : segmentIndex / (points.length - 1)
      return {
        x: point.x,
        y: point.y,
        color: segmentColor(segmentColors[segmentIndex] ?? null, t, theme, false, skin),
      }
    })
    drawBlockSnakeBody(snake, blocks, CELL, theme.ink, 2.2)

    const head = points[0]
    const next = points[1]
    if (head && next) {
      const cycle = scene.time.now % 2500
      const tongue = cycle < 220 ? Math.sin((cycle / 220) * Math.PI) : 0
      const headKind = segmentColors[0] ?? null
      drawSnakeHead(
        snake,
        head.x,
        head.y,
        { x: head.x - next.x, y: head.y - next.y },
        CELL * 0.48,
        theme.ink,
        headKind
          ? snakeColors.art.fruits[headKind].light
          : skin
            ? snakeColors.art.fruits[skin[0]].light
            : snakeColors.art.snakeHead,
        3.2,
        { tongue },
      )
    }

    food.clear()
    if (fruit) {
      drawFruit(
        food,
        cellX(fruit.x),
        cellY(fruit.y),
        CELL * 0.27,
        fruitKindAt(fruitIndex + demoRound),
        theme,
        scene.time.now,
      )
    }
  }

  // A few flecks flying outward instead of a stroked ring: a ring around the
  // head reads as one more border, which is exactly what we are removing.
  const burst = (cell: Cell, kind: FruitKind): void => {
    const x = cellX(cell.x)
    const y = cellY(cell.y)
    const colors = [snakeColors.art.fruits[kind].body, theme.accentWarm, theme.surface]
    const count = 6

    for (let index = 0; index < count; index += 1) {
      const color = colors[index % colors.length] ?? theme.accentWarm
      const dot = scene.add.circle(x, y, 4, color)
      container.add(dot)
      const angle = (Math.PI * 2 * index) / count
      const distance = 24 + (index % 3) * 8
      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.4,
        duration: 420,
        ease: 'Quad.out',
        onComplete: () => dot.destroy(),
      })
    }
  }

  const reset = (): void => {
    scene.tweens.add({
      targets: [snake, food],
      alpha: 0,
      duration: 160,
      onComplete: () => {
        cells = cloneCells(START)
        previous = cloneCells(START)
        segmentColors = cells.map(() => null)
        fruit = firstFood()
        fruitIndex = 0
        demoRound += 1
        stepIndex = 0
        progress = 1
        redraw()
        scene.tweens.add({
          targets: [snake, food],
          alpha: 1,
          duration: 220,
          onComplete: () => {
            resetting = false
          },
        })
      },
    })
  }

  const step = (): void => {
    if (resetting) return
    const direction = SCRIPT[stepIndex]
    if (!direction) {
      resetting = true
      scene.time.delayedCall(RESET_PAUSE, reset)
      return
    }

    const head = cells[0]
    if (!head) return
    const vector = VECTORS[direction]
    const next = { x: head.x + vector.x, y: head.y + vector.y }
    const targetFruit = fruit
    const eating = targetFruit !== null && targetFruit.x === next.x && targetFruit.y === next.y

    previous = cloneCells(cells)
    cells = eating ? [next, ...cells] : [next, ...cells.slice(0, -1)]
    segmentColors = eating ? [fruitKindAt(fruitIndex + demoRound), ...segmentColors] : segmentColors
    stepIndex += 1
    progress = 0

    const travel = { t: 0 }
    scene.tweens.add({
      targets: travel,
      t: 1,
      duration: MOVE_MS,
      ease: 'Sine.inOut',
      onUpdate: () => {
        progress = travel.t
      },
      onComplete: () => {
        progress = 1
        if (!eating) return
        if (targetFruit) burst(targetFruit, fruitKindAt(fruitIndex + demoRound))
        fruitIndex += 1
        const nextFood = FOOD[fruitIndex]
        fruit = nextFood ? { ...nextFood } : null
      },
    })
  }

  redraw()
  const timer = scene.time.addEvent({ delay: STEP_MS, loop: true, callback: step })
  scene.events.on('update', redraw)
  scene.events.once('shutdown', () => {
    timer.remove()
    scene.events.off('update', redraw)
  })

  return { container, width: MENU_DEMO_WIDTH, height: MENU_DEMO_HEIGHT }
}

function cellX(column: number): number {
  return -((COLS - 1) * CELL) / 2 + column * CELL
}

function cellY(row: number): number {
  return -((ROWS - 1) * CELL) / 2 + row * CELL
}

function cloneCells(cells: readonly Cell[]): Cell[] {
  return cells.map((cell) => ({ x: cell.x, y: cell.y }))
}

function firstFood(): Cell | null {
  const food = FOOD[0]
  return food ? { ...food } : null
}

function fruitKindAt(index: number): FruitKind {
  return FOOD_KINDS[index % FOOD_KINDS.length] ?? 'apple'
}

function drawFrame(
  graphics: Phaser.GameObjects.Graphics,
  boardWidth: number,
  boardHeight: number,
): void {
  const theme = getServices().theme
  const mat = PADDING + 4
  const outerWidth = boardWidth + mat * 2
  const outerHeight = boardHeight + mat * 2
  const left = -outerWidth / 2
  const top = -outerHeight / 2
  const radius = 20

  graphics.fillStyle(theme.surface, 1)
  graphics.fillRoundedRect(left, top, outerWidth, outerHeight, radius)
  graphics.fillStyle(theme.board, 1)
  graphics.fillRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight)

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      if ((column + row) % 2 !== 0) continue
      graphics.fillStyle(theme.boardAlt, 0.72)
      graphics.fillRect(
        -boardWidth / 2 + column * CELL,
        -boardHeight / 2 + row * CELL,
        CELL + 0.5,
        CELL + 0.5,
      )
    }
  }

  // Same edge language as the real board.
  graphics.lineStyle(2, mixColor(theme.accentAlt, theme.highlight, 0.35), 0.7)
  graphics.strokeRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight)
}
