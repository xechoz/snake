import { Button, cssColor, getServices, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { snakeSave } from '../save'
import { hasTouchInput } from '../ui/device'

export class MenuScene extends Phaser.Scene {
  private soundButton?: Button

  constructor() {
    super('Menu')
  }

  create(): void {
    const services = getServices()
    const { width, height } = this.cameras.main
    const theme = services.theme
    const best = snakeSave(services).read().best
    const centerX = width / 2

    services.platform.gameplayStop()

    this.cameras.main.setBackgroundColor(theme.bg)
    this.drawBackdrop(width, height)
    this.drawSnakeMotif()

    this.add
      .text(centerX, 150, services.i18n.t('game.title'), textStyle(theme, 104, theme.text, true))
      .setOrigin(0.5)

    this.add
      .text(centerX, 232, services.i18n.t('menu.subtitle'), textStyle(theme, 32, theme.textMuted))
      .setOrigin(0.5)

    const bestLabel = this.add
      .text(centerX, 300, services.i18n.t('menu.best', { score: best }), {
        ...textStyle(theme, 32, cssColor(theme.accent), true),
      })
      .setOrigin(0.5)
    const chipWidth = Math.max(220, bestLabel.width + 56)
    const chip = this.add.graphics()
    chip.fillStyle(theme.accent, 0.1)
    chip.fillRoundedRect(centerX - chipWidth / 2, 272, chipWidth, 56, 28)
    chip.lineStyle(1, theme.accent, 0.32)
    chip.strokeRoundedRect(centerX - chipWidth / 2, 272, chipWidth, 56, 28)
    bestLabel.setDepth(1)

    new Button(this, centerX, 410, services.i18n.t('menu.play'), theme, {
      width: 480,
      height: 96,
      fontSize: 32,
      onClick: () => this.startGame(),
    })

    this.soundButton = new Button(this, centerX - 127, 540, this.soundLabel(), theme, {
      width: 230,
      height: 92,
      variant: 'ghost',
      fontSize: 28,
      onClick: () => {
        services.audio.play('click')
        services.setSound(!services.settings.value.sound)
        this.soundButton?.setText(this.soundLabel())
      },
    })

    new Button(this, centerX + 127, 540, this.languageLabel(), theme, {
      width: 230,
      height: 92,
      variant: 'ghost',
      fontSize: 28,
      onClick: () => {
        services.audio.play('click')
        services.setLang(services.i18n.lang === 'zh' ? 'en' : 'zh')
        this.scene.restart()
      },
    })

    this.add
      .text(
        centerX,
        620,
        services.i18n.t(hasTouchInput() ? 'menu.controlsTouch' : 'menu.controlsDesktop'),
        textStyle(theme, 26, theme.textMuted),
      )
      .setOrigin(0.5)
    this.add
      .text(centerX, 656, services.i18n.t('menu.hint'), textStyle(theme, 26, theme.textMuted))
      .setOrigin(0.5)

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

  private drawBackdrop(width: number, height: number): void {
    const theme = getServices().theme
    const graphics = this.add.graphics()
    graphics.fillStyle(theme.accent, 0.045)
    graphics.fillCircle(1080, 120, 300)
    graphics.fillStyle(0x38bdf8, 0.035)
    graphics.fillCircle(1180, 620, 340)
    graphics.fillStyle(0x000000, 0.16)
    graphics.fillRect(0, 0, width, height)
  }

  private drawSnakeMotif(): void {
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

    const graphics = this.add.graphics()
    points.forEach(([x, y], index) => {
      const t = index / (points.length - 1)
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(theme.accentHover),
        Phaser.Display.Color.ValueToColor(0x15803d),
        100,
        Math.round(t * 100),
      )
      graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1)
      graphics.fillRoundedRect(x - 22, y - 22, 44, 44, 12)
    })
    graphics.setAlpha(0.12)

    const food = this.add.circle(1220, 520, 16, 0xf97362, 0.18)
    this.tweens.add({
      targets: food,
      scale: { from: 0.85, to: 1.15 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }
}
