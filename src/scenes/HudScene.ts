import {
  cssColor,
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

    this.scoreLabel = this.add
      .text(0, 0, services.i18n.t('hud.score'), textStyle(theme, SCORE_LABEL_SIZE, theme.textMuted))
      .setOrigin(0.5)
    this.scoreValue = this.add
      .text(
        0,
        0,
        String(stats.score),
        textStyle(theme, SCORE_VALUE_SIZE, cssColor(theme.accent), true),
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
    this.tweens.killTweensOf(this.scoreValue)
    this.scoreValue.setScale(1)
    this.tweens.add({
      targets: this.scoreValue,
      scale: 1.08,
      duration: 100,
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
    const { score, pause } = this.layout
    this.scoreLabel.setPosition(score.x, score.labelY)
    this.scoreValue.setPosition(score.x, score.valueY)
    this.pauseButton.setPosition(pause.x, pause.y)
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
      height: 520,
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
          variant: 'ghost',
          onClick: () => game.restartGame(),
        },
        {
          label: services.i18n.t('pause.menu'),
          variant: 'ghost',
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
      height: 600,
      titleFontSize: 36,
      heroFontSize: 72,
      bodyFontSize: 30,
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
          variant: 'ghost',
          onClick: () => game.goToMenu(),
        },
      ],
    })
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
