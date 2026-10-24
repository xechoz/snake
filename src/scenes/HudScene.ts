import { createPanel, cssColor, getServices, Modal, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { hasTouchInput } from '../ui/device'
import { IconButton, type IconKind } from '../ui/IconButton'
import { VirtualJoystick } from '../ui/VirtualJoystick'
import type { GameScene } from './GameScene'

export interface GameOverInfo {
  score: number
  best: number
  newBest: boolean
  won: boolean
  reason: 'wall' | 'self' | 'win'
}

const PANEL_X = 720
const PANEL_Y = 24
const PANEL_WIDTH = 536
const PANEL_HEIGHT = 672
const CONTENT_X = PANEL_X + 36
const JOYSTICK_X = 988
const JOYSTICK_Y = 490

export class HudScene extends Phaser.Scene {
  private scoreValue!: Phaser.GameObjects.Text
  private bestValue!: Phaser.GameObjects.Text
  private speedValue!: Phaser.GameObjects.Text
  private soundButton!: IconButton
  private joystick?: VirtualJoystick
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

    createPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, theme)

    this.add
      .text(CONTENT_X, 60, services.i18n.t('hud.score'), textStyle(theme, 28, theme.textMuted))
      .setOrigin(0, 0)
    this.scoreValue = this.add
      .text(CONTENT_X, 150, String(stats.score), textStyle(theme, 88, cssColor(theme.accent), true))
      .setOrigin(0, 0.5)

    this.bestValue = this.add
      .text(CONTENT_X, 216, this.bestLabel(stats.best), textStyle(theme, 30, theme.text, true))
      .setOrigin(0, 0)
    this.speedValue = this.add
      .text(CONTENT_X, 264, this.speedLabel(stats.tickMs), textStyle(theme, 26, theme.textMuted))
      .setOrigin(0, 0)

    this.soundButton = new IconButton(this, 1054, 110, this.soundIcon(), theme, {
      size: 92,
      onClick: () => this.toggleSound(),
    })
    new IconButton(this, 1170, 110, 'pause', theme, {
      size: 92,
      onClick: () => this.gameScene().pauseGame(),
    })

    if (hasTouchInput()) {
      this.joystick = new VirtualJoystick(this, JOYSTICK_X, JOYSTICK_Y, theme, (direction) =>
        this.gameScene().inputDirection(direction),
      )
    } else {
      this.drawKeyLegend(JOYSTICK_X, JOYSTICK_Y)
    }

    this.lastScore = stats.score
    this.lastBest = stats.best
    this.lastSpeed = this.speedLabel(stats.tickMs)
  }

  update(): void {
    const stats = this.gameScene().currentStats()
    if (stats.score !== this.lastScore) {
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
    if (stats.best !== this.lastBest) {
      this.lastBest = stats.best
      this.bestValue.setText(this.bestLabel(stats.best))
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
    this.joystick?.reset()
    this.joystick?.setVisible(false)

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
    this.joystick?.reset()
    this.joystick?.setVisible(false)

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
    this.joystick?.setVisible(true)
  }

  private toggleSound(): void {
    const services = getServices()
    services.audio.play('click')
    services.setSound(!services.settings.value.sound)
    this.soundButton.setKind(this.soundIcon())
  }

  private soundIcon(): IconKind {
    return getServices().settings.value.sound ? 'soundOn' : 'soundOff'
  }

  private bestLabel(best: number): string {
    return `${getServices().i18n.t('hud.best')} ${best}`
  }

  private speedLabel(tick: number): string {
    const value = (1000 / tick).toFixed(1)
    return getServices().i18n.t('hud.speedValue', { value })
  }

  private drawKeyLegend(centerX: number, centerY: number): void {
    const theme = getServices().theme
    const keySize = 84
    const gap = 96
    const graphics = this.add.graphics()

    const key = (x: number, y: number, label: string): void => {
      graphics.fillStyle(theme.panel, 0.8)
      graphics.fillRoundedRect(x - keySize / 2, y - keySize / 2, keySize, keySize, 14)
      graphics.lineStyle(1, theme.panelStroke, 1)
      graphics.strokeRoundedRect(x - keySize / 2, y - keySize / 2, keySize, keySize, 14)
      this.add.text(x, y, label, textStyle(theme, 38, theme.text, true)).setOrigin(0.5)
    }

    key(centerX, centerY - gap, '↑')
    key(centerX - gap, centerY, '←')
    key(centerX + gap, centerY, '→')
    key(centerX, centerY + gap, '↓')
    this.add
      .text(centerX, centerY + gap + 88, 'WASD', textStyle(theme, 26, theme.textMuted))
      .setOrigin(0.5)
  }

  private gameScene(): GameScene {
    return this.scene.get('Game') as GameScene
  }
}
