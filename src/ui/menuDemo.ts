import { getServices, mixColor, randomSeed } from '@mg/core'
import { createRng } from '@mg/core/rng'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import {
  advanceMenuDemo,
  createMenuDemoState,
  MENU_DEMO_CELL,
  MENU_DEMO_COLS,
  MENU_DEMO_ROWS,
  steerMenuDemo,
} from '../logic/menuDemo'
import type { Cell, Direction, FoodItem, FruitKind } from '../logic/types'
import { segmentColor } from './gameArt'
import { MENU_DEMO_HEIGHT, MENU_DEMO_MAT, MENU_DEMO_WIDTH } from './layout'
import { drawBlockSnakeBody, drawFruit, drawSnakeHead, type SnakeBlock } from './snakeArt'

const AUTO_STEP_MS = 460
const MANUAL_STEP_MS = 360
const AUTO_MOVE_MS = 320
const MANUAL_MOVE_MS = 300
const RESET_PAUSE = 620

export interface MenuDemo {
  container: Phaser.GameObjects.Container
  width: number
  height: number
  /** Returns true only when the swipe queued a legal turn. */
  steer(direction: Direction): boolean
}

/**
 * A tiny playable board used as the menu's hero art. It runs a safe attract
 * loop until the player swipes, then follows the same rules as the real game.
 */
