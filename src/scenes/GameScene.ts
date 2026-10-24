import {
  cssColor,
  DebugOverlay,
  getServices,
  onAppHidden,
  onLayoutChange,
  randomSeed,
  readViewport,
  textStyle,
  type Viewport,
} from '@mg/core'
import { createRng, type Rng } from '@mg/core/rng'
import Phaser from 'phaser'
import { snakeConfig } from '../logic/config'
import { createInitialState, enqueueDirection, step, tickMs } from '../logic/state'
import type { Cell, Direction, SnakeState } from '../logic/types'
import { snakeSave } from '../save'
import { FloatingJoystick } from '../ui/FloatingJoystick'
import { computeSnakeLayout, type SnakeLayout } from '../ui/layout'
import type { GameOverInfo, HudScene } from './HudScene'

const COUNTDOWN_MS = 1800
const GAME_OVER_DELAY_MS = 700
const SNAKE_HEAD = 0x6ee7b7
const SNAKE_TAIL = 0x15803d
const FOOD = 0xf97362

const DIRECTION_VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export class GameScene extends Phaser.Scene {
  private state!: SnakeState
  private rng!: Rng
  private layout!: SnakeLayout
  private prevCells: Cell[] = []
  private elapsed = 0
  private paused = false
  private finished = false
  private countdownActive = false
  private countdownMs = 0
  private best = 0
  private newBest = false
  private boardGraphics!: Phaser.GameObjects.Graphics
  private snakeGraphics!: Phaser.GameObjects.Graphics
  private foodGraphics!: Phaser.GameObjects.Graphics
  private countdownText!: Phaser.GameObjects.Text
  private debugOverlay?: DebugOverlay
  private removeHiddenListener?: () => void
  private joystick!: FloatingJoystick

  constructor() {
    super('Game')
  }

  create(): void {
    const services = getServices()
    const theme = services.theme

    this.cameras.main.setBackgroundColor(theme.bg)
    this.layout = computeSnakeLayout(readViewport(this))

    this.boardGraphics = this.add.graphics().setDepth(0)
    this.drawBoard()

    this.snakeGraphics = this.add.graphics().setDepth(2)
    this.foodGraphics = this.add.graphics().setDepth(3)
    this.countdownText = this.add
      .text(0, 0, '', textStyle(theme, 120, cssColor(theme.accent), true))
      .setOrigin(0.5)
      .setDepth(12)
      .setAlpha(0)
    this.positionCountdown()

    this.joystick = new FloatingJoystick(this, theme, (direction) => this.inputDirection(direction))
    this.joystick.setBlockedRect(this.layout.hud)
    this.resetGame()
    this.bindInput()
    this.scene.launch('Hud')

    if (services.debug) this.debugOverlay = new DebugOverlay(this, theme)

    this.removeHiddenListener = onAppHidden(() => {
      if (this.isPlaying()) this.pauseGame()
    })

    onLayoutChange(this, (viewport) => this.handleLayout(viewport))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeHiddenListener?.()
    })
  }

  update(_time: number, delta: number): void {
    const frame = Math.min(delta, 250)
    this.debugOverlay?.update(
      frame,
      `score=${this.state.score} len=${this.state.snake.length} status=${this.state.status}`,
    )

    if (this.paused) {
      this.render(this.progress())
      return
    }

    if (this.countdownActive) {
      this.countdownMs -= frame
      if (this.countdownMs <= 0) {
        this.countdownActive = false
        this.countdownText.setText(getServices().i18n.t('go'))
        this.tweens.add({
          targets: this.countdownText,
          alpha: 0,
          duration: 350,
          onComplete: () => this.countdownText.setText(''),
        })
      } else {
        this.countdownText.setText(String(Math.ceil(this.countdownMs / 600)))
      }
      this.render(0)
      return
    }

    if (this.state.status !== 'alive') {
      this.render(1)
      return
    }

    this.elapsed += frame
    let guard = 0
    while (this.elapsed >= tickMs(this.state) && this.state.status === 'alive' && guard < 10) {
      this.elapsed -= tickMs(this.state)
      this.advance()
      guard += 1
    }

    if (this.state.status !== 'alive' && !this.finished) this.finish()
    this.render(this.progress())
  }

  currentStats(): { score: number } {
    return { score: this.state.score }
  }

  inputDirection(direction: Direction): void {
    if (this.paused || this.finished || this.state.status !== 'alive') return
    const next = enqueueDirection(this.state, direction)
    if (next === this.state) return
    this.state = next
    getServices().audio.play('turn')
  }

  pauseGame(): void {
    if (this.paused || this.finished || this.state.status !== 'alive') return
    const services = getServices()
    this.paused = true
    this.countdownActive = false
    this.countdownText.setAlpha(0)
    this.joystick.setEnabled(false)
    services.platform.gameplayStop()
    services.audio.play('pause')
    this.hud()?.showPause()
  }

  resumeGame(): void {
    const services = getServices()
    this.paused = false
    this.joystick.setEnabled(true)
    this.hud()?.closeModal()
    this.startCountdown()
    services.platform.gameplayStart()
  }

  togglePause(): void {
    if (this.paused) this.resumeGame()
    else this.pauseGame()
  }

  restartGame(): void {
    this.scene.stop('Hud')
    this.scene.restart()
  }

  goToMenu(): void {
    this.scene.stop('Hud')
    this.scene.start('Menu')
  }

  private handleLayout(viewport: Viewport): void {
    const next = computeSnakeLayout(viewport)
    if (layoutsEqual(next, this.layout)) return

    const rotated = next.orientation !== this.layout.orientation && this.isPlaying()
    this.layout = next
    this.drawBoard()
    this.positionCountdown()
    this.joystick.setBlockedRect(next.hud)

    if (rotated) this.pauseGame()
  }

  private resetGame(): void {
    const services = getServices()
    this.best = snakeSave(services).read().best
    this.newBest = false
    this.rng = createRng(randomSeed())
    this.state = createInitialState(snakeConfig, this.rng)
    this.prevCells = [...this.state.snake]
    this.elapsed = 0
    this.paused = false
    this.finished = false
    this.joystick.setEnabled(true)
    this.countdownText.setAlpha(1).setScale(1)
    this.startCountdown()
    services.platform.gameplayStart()
  }

  private startCountdown(): void {
    this.countdownActive = true
    this.countdownMs = COUNTDOWN_MS
    this.countdownText.setAlpha(1).setScale(1)
  }

  private advance(): void {
    const services = getServices()
    const oldCells = this.state.snake
    const result = step(this.state, this.rng)
    this.prevCells = result.state.snake.map((cell, index) => oldCells[index] ?? cell)
    this.state = result.state

    for (const event of result.events) {
      if (event.type === 'eat') {
        services.audio.play('eat')
        this.showEat(event.at, event.score)
      } else if (event.type === 'die') {
        services.audio.play('die')
        this.cameras.main.shake(200, 0.007)
        this.flash()
      } else if (event.type === 'win') {
        services.audio.play('start')
      }
    }
  }

  private finish(): void {
    const services = getServices()
    this.finished = true
    this.joystick.setEnabled(false)
    services.platform.gameplayStop()

    const save = snakeSave(services)
    const current = save.read()
    const isNewBest = this.newBest
    const best = Math.max(current.best, this.state.score)
    save.write({ best, plays: current.plays + 1 })
    this.best = best

    if (isNewBest) services.platform.happyTime()

    const info: GameOverInfo = {
      score: this.state.score,
      best,
      newBest: isNewBest,
      won: this.state.status === 'won',
      reason: this.state.status === 'won' ? 'win' : (this.state.deathReason ?? 'wall'),
    }
    this.time.delayedCall(GAME_OVER_DELAY_MS, () => {
      if (this.finished) this.hud()?.showGameOver(info)
    })
  }

  private progress(): number {
    if (this.state.status !== 'alive') return 1
    const interval = tickMs(this.state)
    return Math.min(1, this.elapsed / interval)
  }

  private render(progress: number): void {
    const services = getServices()
    const theme = services.theme
    const snake = this.state.snake
    const graphics = this.snakeGraphics
    const cell = this.layout.board.cell
    graphics.clear()

    for (let index = snake.length - 1; index >= 0; index--) {
      const current = snake[index]
      if (!current) continue
      const previous = this.prevCells[index] ?? current
      const x = this.cellCenterX(previous.x + (current.x - previous.x) * progress)
      const y = this.cellCenterY(previous.y + (current.y - previous.y) * progress)
      const t = snake.length === 1 ? 0 : index / (snake.length - 1)
      const color =
        index === 0 && this.state.status === 'dead'
          ? theme.danger
          : interpolateColor(SNAKE_HEAD, SNAKE_TAIL, t)
      const inset = index === 0 ? 1.5 : 2.5
      const radius = index === 0 ? 11 : 9
      graphics.fillStyle(color, 1)
      graphics.fillRoundedRect(
        x - cell / 2 + inset,
        y - cell / 2 + inset,
        cell - inset * 2,
        cell - inset * 2,
        radius,
      )
    }

    const head = snake[0]
    if (head) {
      const previous = this.prevCells[0] ?? head
      const hx = this.cellCenterX(previous.x + (head.x - previous.x) * progress)
      const hy = this.cellCenterY(previous.y + (head.y - previous.y) * progress)
      const direction = DIRECTION_VECTORS[this.state.direction]
      const perpendicular = { x: -direction.y, y: direction.x }
      graphics.fillStyle(0x07130f, 1)
      for (const side of [-1, 1]) {
        graphics.fillCircle(
          hx + direction.x * 6 + perpendicular.x * side * 6.5,
          hy + direction.y * 6 + perpendicular.y * side * 6.5,
          3.4,
        )
      }
    }

    const foodGraphics = this.foodGraphics
    foodGraphics.clear()
    if (this.state.food) {
      const cx = this.cellCenterX(this.state.food.x)
      const cy = this.cellCenterY(this.state.food.y)
      const pulse = Math.sin(this.time.now * 0.006) * 1.6
      const radius = cell * 0.3 + pulse
      foodGraphics.fillStyle(FOOD, 0.14)
      foodGraphics.fillCircle(cx, cy, radius * 1.75)
      foodGraphics.fillStyle(FOOD, 1)
      foodGraphics.fillCircle(cx, cy, radius)
      foodGraphics.fillStyle(0xffd166, 0.9)
      foodGraphics.fillCircle(cx - radius * 0.35, cy - radius * 0.35, radius * 0.22)
      foodGraphics.fillStyle(0x4ade80, 1)
      foodGraphics.fillEllipse(cx + 4, cy - radius - 3, 9, 5)
    }
  }

  private drawBoard(): void {
    const theme = getServices().theme
    const frame = this.boardGraphics
    const { x, y, width, cell } = this.layout.board
    frame.clear()

    frame.fillStyle(0x000000, 0.22)
    frame.fillRoundedRect(x - 4, y - 2, width + 8, width + 14, 22)
    frame.fillStyle(theme.board, 1)
    frame.fillRoundedRect(x - 10, y - 10, width + 20, width + 20, 20)
    frame.lineStyle(1, theme.panelStroke, 1)
    frame.strokeRoundedRect(x - 10, y - 10, width + 20, width + 20, 20)

    for (let row = 0; row < snakeConfig.height; row++) {
      for (let column = 0; column < snakeConfig.width; column++) {
        if ((column + row) % 2 === 0) {
          frame.fillStyle(theme.boardAlt, 0.45)
          frame.fillRect(x + column * cell, y + row * cell, cell, cell)
        }
      }
    }
  }

  private showEat(at: Cell, score: number): void {
    const theme = getServices().theme
    const x = this.cellCenterX(at.x)
    const y = this.cellCenterY(at.y)

    const label = this.add
      .text(
        x,
        y,
        `+${snakeConfig.scorePerFood}`,
        textStyle(theme, 28, cssColor(theme.accent), true),
      )
      .setOrigin(0.5)
      .setDepth(10)
    this.tweens.add({
      targets: label,
      y: y - 40,
      alpha: 0,
      duration: 520,
      ease: 'Quad.out',
      onComplete: () => label.destroy(),
    })

    for (let i = 0; i < 6; i++) {
      const particle = this.add.circle(x, y, 3.5, FOOD).setDepth(9)
      const angle = (Math.PI * 2 * i) / 6
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * Phaser.Math.Between(18, 38),
        y: y + Math.sin(angle) * Phaser.Math.Between(18, 38),
        alpha: 0,
        duration: 380,
        ease: 'Quad.out',
        onComplete: () => particle.destroy(),
      })
    }

    if (score > this.best) {
      this.best = score
      this.newBest = true
      const save = snakeSave(getServices())
      save.write({ ...save.read(), best: score })
    }
  }

  private flash(): void {
    const width = this.scale.width
    const height = this.scale.height
    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0xd9534f, 0.16)
      .setDepth(20)
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 320,
      onComplete: () => overlay.destroy(),
    })
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard
    const bind = (key: string, direction: Direction): void => {
      keyboard?.on(`keydown-${key}`, () => this.inputDirection(direction))
    }

    bind('UP', 'up')
    bind('W', 'up')
    bind('DOWN', 'down')
    bind('S', 'down')
    bind('LEFT', 'left')
    bind('A', 'left')
    bind('RIGHT', 'right')
    bind('D', 'right')

    keyboard?.on('keydown-P', () => this.togglePause())
    keyboard?.on('keydown-ESC', () => this.togglePause())
    keyboard?.on('keydown-SPACE', () => this.togglePause())
    keyboard?.on('keydown-ENTER', () => {
      if (this.finished) this.restartGame()
      else if (this.paused) this.resumeGame()
    })
    keyboard?.on('keydown-R', () => {
      if (this.finished) this.restartGame()
    })
  }

  private positionCountdown(): void {
    const { x, y, width } = this.layout.board
    this.countdownText.setPosition(x + width / 2, y + width / 2)
  }

  private cellCenterX(x: number): number {
    const { x: boardX, cell } = this.layout.board
    return boardX + (x + 0.5) * cell
  }

  private cellCenterY(y: number): number {
    const { y: boardY, cell } = this.layout.board
    return boardY + (y + 0.5) * cell
  }

  private hud(): HudScene | undefined {
    return this.scene.get('Hud') as HudScene | undefined
  }

  private isPlaying(): boolean {
    return !this.paused && !this.finished && this.state.status === 'alive'
  }
}

function layoutsEqual(a: SnakeLayout, b: SnakeLayout): boolean {
  return (
    a.orientation === b.orientation &&
    a.placement === b.placement &&
    a.board.x === b.board.x &&
    a.board.y === b.board.y &&
    a.board.width === b.board.width &&
    a.hud.x === b.hud.x &&
    a.hud.y === b.hud.y &&
    a.hud.width === b.hud.width &&
    a.hud.height === b.hud.height
  )
}

function interpolateColor(from: number, to: number, t: number): number {
  const start = Phaser.Display.Color.ValueToColor(from)
  const end = Phaser.Display.Color.ValueToColor(to)
  const color = Phaser.Display.Color.Interpolate.ColorWithColor(
    start,
    end,
    100,
    Math.round(t * 100),
  )
  return Phaser.Display.Color.GetColor(color.r, color.g, color.b)
}
