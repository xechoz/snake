import { getServices, mixColor } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import { MENU_DEMO_HEIGHT, MENU_DEMO_WIDTH } from './layout'
import { drawFruit, drawSnakeBody, drawSnakeHead, type SnakeSegment } from './snakeArt'

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
export function createMenuDemo(scene: Phaser.Scene): MenuDemo {
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
  let fruit: Cell | null = firstFood()
  let fruitIndex = 0
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
    const bodyPoints = densify(points)
    const segments: SnakeSegment[] = bodyPoints.map((point, index) => {
      const t = bodyPoints.length <= 1 ? 0 : index / (bodyPoints.length - 1)
      return {
        x: point.x,
        y: point.y,
        radius: CELL * (0.4 - t * 0.14),
        color: mixColor(snakeColors.art.snakeHead, snakeColors.art.snakeTail, t),
      }
    })
    drawSnakeBody(snake, segments, theme.ink, 3)

    const head = points[0]
    const next = points[1]
    if (head && next) {
      const cycle = scene.time.now % 2500
      const tongue = cycle < 220 ? Math.sin((cycle / 220) * Math.PI) : 0
      drawSnakeHead(
        snake,
        head.x,
        head.y,
        { x: head.x - next.x, y: head.y - next.y },
        CELL * 0.44,
        theme.ink,
        snakeColors.art.snakeHead,
        3,
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
        snakeColors.art.fruit[fruitIndex % snakeColors.art.fruit.length] ?? theme.accentWarm,
        theme,
        scene.time.now,
      )
    }
  }

  const burst = (cell: Cell): void => {
    const ring = scene.add.graphics()
    ring.lineStyle(3, theme.accentWarm, 0.95)
    ring.strokeCircle(0, 0, 13)
    ring.setPosition(cellX(cell.x), cellY(cell.y))
    container.add(ring)
    scene.tweens.add({
      targets: ring,
      scale: 2.4,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    })
  }

  const reset = (): void => {
    scene.tweens.add({
      targets: [snake, food],
      alpha: 0,
      duration: 160,
      onComplete: () => {
        cells = cloneCells(START)
        previous = cloneCells(START)
        fruit = firstFood()
        fruitIndex = 0
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
        if (targetFruit) burst(targetFruit)
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

interface Point {
  x: number
  y: number
}

/** Extra samples keep the tapered colour ramp from banding at cell spacing. */
function densify(points: readonly Point[], steps = 12): Point[] {
  if (points.length < 2) return points.map((point) => ({ ...point }))

  const dense: Point[] = []
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index]
    const to = points[index + 1]
    if (!from || !to) continue
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps
      dense.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      })
    }
  }
  const tail = points[points.length - 1]
  if (tail) dense.push({ ...tail })
  return dense
}

function firstFood(): Cell | null {
  const food = FOOD[0]
  return food ? { ...food } : null
}

function drawFrame(
  graphics: Phaser.GameObjects.Graphics,
  boardWidth: number,
  boardHeight: number,
): void {
  const theme = getServices().theme
  const outerWidth = boardWidth + (PADDING + 4) * 2
  const outerHeight = boardHeight + (PADDING + 4) * 2
  const left = -outerWidth / 2
  const top = -outerHeight / 2
  const radius = 26

  graphics.fillStyle(theme.shadow, 0.14)
  graphics.fillRoundedRect(left + 6, top + 10, outerWidth, outerHeight, radius)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillRoundedRect(left, top, outerWidth, outerHeight, radius)
  graphics.fillStyle(theme.surface, 1)
  graphics.fillRoundedRect(left + 4, top + 4, outerWidth - 8, outerHeight - 8, radius - 4)
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

  graphics.lineStyle(1, theme.borderSoft, 1)
  graphics.strokeRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight)
}
