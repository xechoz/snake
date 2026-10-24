import {
  DebugOverlay,
  displayTextStyle,
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
import { drawBackdrop } from '../ui/backdrop'
import { FloatingJoystick } from '../ui/FloatingJoystick'
import {
  cellCenterX,
  cellCenterY,
  drawBoardFrame,
  drawCountdownBadge,
  drawSnakeAndFood,
  fruitColorAt,
} from '../ui/gameArt'
import { computeSnakeLayout, type SnakeLayout } from '../ui/layout'
import type { GameOverInfo, HudScene } from './HudScene'

const COUNTDOWN_MS = 1800
const GAME_OVER_DELAY_MS = 700

export class GameScene extends Phaser.Scene {
  private state!: SnakeState
  private rng!: Rng
  private viewport!: Viewport
  private layout!: SnakeLayout
  private prevCells: Cell[] = []
  private elapsed = 0
  private paused = false
  private finished = false
  private countdownActive = false
  private countdownMs = 0
  private best = 0
  private newBest = false
  private backdropGraphics!: Phaser.GameObjects.Graphics
  private boardGraphics!: Phaser.GameObjects.Graphics
  private snakeGraphics!: Phaser.GameObjects.Graphics
  private foodGraphics!: Phaser.GameObjects.Graphics
  private countdownBadge!: Phaser.GameObjects.Graphics
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
    this.viewport = readViewport(this)
    this.layout = computeSnakeLayout(this.viewport)

    this.backdropGraphics = this.add.graphics().setDepth(-2)
    this.drawBackdrop()

    this.boardGraphics = this.add.graphics().setDepth(0)
    this.drawBoard()

    this.snakeGraphics = this.add.graphics().setDepth(2)
    this.foodGraphics = this.add.graphics().setDepth(3)

    this.countdownBadge = this.add.graphics().setDepth(11).setAlpha(0)
    this.countdownText = this.add
      .text(0, 0, '', displayTextStyle(theme, 96, theme.text, true, 0, 5))
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
      const previous = Math.ceil(this.countdownMs / 600)
      this.countdownMs -= frame
      if (this.countdownMs <= 0) {
        this.countdownActive = false
        // The two-character "开始" needs a smaller face than a single digit.
        this.countdownText.setFontSize(56)
        this.countdownText.setText(getServices().i18n.t('go'))
        this.popCountdown()
        this.tweens.add({
          targets: [this.countdownText, this.countdownBadge],
          alpha: 0,
          duration: 320,
          delay: 180,
          onComplete: () => this.countdownText.setText(''),
        })
      } else {
        const current = Math.ceil(this.countdownMs / 600)
        if (current !== previous) this.popCountdown()
        this.countdownText.setText(String(current))
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
    this.tweens.killTweensOf([this.countdownText, this.countdownBadge])
    this.countdownText.setAlpha(0)
    this.countdownBadge.setAlpha(0)
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
    this.viewport = viewport
    this.drawBackdrop()
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
    this.startCountdown()
    services.platform.gameplayStart()
  }

  private startCountdown(): void {
    this.tweens.killTweensOf([this.countdownText, this.countdownBadge])
    this.countdownActive = true
    this.countdownMs = COUNTDOWN_MS
    this.countdownText.setFontSize(96)
    this.countdownText.setText(String(Math.ceil(this.countdownMs / 600)))
    this.countdownText.setAlpha(1).setScale(1)
    this.countdownBadge.setAlpha(1)
    this.popCountdown()
  }

  private popCountdown(): void {
    this.tweens.killTweensOf(this.countdownText)
    this.countdownText.setScale(0.72)
    this.tweens.add({
      targets: this.countdownText,
      scale: 1,
      duration: 220,
      ease: 'Back.out',
    })
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
        this.cameras.main.shake(220, 0.008)
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

    const won = this.state.status === 'won'
    const save = snakeSave(services)
    const current = save.read()
    const isNewBest = this.newBest
    const best = Math.max(current.best, this.state.score)
    save.write({ best, plays: current.plays + 1 })
    this.best = best

    if (isNewBest || won) services.platform.happyTime()

    const info: GameOverInfo = {
      score: this.state.score,
      best,
      newBest: isNewBest,
      won,
      reason: won ? 'win' : (this.state.deathReason ?? 'wall'),
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
    drawSnakeAndFood(
      this.snakeGraphics,
      this.foodGraphics,
      this.state,
      this.prevCells,
      this.layout.board,
      progress,
      this.time.now,
      getServices().theme,
    )
  }

  private drawBackdrop(): void {
    drawBackdrop(this.backdropGraphics, this.viewport, getServices().theme, {
      clouds: 2,
      confetti: false,
      hillAlpha: 0.8,
    })
  }

  private drawBoard(): void {
    drawBoardFrame(this.boardGraphics, this.layout.board, getServices().theme)
  }

  private showEat(at: Cell, score: number): void {
    const theme = getServices().theme
    const x = cellCenterX(this.layout.board, at.x)
    const y = cellCenterY(this.layout.board, at.y)
    const fruitColor = fruitColorAt(at)

    const badge = this.add.container(x, y).setDepth(10)
    const background = this.add.graphics()
    background.fillStyle(theme.shadow, 0.12)
    background.fillRoundedRect(-32, -16, 68, 40, 20)
    background.fillStyle(theme.surface, 1)
    background.fillRoundedRect(-34, -20, 68, 40, 20)
    background.lineStyle(1, theme.borderSoft, 1)
    background.strokeRoundedRect(-33.5, -19.5, 67, 39, 20)
    const label = this.add
      .text(0, 0, `+${snakeConfig.scorePerFood}`, textStyle(theme, 26, theme.text, true))
      .setOrigin(0.5)
    badge.add([background, label])
    this.tweens.add({
      targets: badge,
      y: y - 52,
      alpha: 0,
      duration: 620,
      ease: 'Quad.out',
      onComplete: () => badge.destroy(),
    })

    const colors = [fruitColor, theme.accent, theme.surface]
    for (let index = 0; index < 8; index += 1) {
      const particle = this.add
        .circle(x, y, 4, colors[index % colors.length] ?? fruitColor)
        .setDepth(9)
      const angle = (Math.PI * 2 * index) / 8
      const distance = Phaser.Math.Between(22, 48)
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.4,
        duration: 420,
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
    const theme = getServices().theme
    const width = this.scale.width
    const height = this.scale.height
    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, theme.danger, 0.18)
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
    const centerX = x + width / 2
    const centerY = y + width / 2
    this.countdownText.setPosition(centerX, centerY)
    drawCountdownBadge(this.countdownBadge, centerX, centerY, getServices().theme)
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