export function createMenuDemo(
  scene: Phaser.Scene,
  startingFruits: readonly FruitKind[] = [],
): MenuDemo {
  const theme = getServices().theme
  const boardWidth = MENU_DEMO_COLS * MENU_DEMO_CELL
  const boardHeight = MENU_DEMO_ROWS * MENU_DEMO_CELL
  const container = scene.add.container(0, 0)

  const frame = scene.add.graphics()
  drawFrame(frame, boardWidth, boardHeight)
  const snake = scene.add.graphics()
  const food = scene.add.graphics()
  container.add([frame, snake, food])

  const rng = createRng(randomSeed())
  let state = createMenuDemoState(rng, startingFruits)
  let previous: Cell[] = cloneCells(state.snake.snake)
  let progress = 1
  let travelFoods: readonly FoodItem[] | null = null
  let resetting = false
  let resetPending = false
  let timer: Phaser.Time.TimerEvent | null = null

  const redraw = (): void => {
    const cells = state.snake.snake
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
        color: segmentColor(state.snake.segmentColors[segmentIndex] ?? null, t, theme, false),
      }
    })
    drawBlockSnakeBody(snake, blocks, MENU_DEMO_CELL, theme.ink, 2.2)

    const head = points[0]
    const next = points[1]
    if (head && next) {
      const cycle = scene.time.now % 2500
      const tongue = cycle < 220 ? Math.sin((cycle / 220) * Math.PI) : 0
      const headKind = state.snake.segmentColors[0] ?? null
      drawSnakeHead(
        snake,
        head.x,
        head.y,
        { x: head.x - next.x, y: head.y - next.y },
        MENU_DEMO_CELL * 0.48,
        theme.ink,
        headKind ? snakeColors.art.fruits[headKind].light : snakeColors.art.snakeHead,
        3.2,
        { tongue },
      )
    }

    food.clear()
    const foods = travelFoods ?? state.snake.foods
    for (const item of foods) {
      drawFruit(
        food,
        cellX(item.cell.x),
        cellY(item.cell.y),
        MENU_DEMO_CELL * 0.27,
        item.kind,
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

  let traveling = false
  let steerPending = false

  const reset = (): void => {
    scene.tweens.add({
      targets: [snake, food],
      alpha: 0,
      duration: 160,
      onComplete: () => {
        state = createMenuDemoState(rng, startingFruits, state.round + 1)
        previous = cloneCells(state.snake.snake)
        progress = 1
        travelFoods = null
        resetPending = false
        redraw()
        scene.tweens.add({
          targets: [snake, food],
          alpha: 1,
          duration: 220,
          onComplete: () => {
            resetting = false
            schedule(AUTO_STEP_MS)
          },
        })
      },
    })
  }

  const queueReset = (): void => {
    if (resetPending) return
    resetPending = true
    resetting = true
    steerPending = false
    timer?.remove()
    timer = null
    scene.time.delayedCall(RESET_PAUSE, reset)
  }

  const schedule = (delay: number): void => {
    timer?.remove()
    timer = scene.time.addEvent({ delay, callback: step })
  }

  const step = (): void => {
    timer = null
    if (resetting) return

    const manual = state.mode === 'manual'
    previous = cloneCells(state.snake.snake)
    const foodsBefore = state.snake.foods
    const advanced = advanceMenuDemo(state, rng)
    state = advanced.state
    progress = 0
    travelFoods = foodsBefore
    traveling = true
    steerPending = false

    const travel = { t: 0 }
    scene.tweens.add({
      targets: travel,
      t: 1,
      duration: manual ? MANUAL_MOVE_MS : AUTO_MOVE_MS,
      ease: 'Sine.inOut',
      onUpdate: () => {
        progress = travel.t
      },
      onComplete: () => {
        progress = 1
        travelFoods = null
        traveling = false
        for (const event of advanced.events) {
          if (event.type === 'eat') burst(event.at, event.kind)
        }
        if (state.snake.status !== 'alive' || (state.mode === 'auto' && advanced.scriptDone)) {
          queueReset()
          return
        }
        // A swipe during the travel tween already chose the next direction;
        // step as soon as the current move lands instead of waiting a full beat.
        if (steerPending) {
          steerPending = false
          schedule(0)
          return
        }
        schedule(state.mode === 'manual' ? MANUAL_STEP_MS : AUTO_STEP_MS)
      },
    })
  }

  const steer = (direction: Direction): boolean => {
    if (resetting) return false
    const next = steerMenuDemo(state, direction)
    if (!next.accepted) return false
    state = next.state
    if (traveling) {
      steerPending = true
    } else {
      schedule(MANUAL_STEP_MS)
    }
    return true
  }

  redraw()
  schedule(AUTO_STEP_MS)
  scene.events.on('update', redraw)
  scene.events.once('shutdown', () => {
    timer?.remove()
    scene.events.off('update', redraw)
  })

  return { container, width: MENU_DEMO_WIDTH, height: MENU_DEMO_HEIGHT, steer }
}

function cellX(column: number): number {
  return -((MENU_DEMO_COLS - 1) * MENU_DEMO_CELL) / 2 + column * MENU_DEMO_CELL
}

function cellY(row: number): number {
  return -((MENU_DEMO_ROWS - 1) * MENU_DEMO_CELL) / 2 + row * MENU_DEMO_CELL
}

function cloneCells(cells: readonly Cell[]): Cell[] {
  return cells.map((cell) => ({ x: cell.x, y: cell.y }))
}

function drawFrame(
  graphics: Phaser.GameObjects.Graphics,
  boardWidth: number,
  boardHeight: number,
): void {
  const theme = getServices().theme
  const mat = MENU_DEMO_MAT
  const outerWidth = boardWidth + mat * 2
  const outerHeight = boardHeight + mat * 2
  const left = -outerWidth / 2
  const top = -outerHeight / 2
  const radius = 20

  graphics.fillStyle(theme.surface, 1)
  graphics.fillRoundedRect(left, top, outerWidth, outerHeight, radius)
  graphics.fillStyle(theme.board, 1)
  graphics.fillRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight)

  for (let row = 0; row < MENU_DEMO_ROWS; row += 1) {
    for (let column = 0; column < MENU_DEMO_COLS; column += 1) {
      if ((column + row) % 2 !== 0) continue
      graphics.fillStyle(theme.boardAlt, 0.72)
      graphics.fillRect(
        -boardWidth / 2 + column * MENU_DEMO_CELL,
        -boardHeight / 2 + row * MENU_DEMO_CELL,
        MENU_DEMO_CELL + 0.5,
        MENU_DEMO_CELL + 0.5,
      )
    }
  }

  // Same edge language as the real board.
  graphics.lineStyle(2, mixColor(theme.accentAlt, theme.highlight, 0.35), 0.7)
  graphics.strokeRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight)
}
