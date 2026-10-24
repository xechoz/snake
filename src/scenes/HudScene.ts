import { cssColor, getServices, Modal, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { PauseButton } from '../ui/PauseButton'
import type { GameScene } from './GameScene'

export interface GameOverInfo {
  score: number
  best: number
  newBest: boolean
  won: boolean
  reason: 'wall' | 'self' | 'win'
}

const SCORE_X = 148
const SCORE_LABEL_Y = 118
const SCORE_VALUE_Y = 196
const HINT_Y = 560
const PAUSE_X = 1232
const PAUSE_Y = 60
const PAUSE_SIZE = 64

export class HudScene extends Phaser.Scene {
  private scoreValue!: Phaser.GameObjects.Text
  private hint?: Phaser.GameObjects.Text
  private modal?: Modal
  private lastScore = -1

  constructor() {
    super('Hud')
  }

  create(): void {
    const services = getServices()
    const theme = services.theme
    const stats = this.gameScene().currentStats()

    this.add
      .text(
        SCORE_X,
        SCORE_LABEL_Y,
        services.i18n.t('hud.score'),
        textStyle(theme, 26, theme.textMuted),
      )
      .setOrigin(0.5)
    this.scoreValue = this.add
      .text(
        SCORE_X,
        SCORE_VALUE_Y,
        String(stats.score),
        textStyle(theme, 96, cssColor(theme.accent), true),
      )
      .setOrigin(0.5)

    this.hint = this.add
      .text(SCORE_X, HINT_Y, services.i18n.t('hud.hint'), {
        ...textStyle(theme, 26, theme.textMuted),
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: 260 },
      })
      .setOrigin(0.5)
      .setAlpha(0.65)

    new PauseButton(this, PAUSE_X, PAUSE_Y, theme, {
      size: PAUSE_SIZE,
      onClick: () => this.gameScene().pauseGame(),
    })

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

  dismissHint(): void {
    const hint = this.hint
    if (!hint?.visible) return
    this.tweens.killTweensOf(hint)
    this.tweens.add({
      targets: hint,
      alpha: 0,
      duration: 300,
      onComplete: () => hint.setVisible(false),
    })
  }

  showPause(): void {
    if (this.modal?.active) return
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

  showGameOver(info: GameOverInfo): void {
    if (this.modal?.active) return
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

  closeModal(): void {
    this.modal?.close()
    this.modal = undefined
  }

  private gameScene(): GameScene {
    return this.scene.get('Game') as GameScene
  }
}
