import {
  Button,
  cssColor,
  displayTextStyle,
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
import { computeMenuLayout, type MenuLayout } from '../ui/layout'
import { createSnakeMascot } from '../ui/mascot'

const CONTROL_ICON_DESKTOP = 160
const CONTROL_ICON_TOUCH = 56

export class MenuScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics
  private mascot!: Phaser.GameObjects.Container
  private title!: Phaser.GameObjects.Text
  private titleAccent!: Phaser.GameObjects.Graphics
  private subtitle!: Phaser.GameObjects.Text
  private bestLabel!: Phaser.GameObjects.Text
  private bestChip!: Phaser.GameObjects.Graphics
  private bestStar!: Phaser.GameObjects.Graphics
  private playButton!: Button
  private soundButton!: Button
  private languageButton!: Button
  private controls!: Phaser.GameObjects.Text
  private controlsIcon!: Phaser.GameObjects.Graphics
  private hint!: Phaser.GameObjects.Text
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
    const initial = computeMenuLayout(viewport)

    services.platform.gameplayStop()
    this.touch = hasTouchInput()
    this.controlIconWidth = this.touch ? CONTROL_ICON_TOUCH : CONTROL_ICON_DESKTOP

    this.cameras.main.setBackgroundColor(theme.bg)
    this.backdrop = this.add.graphics()
    this.mascot = createSnakeMascot(this, theme)

    this.title = this.add
      .text(
        0,
        0,
        services.i18n.t('game.title'),
        displayTextStyle(theme, 104, cssColor(theme.accent), true, 7, 8),
      )
      .setOrigin(0.5)

    this.titleAccent = this.add.graphics()

    this.subtitle = this.add
      .text(0, 0, services.i18n.t('menu.subtitle'), textStyle(theme, 30, theme.textMuted))
      .setOrigin(0.5)

    this.bestChip = this.add.graphics()
    this.bestStar = this.add.graphics()
    this.bestLabel = this.add
      .text(
        0,
        0,
        services.i18n.t('menu.best', { score: best }),
        textStyle(theme, 28, theme.accentInk, true),
      )
      .setOrigin(0.5)

    this.playButton = new Button(this, 0, 0, services.i18n.t('menu.play'), theme, {
      width: initial.playWidth,
      height: 100,
      fontSize: 32,
      icon: 'play',
      onClick: () => this.startGame(),
    })

    this.soundButton = new Button(this, 0, 0, this.soundLabel(), theme, {
      width: initial.secondaryWidth,
      height: 86,
      variant: 'soft',
      fontSize: 26,
      icon: services.settings.value.sound ? 'soundOn' : 'soundOff',
      onClick: () => {
        services.audio.play('click')
        services.setSound(!services.settings.value.sound)
        this.soundButton.setText(this.soundLabel())
        this.soundButton.setIcon(services.settings.value.sound ? 'soundOn' : 'soundOff')
      },
    })

    this.languageButton = new Button(this, 0, 0, this.languageLabel(), theme, {
      width: initial.secondaryWidth,
      height: 86,
      variant: 'soft',
      fontSize: 26,
      icon: 'globe',
      onClick: () => {
        services.audio.play('click')
        services.setLang(services.i18n.lang === 'zh' ? 'en' : 'zh')
        this.scene.restart()
      },
    })

    this.controlsIcon = this.add.graphics()
    this.drawControlHint()

    this.controls = this.add
      .text(
        0,
        0,
        services.i18n.t(this.touch ? 'menu.controlsTouch' : 'menu.controlsDesktop'),
        textStyle(theme, 24, theme.textMuted),
      )
      .setOrigin(0.5)

    this.hint = this.add
      .text(0, 0, services.i18n.t('menu.hint'), textStyle(theme, 24, theme.textMuted))
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
    onLayoutChange(this, (next) => this.applyLayout(next, computeMenuLayout(next)))
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

  private soundLabel(): string {
    const services = getServices()
    return services.i18n.t(services.settings.value.sound ? 'core.soundOn' : 'core.soundOff')
  }

  private languageLabel(): string {
    const services = getServices()
    return `${services.i18n.t('menu.language')}: ${services.i18n.lang === 'zh' ? '中文' : 'EN'}`
  }

  private applyLayout(viewport: Viewport, layout: MenuLayout): void {
    const theme = getServices().theme
    drawBackdrop(this.backdrop, viewport, theme)

    this.title.setPosition(layout.centerX, layout.titleY)
    this.titleAccent.clear()
    this.titleAccent.fillStyle(theme.accent, 1)
    this.titleAccent.fillRoundedRect(layout.centerX - 58, layout.titleY + 64, 116, 11, 5.5)
    this.titleAccent.lineStyle(2, theme.ink, 1)
    this.titleAccent.strokeRoundedRect(layout.centerX - 58, layout.titleY + 64, 116, 11, 5.5)

    this.subtitle.setPosition(layout.centerX, layout.subtitleY)
    this.drawBestChip(layout)

    this.playButton.setPosition(layout.centerX, layout.playY)
    this.soundButton.setPosition(layout.centerX - layout.secondaryWidth / 2 - 12, layout.secondaryY)
    this.languageButton.setPosition(
      layout.centerX + layout.secondaryWidth / 2 + 12,
      layout.secondaryY,
    )

    const gap = 14
    const total = this.controlIconWidth + gap + this.controls.width
    const left = layout.centerX - total / 2
    this.controlsIcon.setPosition(left + this.controlIconWidth / 2, layout.controlsY)
    this.controls.setPosition(
      left + this.controlIconWidth + gap + this.controls.width / 2,
      layout.controlsY,
    )

    this.hint.setPosition(layout.centerX, layout.hintY)
    this.installHint?.setPosition(layout.centerX, layout.installHintY)
    this.installHint?.setWordWrapWidth(
      viewport.width - viewport.insets.left - viewport.insets.right - 48,
    )

    this.mascot
      .setPosition(layout.mascot.x, layout.mascot.y)
      .setScale(layout.mascot.scale)
      .setVisible(layout.mascot.visible)
  }

  private drawBestChip(layout: MenuLayout): void {
    const theme = getServices().theme
    const starSpace = 54
    const chipWidth = Math.max(220, starSpace + this.bestLabel.width + 30)
    const chipHeight = 58
    const left = layout.centerX - chipWidth / 2
    const top = layout.bestY - chipHeight / 2

    this.bestChip.clear()
    this.bestChip.fillStyle(theme.shadow, 0.14)
    this.bestChip.fillRoundedRect(left + 2, top + 7, chipWidth, chipHeight, chipHeight / 2)
    this.bestChip.fillStyle(theme.ink, 1)
    this.bestChip.fillRoundedRect(
      left - 3,
      top - 3,
      chipWidth + 6,
      chipHeight + 6,
      chipHeight / 2 + 3,
    )
    this.bestChip.fillStyle(theme.surface, 1)
    this.bestChip.fillRoundedRect(left, top, chipWidth, chipHeight, chipHeight / 2)

    this.bestStar.clear()
    this.bestStar.fillStyle(theme.accent, 1)
    this.bestStar.fillCircle(left + 32, layout.bestY, 18)
    this.bestStar.lineStyle(2.5, theme.ink, 1)
    this.bestStar.strokeCircle(left + 32, layout.bestY, 18)
    drawIcon(this.bestStar, 'star', 20, theme.surface, false)

    this.bestLabel.setPosition(left + starSpace + this.bestLabel.width / 2, layout.bestY)
  }

  private drawControlHint(): void {
    const theme = getServices().theme
    const graphics = this.controlsIcon
    graphics.clear()

    if (this.touch) {
      graphics.fillStyle(theme.surface, 0.8)
      graphics.fillCircle(0, 0, 26)
      graphics.lineStyle(3, theme.ink, 1)
      graphics.strokeCircle(0, 0, 26)
      graphics.fillStyle(theme.ink, 0.3)
      graphics.fillTriangle(0, -23, -4, -17, 4, -17)
      graphics.fillTriangle(0, 23, -4, 17, 4, 17)
      graphics.fillTriangle(-23, 0, -17, -4, -17, 4)
      graphics.fillTriangle(23, 0, 17, -4, 17, 4)
      graphics.fillStyle(theme.accent, 1)
      graphics.fillCircle(0, -4, 11)
      graphics.lineStyle(2, theme.ink, 1)
      graphics.strokeCircle(0, -4, 11)
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
      graphics.lineStyle(2.5, theme.ink, 1)
      graphics.strokeRoundedRect(x - size / 2, -size / 2, size, size, 8)
      graphics.fillStyle(theme.ink, 1)
      if (arrow === 'up') graphics.fillTriangle(x, -8, x - 7, 5, x + 7, 5)
      if (arrow === 'down') graphics.fillTriangle(x, 8, x - 7, -5, x + 7, -5)
      if (arrow === 'left') graphics.fillTriangle(x - 8, 0, x + 5, -7, x + 5, 7)
      if (arrow === 'right') graphics.fillTriangle(x + 8, 0, x - 5, -7, x - 5, 7)
    })
  }

  private playEntrance(): void {
    this.title.setAlpha(0).setScale(0.84)
    this.titleAccent.setAlpha(0)
    this.subtitle.setAlpha(0)
    this.bestChip.setAlpha(0)
    this.bestStar.setAlpha(0)
    this.bestLabel.setAlpha(0)
    this.playButton.setAlpha(0).setScale(0.9)
    this.soundButton.setAlpha(0).setScale(0.9)
    this.languageButton.setAlpha(0).setScale(0.9)
    this.controlsIcon.setAlpha(0)
    this.controls.setAlpha(0)
    this.hint.setAlpha(0)
    this.installHint?.setAlpha(0)
    this.mascot.setAlpha(0)

    this.tweens.add({
      targets: this.title,
      alpha: 1,
      scale: 1,
      duration: 520,
      ease: 'Back.out',
    })
    this.tweens.add({ targets: this.titleAccent, alpha: 1, duration: 360, delay: 120 })
    this.tweens.add({
      targets: [this.subtitle, this.bestChip, this.bestStar, this.bestLabel],
      alpha: 1,
      duration: 360,
      delay: 160,
    })
    this.tweens.add({
      targets: this.playButton,
      alpha: 1,
      scale: 1,
      duration: 380,
      delay: 220,
      ease: 'Back.out',
    })
    this.tweens.add({
      targets: [this.soundButton, this.languageButton],
      alpha: 1,
      scale: 1,
      duration: 380,
      delay: 300,
      ease: 'Back.out',
    })
    this.tweens.add({
      targets: [this.controlsIcon, this.controls, this.hint],
      alpha: 1,
      duration: 360,
      delay: 380,
    })
    this.tweens.add({ targets: this.mascot, alpha: 1, duration: 500, delay: 180 })
    if (this.installHint) {
      this.tweens.add({ targets: this.installHint, alpha: 1, duration: 360, delay: 440 })
    }
  }

  private shouldShowInstallHint(): boolean {
    if (isEmbedded()) return false
    if (this.scale.fullscreen.available) return false
    if (isStandalone()) return false
    return this.touch
  }
}
