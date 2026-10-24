import {
  Button,
  cssColor,
  getServices,
  onLayoutChange,
  readViewport,
  textStyle,
  type Viewport,
} from '@mg/core'
import Phaser from 'phaser'
import { snakeSave } from '../save'
import { hasTouchInput } from '../ui/device'
import { computeMenuLayout, type MenuLayout } from '../ui/layout'

export class MenuScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics
  private motif!: Phaser.GameObjects.Container
  private title!: Phaser.GameObjects.Text
  private subtitle!: Phaser.GameObjects.Text
  private bestLabel!: Phaser.GameObjects.Text
  private chip!: Phaser.GameObjects.Graphics
  private playButton!: Button
  private soundButton!: Button
  private languageButton!: Button
  private controls!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Text

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

    this.cameras.main.setBackgroundColor(theme.bg)
    this.backdrop = this.add.graphics()
    this.motif = this.add.container(0, 0)
    this.drawMotif()

    this.title = this.add
      .text(0, 0, services.i18n.t('game.title'), textStyle(theme, 104, theme.text, true))
      .setOrigin(0.5)

    this.subtitle = this.add
      .text(0, 0, services.i18n.t('menu.subtitle'), textStyle(theme, 32, theme.textMuted))
      .setOrigin(0.5)

    this.bestLabel = this.add
      .text(
        0,
        0,
        services.i18n.t('menu.best', { score: best }),
        textStyle(theme, 32, cssColor(theme.accent), true),
      )
      .setOrigin(0.5)
    this.chip = this.add.graphics()
    this.bestLabel.setDepth(1)

    this.playButton = new Button(this, 0, 0, services.i18n.t('menu.play'), theme, {
      width: initial.playWidth,
      height: 96,
      fontSize: 32,
      onClick: () => this.startGame(),
    })

    this.soundButton = new Button(this, 0, 0, this.soundLabel(), theme, {
      width: initial.secondaryWidth,
      height: 92,
      variant: 'ghost',
      fontSize: 28,
      onClick: () => {
        services.audio.play('click')
        services.setSound(!services.settings.value.sound)
        this.soundButton.setText(this.soundLabel())
      },
    })

    this.languageButton = new Button(this, 0, 0, this.languageLabel(), theme, {
      width: initial.secondaryWidth,
      height: 92,
      variant: 'ghost',
      fontSize: 28,
      onClick: () => {
        services.audio.play('click')
        services.setLang(services.i18n.lang === 'zh' ? 'en' : 'zh')
        this.scene.restart()
      },
    })

    this.controls = this.add
      .text(
        0,
        0,
        services.i18n.t(hasTouchInput() ? 'menu.controlsTouch' : 'menu.controlsDesktop'),
        textStyle(theme, 26, theme.textMuted),
      )
      .setOrigin(0.5)

    this.hint = this.add
      .text(0, 0, services.i18n.t('menu.hint'), textStyle(theme, 26, theme.textMuted))
      .setOrigin(0.5)

    this.applyLayout(viewport, initial)
    onLayoutChange(this, (next) => this.applyLayout(next, computeMenuLayout(next)))

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame())
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame())
  }

  private startGame(): void {
    const services = getServices()
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
    this.drawBackdrop(viewport)

    this.title.setPosition(layout.centerX, layout.titleY)
    this.subtitle.setPosition(layout.centerX, layout.subtitleY)
    this.bestLabel.setPosition(layout.centerX, layout.bestY)
    this.chip.clear()
    const chipWidth = Math.max(220, this.bestLabel.width + 56)
    this.chip.fillStyle(getServices().theme.accent, 0.1)
    this.chip.fillRoundedRect(layout.centerX - chipWidth / 2, layout.bestY - 28, chipWidth, 56, 28)
    this.chip.lineStyle(1, getServices().theme.accent, 0.32)
    this.chip.strokeRoundedRect(
      layout.centerX - chipWidth / 2,
      layout.bestY - 28,
      chipWidth,
      56,
      28,
    )

    this.playButton.setPosition(layout.centerX, layout.playY)
    this.soundButton.setPosition(layout.centerX - layout.secondaryWidth / 2 - 12, layout.secondaryY)
    this.languageButton.setPosition(
      layout.centerX + layout.secondaryWidth / 2 + 12,
      layout.secondaryY,
    )
    this.controls.setPosition(layout.centerX, layout.controlsY)
    this.hint.setPosition(layout.centerX, layout.hintY)

    this.motif.setPosition(layout.motif.x, layout.motif.y).setScale(layout.motif.scale)
  }

  private drawBackdrop(viewport: Viewport): void {
    const theme = getServices().theme
    const { width, height } = viewport

    this.backdrop.clear()
    this.backdrop.fillStyle(theme.accent, 0.045)
    this.backdrop.fillCircle(width - 200, 120, 300)
    this.backdrop.fillStyle(0x38bdf8, 0.035)
    this.backdrop.fillCircle(width - 100, height - 100, 340)
    this.backdrop.fillStyle(0x000000, 0.16)
    this.backdrop.fillRect(0, 0, width, height)
  }

  private drawMotif(): void {
    const theme = getServices().theme
    const points = [
      [900, 180],
      [960, 180],
      [1020, 180],
      [1080, 180],
      [1140, 180],
      [1140, 240],
      [1140, 300],
      [1080, 300],
      [1020, 300],
      [960, 300],
      [960, 360],
      [960, 420],
      [1020, 420],
      [1080, 420],
      [1140, 420],
      [1140, 480],
    ] as const

    const cells = new Phaser.GameObjects.Graphics(this)
    points.forEach(([x, y], index) => {
      const t = index / (points.length - 1)
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(theme.accentHover),
        Phaser.Display.Color.ValueToColor(0x15803d),
        100,
        Math.round(t * 100),
      )
      cells.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1)
      cells.fillRoundedRect(x - 900 - 22, y - 180 - 22, 44, 44, 12)
    })
    cells.setAlpha(0.12)

    const food = this.add.circle(40, 320, 16, 0xf97362, 0.18)
    this.tweens.add({
      targets: food,
      scale: { from: 0.85, to: 1.15 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })

    this.motif.add([cells, food])
  }
}
