import {
  cssColor,
  displayTextStyle,
  getServices,
  Modal,
  onLayoutChange,
  readViewport,
  textStyle,
  type Viewport,
} from '@mg/core'
import Phaser from 'phaser'
import {
  computeSnakeLayout,
  inlineScorePositions,
  SCORE_LABEL_SIZE,
  SCORE_VALUE_SIZE,
  type SnakeLayout,
} from '../ui/layout'
import { PauseButton } from '../ui/PauseButton'
import type { GameScene } from './GameScene'

export interface GameOverInfo {
  score: number
  best: number
  newBest: boolean
  won: boolean
  reason: 'wall' | 'self' | 'win'
}

type ModalRequest = { kind: 'pause' } | { kind: 'over'; info: GameOverInfo }

export class HudScene extends Phaser.Scene {
  private layout!: SnakeLayout
  private scoreCard!: Phaser.GameObjects.Graphics
  private scoreLabel!: Phaser.GameObjects.Text
  private scoreValue!: Phaser.GameObjects.Text
  private pauseButton!: PauseButton
  private modal?: Modal
  private modalRequest?: ModalRequest
  private lastScore = -1

  constructor() {
    super('Hud')
  }

  create(): void {
    const services = getServices()
    const theme = services.theme
    const stats = this.gameScene().currentStats()
    this.layout = computeSnakeLayout(readViewport(this))

    this.scoreCard = this.add.graphics()
    this.scoreLabel = this.add
      .text(0, 0, services.i18n.t('hud.score'), textStyle(theme, SCORE_LABEL_SIZE, theme.textMuted))
      .setOrigin(0.5)
    this.scoreValue = this.add
      .text(
        0,
        0,
        String(stats.score),
        displayTextStyle(theme, SCORE_VALUE_SIZE, cssColor(theme.accent), true, 3, 4),
      )
      .setOrigin(0.5)

    this.pauseButton = new PauseButton(this, this.layout.pause.x, this.layout.pause.y, theme, {
      size: 64,
      onClick: () => this.gameScene().pauseGame(),
    })

    this.applyLayout()
    onLayoutChange(this, (viewport) => this.handleLayout(viewport))
    this.lastScore = stats.score
  }

  update(): void {
    const stats = this.gameScene().currentStats()
    if (stats.score === this.lastScore) return
    this.lastScore = stats.score
    this.scoreValue.setText(String(stats.score))
    this.positionScore()
    this.tweens.killTweensOf(this.scoreValue)
    this.scoreValue.setScale(1)
    this.tweens.add({
      targets: this.scoreValue,
      scale: 1.08,
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    })
  }

  showPause(): void {
    if (this.modal?.active) return
    this.modalRequest = { kind: 'pause' }
    this.buildPauseModal()
  }

  showGameOver(info: GameOverInfo): void {
    if (this.modal?.active) return
    this.modalRequest = { kind: 'over', info }
    this.buildGameOverModal(info)
    if (info.newBest || info.won) this.celebrate()
  }

  closeModal(): void {
    this.modal?.close()
    this.modal = undefined
    this.modalRequest = undefined
  }

  private handleLayout(viewport: Viewport): void {
    const next = computeSnakeLayout(viewport)
    if (layoutsEqual(next, this.layout)) return
    this.layout = next
    this.applyLayout()
    this.rebuildModal()
  }

  private applyLayout(): void {
    this.drawScoreCard()
    this.positionScore()
    this.pauseButton.setPosition(this.layout.pause.x, this.layout.pause.y)
  }

  private drawScoreCard(): void {
    const theme = getServices().theme
    const { scoreCard } = this.layout
    const radius = Math.min(theme.radiusLarge, scoreCard.height / 2)
    const graphics = this.scoreCard

    graphics.clear()
    graphics.fillStyle(theme.shadow, 0.16)
    graphics.fillRoundedRect(
      scoreCard.x + 2,
      scoreCard.y + 10,
      scoreCard.width,
      scoreCard.height,
      radius,
    )
    graphics.fillStyle(theme.ink, 1)
    graphics.fillRoundedRect(
      scoreCard.x - 4,
      scoreCard.y - 4,
      scoreCard.width + 8,
      scoreCard.height + 8,
      radius + 4,
    )
    graphics.fillStyle(theme.surface, 1)
    graphics.fillRoundedRect(scoreCard.x, scoreCard.y, scoreCard.width, scoreCard.height, radius)
    graphics.fillStyle(theme.accent, 0.14)
    graphics.fillRoundedRect(scoreCard.x + 12, scoreCard.y + 10, scoreCard.width - 24, 10, 5)

    graphics.fillStyle(theme.accent, 0.55)
    for (let index = 0; index < 3; index += 1) {
      graphics.fillCircle(scoreCard.x + scoreCard.width - 28 + index * 9, scoreCard.y + 26, 3)
    }
  }

