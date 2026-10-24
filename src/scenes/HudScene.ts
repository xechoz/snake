import { Button, createPanel, getServices, Modal, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { GameScene } from './GameScene'

export interface GameOverInfo {
  score: number
  best: number
  newBest: boolean
  won: boolean
  reason: 'wall' | 'self' | 'win'
}

export class HudScene extends Phaser.Scene {
  private scoreValue!: Phaser.GameObjects.Text
  private bestValue!: Phaser.GameObjects.Text
  private speedValue!: Phaser.GameObjects.Text
  private soundButton!: Button
  private modal?: Modal
  private lastScore = -1
  private lastBest = -1
  private lastSpeed = ''

  constructor() {
    super('Hud')
  }

  create(): void {
    const services = getServices()
    const theme = services.theme
    const stats = this.gameScene().currentStats()

    createPanel(this, 700, 60, 520, 600, theme)

    this.add
      .text(740, 92, services.i18n.t('game.title'), textStyle(theme, 32, theme.text, true))
      .setOrigin(0, 0)
    this.add
      .text(740, 134, services.i18n.t('menu.subtitle'), textStyle(theme, 14, theme.textMuted))
      .setOrigin(0, 0)

    const divider = this.add.graphics()
    divider.lineStyle(1, theme.panelStroke, 0.8)
    divider.lineBetween(740, 172, 1180, 172)

    this.add
      .text(740, 196, services.i18n.t('hud.score'), textStyle(theme, 16, theme.textMuted))
      .setOrigin(0, 0)
    this.scoreValue = this.add
      .text(740, 218, String(stats.score), textStyle(theme, 56, '#34d399', true))
      .setOrigin(0, 0)

    this.add
      .text(740, 310, services.i18n.t('hud.best'), textStyle(theme, 16, theme.textMuted))
      .setOrigin(0, 0)
    this.bestValue = this.add
      .text(740, 334, String(stats.best), textStyle(theme, 34, theme.text, true))
      .setOrigin(0, 0)

    this.add
      .text(740, 402, services.i18n.t('hud.speed'), textStyle(theme, 16, theme.textMuted))
      .setOrigin(0, 0)
    this.speedValue = this.add
      .text(740, 426, this.speedLabel(stats.tickMs), textStyle(theme, 26, theme.text, true))
      .setOrigin(0, 0)

    this.add
      .text(740, 486, services.i18n.t('hud.controls'), {
        ...textStyle(theme, 15, theme.textMuted),
        lineSpacing: 8,
      })
      .setOrigin(0, 0)

    this.soundButton = new Button(this, 850, 592, this.soundLabel(), theme, {
      width: 200,
      height: 50,
      variant: 'ghost',
      fontSize: 17,
      onClick: () => {
        const current = services.settings.value.sound
        services.audio.play('click')
        services.setSound(!current)
        this.soundButton.setText(this.soundLabel())
      },
    })

    new Button(this, 1085, 592, services.i18n.t('hud.pause'), theme, {
      width: 200,
      height: 50,
      variant: 'ghost',
      fontSize: 17,
      onClick: () => this.gameScene().pauseGame(),
    })

    this.lastScore = stats.score
    this.lastBest = stats.best
    this.lastSpeed = this.speedLabel(stats.tickMs)
  }

  update(): void {
    const stats = this.gameScene().currentStats()
    if (stats.score !== this.lastScore) {
      this.lastScore = stats.score
      this.scoreValue.setText(String(stats.score))
    }
    if (stats.best !== this.lastBest) {
      this.lastBest = stats.best
      this.bestValue.setText(String(stats.best))
    }
    const speed = this.speedLabel(stats.tickMs)
    if (speed !== this.lastSpeed) {
      this.lastSpeed = speed
      this.speedValue.setText(speed)
    }
  }

  showPause(): void {
    if (this.modal?.active) return
    const services = getServices()
    const game = this.gameScene()

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t('pause.title'),
      body: services.i18n.t('pause.body'),
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
      services.i18n.t('over.body', { score: info.score, best: info.best }),
      services.i18n.t(reasonKey),
      ...(info.newBest ? [services.i18n.t('over.newBest')] : []),
    ].join('\n')

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t(info.won ? 'over.winTitle' : 'over.title'),
      body,
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

  private speedLabel(tick: number): string {
    return `${(1000 / tick).toFixed(1)} /s`
  }

  private soundLabel(): string {
    const services = getServices()
    return services.i18n.t(services.settings.value.sound ? 'core.soundOn' : 'core.soundOff')
  }

  private gameScene(): GameScene {
    return this.scene.get('Game') as GameScene
  }
}
