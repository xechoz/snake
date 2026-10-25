import {
  Button,
  cssColor,
  drawIcon,
  getServices,
  isEmbedded,
  isStandalone,
  maybeEnterFullscreen,
  onLayoutChange,
  readViewport,
  textStyle,
  type Viewport,
} from '@mg/core'
import Phaser from 'phaser'
import { snakeSave } from '../save'
import { drawBackdrop } from '../ui/backdrop'
import { hasTouchInput } from '../ui/device'
import { computeMenuLayout, MENU_PLAY_HEIGHT, type MenuLayout } from '../ui/layout'
import { createSnakeLogo, type SnakeLogo } from '../ui/logo'
import { createMenuDemo, type MenuDemo } from '../ui/menuDemo'

const CONTROL_ICON_DESKTOP = 160
const CONTROL_ICON_TOUCH = 56
const BEST_BADGE = 42
const PLAY_GLOW_PADDING = 16
const PLAY_FONT_SIZE = 34
const SETTINGS_FONT_SIZE = 30

export class MenuScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics
  private logo!: SnakeLogo
  private bestLabel!: Phaser.GameObjects.Text
  private bestStar!: Phaser.GameObjects.Graphics
  private playGlow!: Phaser.GameObjects.Graphics
  private playButton!: Button
  private playWidth = 0
  private soundButton!: Button
  private languageButton!: Button
  private demo!: MenuDemo
  private hint!: Phaser.GameObjects.Text
  private controlsIcon!: Phaser.GameObjects.Graphics
  private installHint?: Phaser.GameObjects.Text
  private touch = false
  private controlIconWidth = CONTROL_ICON_TOUCH

  constructor() {
    super('Menu')
  }

  create(): void {
    const services = getServices()
    const theme = services.theme
    const best = snakeSave(services).read().best
    const viewport = readViewport(this)
    this.touch = hasTouchInput()
    this.controlIconWidth = this.touch ? CONTROL_ICON_TOUCH : CONTROL_ICON_DESKTOP

    services.platform.gameplayStop()

    this.cameras.main.setBackgroundColor(theme.bg)
    this.backdrop = this.add.graphics()
    this.logo = createSnakeLogo(this)
    const initial = computeMenuLayout(viewport, this.logo.height)

    this.bestStar = this.add.graphics()
    this.bestLabel = this.add
      .text(
        0,
        0,
        services.i18n.t('menu.best', { score: best }),
        textStyle(theme, 26, cssColor(theme.accentInk), true),
      )
      .setOrigin(0.5)

    this.playGlow = this.add.graphics()
    this.playWidth = initial.playWidth
    this.playButton = new Button(this, 0, 0, services.i18n.t('menu.play'), theme, {
      width: initial.playWidth,
      height: MENU_PLAY_HEIGHT,
      fontSize: PLAY_FONT_SIZE,
      icon: 'play',
      onClick: () => this.startGame(),
    })

    this.soundButton = new Button(this, 0, 0, '', theme, {
      width: initial.settings.size,
      height: initial.settings.size,
      variant: 'ghost',
      fontSize: SETTINGS_FONT_SIZE,
      icon: services.settings.value.sound ? 'soundOn' : 'soundOff',
      onClick: () => {
        services.audio.play('click')
        services.setSound(!services.settings.value.sound)
        this.soundButton.setIcon(services.settings.value.sound ? 'soundOn' : 'soundOff')
      },
    })

    this.languageButton = new Button(this, 0, 0, '', theme, {
      width: initial.settings.size,
      height: initial.settings.size,
      variant: 'ghost',
      fontSize: SETTINGS_FONT_SIZE,
      icon: 'globe',
      onClick: () => {
        services.audio.play('click')
        services.setLang(services.i18n.lang === 'zh' ? 'en' : 'zh')
        this.scene.restart()
      },
    })

    this.demo = createMenuDemo(this)
    this.controlsIcon = this.add.graphics()
    this.drawControlHint()

    this.hint = this.add
      .text(
        0,
        0,
        services.i18n.t(this.touch ? 'menu.controlsTouch' : 'menu.controlsDesktop'),
        textStyle(theme, 26, theme.textMuted),
      )
      .setOrigin(0.5)

    if (this.shouldShowInstallHint()) {
      this.installHint = this.add
        .text(0, 0, services.i18n.t('menu.fullscreenHint'), {
          ...textStyle(theme, 22, theme.textMuted),
          align: 'center',
        })
        .setOrigin(0.5)
    }

    this.applyLayout(viewport, initial)
    onLayoutChange(this, (next) =>
      this.applyLayout(next, computeMenuLayout(next, this.logo.height)),
    )
    this.playEntrance()

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame())
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame())

    // If the Preload request did not land, the first menu tap retries it.
    if (!this.scale.fullscreen.active) {
      this.input.once('pointerup', () => maybeEnterFullscreen(this.scale))
    }
  }

  private startGame(): void {
    const services = getServices()
    maybeEnterFullscreen(this.scale)
    services.audio.unlock()
    services.audio.play('click')
    this.scene.start('Game')
  }

  private applyLayout(viewport: Viewport, layout: MenuLayout): void {
    const theme = getServices().theme
    drawBackdrop(this.backdrop, viewport, theme)

    const logoScale = Math.min(1, layout.logoMaxWidth / this.logo.width)
    this.logo.container.setPosition(layout.centerX, layout.logoY).setScale(logoScale)

    this.drawBest(layout)

    this.playButton.setPosition(layout.centerX, layout.playY)
    this.drawPlayGlow(layout)
    this.soundButton.setPosition(layout.settings.sound.x, layout.settings.sound.y)
    this.languageButton.setPosition(layout.settings.language.x, layout.settings.language.y)

    const gap = 14
    const total = this.controlIconWidth + gap + this.hint.width
    const left = layout.centerX - total / 2
    this.controlsIcon.setPosition(left + this.controlIconWidth / 2, layout.hintY)
    this.hint.setPosition(left + this.controlIconWidth + gap + this.hint.width / 2, layout.hintY)

    this.installHint?.setPosition(layout.centerX, layout.installHintY)
    this.installHint?.setWordWrapWidth(
      viewport.width - viewport.insets.left - viewport.insets.right - 48,
    )

    this.demo.container
      .setPosition(layout.demo.x, layout.demo.y)
      .setScale(layout.demo.scale)
      .setAngle(layout.demo.angle)
      .setVisible(layout.demo.visible)
  }

  private drawPlayGlow(layout: MenuLayout): void {
    const theme = getServices().theme
    const width = this.playWidth + PLAY_GLOW_PADDING * 2
    const height = MENU_PLAY_HEIGHT + PLAY_GLOW_PADDING * 2
    const radius = Math.min(theme.radius + PLAY_GLOW_PADDING, height / 2)
    const glow = this.playGlow
    glow.clear()
    glow.setPosition(layout.centerX, layout.playY)
    glow.fillStyle(theme.accent, 0.1)
    glow.fillRoundedRect(
      -width / 2 - PLAY_GLOW_PADDING / 2,
      -height / 2 - PLAY_GLOW_PADDING / 2,
      width + PLAY_GLOW_PADDING,
      height + PLAY_GLOW_PADDING,
      radius + PLAY_GLOW_PADDING / 2,
    )
    glow.fillStyle(theme.accent, 0.16)
    glow.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
  }

  private drawBest(layout: MenuLayout): void {
    const theme = getServices().theme
    const gap = 10
    const total = BEST_BADGE + gap + this.bestLabel.width
    const left = layout.centerX - total / 2

    this.bestStar.clear()
    this.bestStar.setPosition(left + BEST_BADGE / 2, layout.bestY)
    this.bestStar.fillStyle(theme.accent, 1)
    this.bestStar.fillCircle(0, 0, BEST_BADGE / 2)
    this.bestStar.lineStyle(2, theme.onAccent, 1)
    this.bestStar.strokeCircle(0, 0, BEST_BADGE / 2 - 1)
    drawIcon(this.bestStar, 'star', 20, theme.onAccent, false)

    this.bestLabel.setPosition(left + BEST_BADGE + gap + this.bestLabel.width / 2, layout.bestY)
  }

  private drawControlHint(): void {
    const theme = getServices().theme
    const graphics = this.controlsIcon
    graphics.clear()

    if (this.touch) {
      graphics.fillStyle(theme.surface, 0.8)
      graphics.fillCircle(0, 0, 26)
      graphics.lineStyle(1, theme.borderSoft, 1)
      graphics.strokeCircle(0, 0, 26)
      graphics.fillStyle(theme.ink, 0.3)
      graphics.fillTriangle(0, -23, -4, -17, 4, -17)
      graphics.fillTriangle(0, 23, -4, 17, 4, 17)
      graphics.fillTriangle(-23, 0, -17, -4, -17, 4)
      graphics.fillTriangle(23, 0, 17, -4, 17, 4)
      graphics.fillStyle(theme.accentInk, 1)
      graphics.fillCircle(0, -4, 11)
      graphics.fillStyle(theme.highlight, 0.5)
      graphics.fillCircle(-3, -8, 3.5)
      return
    }

    const size = 34
    const gap = 8
    const start = -(4 * size + 3 * gap) / 2 + size / 2
    const arrows = ['up', 'down', 'left', 'right'] as const
    arrows.forEach((arrow, index) => {
      const x = start + index * (size + gap)
      graphics.fillStyle(theme.surface, 0.9)
      graphics.fillRoundedRect(x - size / 2, -size / 2, size, size, 8)
      graphics.lineStyle(1, theme.borderSoft, 1)
      graphics.strokeRoundedRect(x - size / 2, -size / 2, size, size, 8)
      graphics.fillStyle(theme.ink, 0.78)
      if (arrow === 'up') graphics.fillTriangle(x, -8, x - 7, 5, x + 7, 5)
      if (arrow === 'down') graphics.fillTriangle(x, 8, x - 7, -5, x + 7, -5)
      if (arrow === 'left') graphics.fillTriangle(x - 8, 0, x + 5, -7, x + 5, 7)
      if (arrow === 'right') graphics.fillTriangle(x + 8, 0, x - 5, -7, x - 5, 7)
    })
  }

  private playEntrance(): void {
    this.logo.playEntrance()

    this.bestStar.setAlpha(0)
    this.bestLabel.setAlpha(0)
    this.playGlow.setAlpha(0).setScale(1)
    this.playButton.setAlpha(0).setScale(0.9)
    this.soundButton.setAlpha(0)
    this.languageButton.setAlpha(0)
    this.controlsIcon.setAlpha(0)
    this.hint.setAlpha(0)
    this.demo.container.setAlpha(0)
    this.installHint?.setAlpha(0)

    this.tweens.add({
      targets: [this.bestStar, this.bestLabel],
      alpha: 1,
      duration: 340,
      delay: 220,
    })
    this.tweens.add({
      targets: [this.soundButton, this.languageButton],
      alpha: 1,
      duration: 260,
      delay: 60,
      ease: 'Quad.out',
    })
    this.tweens.add({
      targets: this.playButton,
      alpha: 1,
      scale: 1,
      duration: 380,
      delay: 180,
      ease: 'Back.out',
    })
    this.tweens.add({
      targets: this.playGlow,
      alpha: 1,
      duration: 360,
      delay: 220,
      onComplete: () => this.startPlayGlowPulse(),
    })
    this.tweens.add({
      targets: [this.controlsIcon, this.hint],
      alpha: 1,
      duration: 340,
      delay: 320,
    })
    this.tweens.add({ targets: this.demo.container, alpha: 1, duration: 420, delay: 380 })
    if (this.installHint) {
      this.tweens.add({ targets: this.installHint, alpha: 1, duration: 340, delay: 460 })
    }
  }

  /** A slow breathing halo keeps the CTA alive without moving its hit area. */
  private startPlayGlowPulse(): void {
    this.tweens.add({
      targets: this.playGlow,
      alpha: 0.55,
      scale: 1.025,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  private shouldShowInstallHint(): boolean {
    if (isEmbedded()) return false
    if (this.scale.fullscreen.available) return false
    if (isStandalone()) return false
    return this.touch
  }
}