  private positionScore(): void {
    const { score } = this.layout

    if (score.mode === 'stacked') {
      this.scoreLabel.setOrigin(0.5).setPosition(score.x, score.labelY)
      this.scoreValue.setOrigin(0.5).setPosition(score.x, score.valueY)
      return
    }

    const { labelX, valueX } = inlineScorePositions(
      score.x,
      this.scoreLabel.width,
      this.scoreValue.width,
    )
    this.scoreLabel.setOrigin(0.5).setPosition(labelX, score.y)
    this.scoreValue.setOrigin(0.5).setPosition(valueX, score.y)
  }

  private rebuildModal(): void {
    const request = this.modalRequest
    if (!request || !this.modal?.active) return
    this.modal.close()
    this.modal = undefined
    if (request.kind === 'pause') this.buildPauseModal()
    else this.buildGameOverModal(request.info)
  }

  private buildPauseModal(): void {
    const services = getServices()
    const game = this.gameScene()

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t('pause.title'),
      body: services.i18n.t('pause.body'),
      width: 640,
      height: 540,
      titleFontSize: 36,
      bodyFontSize: 30,
      actionsLayout: 'column',
      actionWidth: 480,
      actionHeight: 92,
      actionFontSize: 30,
      actions: [
        {
          label: services.i18n.t('pause.resume'),
          onClick: () => game.resumeGame(),
        },
        {
          label: services.i18n.t('pause.restart'),
          variant: 'soft',
          onClick: () => game.restartGame(),
        },
        {
          label: services.i18n.t('pause.menu'),
          variant: 'soft',
          onClick: () => game.goToMenu(),
        },
      ],
    })
  }

  private buildGameOverModal(info: GameOverInfo): void {
    const services = getServices()
    const game = this.gameScene()

    const reasonKey =
      info.reason === 'win' ? 'over.win' : info.reason === 'self' ? 'over.self' : 'over.wall'
    const body = [
      services.i18n.t('over.body', { best: info.best }),
      services.i18n.t(reasonKey),
      ...(info.newBest ? [services.i18n.t('over.newBest')] : []),
    ].join('\n')

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t(info.won ? 'over.winTitle' : 'over.title'),
      hero: String(info.score),
      body,
      width: 640,
      height: 560,
      titleFontSize: 36,
      heroFontSize: 72,
      bodyFontSize: 28,
      actionsLayout: 'column',
      actionWidth: 480,
      actionHeight: 92,
      actionFontSize: 30,
      actions: [
        {
          label: services.i18n.t('over.restart'),
          onClick: () => game.restartGame(),
        },
        {
          label: services.i18n.t('over.menu'),
          variant: 'soft',
          onClick: () => game.goToMenu(),
        },
      ],
    })
  }

  private celebrate(): void {
    const theme = getServices().theme
    const colors = [theme.accent, theme.accentAlt, theme.accentWarm, 0xffffff, 0xff5c8a]
    const width = this.scale.width
    for (let index = 0; index < 42; index += 1) {
      const piece = this.add
        .rectangle(
          Phaser.Math.Between(20, width - 20),
          Phaser.Math.Between(-80, -10),
          Phaser.Math.Between(7, 13),
          Phaser.Math.Between(10, 18),
          colors[index % colors.length] ?? theme.accent,
        )
        .setDepth(1100)
        .setAngle(Phaser.Math.Between(0, 360))
      this.tweens.add({
        targets: piece,
        y: this.scale.height + 40,
        angle: piece.angle + Phaser.Math.Between(180, 540),
        alpha: { from: 1, to: 0.2 },
        duration: Phaser.Math.Between(1400, 2600),
        delay: Phaser.Math.Between(0, 420),
        ease: 'Quad.in',
        onComplete: () => piece.destroy(),
      })
    }
  }

  private gameScene(): GameScene {
    return this.scene.get('Game') as GameScene
  }
}

function layoutsEqual(a: SnakeLayout, b: SnakeLayout): boolean {
  return (
    a.board.x === b.board.x &&
    a.board.y === b.board.y &&
    a.board.width === b.board.width &&
    a.hud.x === b.hud.x &&
    a.hud.y === b.hud.y &&
    a.hud.width === b.hud.width &&
    a.hud.height === b.hud.height
  )
}
