import { Button, createPanel, cssColor, getServices, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { snakeSave } from '../save'

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

    services.platform.gameplayStop()

    this.cameras.main.setBackgroundColor(theme.bg)
    this.drawBackdrop(width, height)

    this.add
      .text(100, 150, services.i18n.t('game.title'), {
        ...textStyle(theme, 92, theme.text, true),
      })
      .setOrigin(0, 0.5)

    this.add
      .text(104, 216, services.i18n.t('menu.subtitle'), textStyle(theme, 20, theme.textMuted))
      .setOrigin(0, 0.5)

    this.add
      .text(104, 280, services.i18n.t('menu.best', { score: best }), {
        ...textStyle(theme, 22, cssColor(theme.accent)),
      })
      .setOrigin(0, 0.5)

    new Button(this, 300, 430, services.i18n.t('menu.play'), theme, {
      width: 300,
      height: 68,
      fontSize: 26,
      onClick: () => this.startGame(),
    })

    this.soundButton = new Button(this, 210, 530, this.soundLabel(), theme, {
      width: 190,
      height: 50,
      variant: 'ghost',
      fontSize: 18,
      onClick: () => {
        services.audio.play('click')
        services.setSound(!services.settings.value.sound)
        this.soundButton?.setText(this.soundLabel())
      },
    })

    new Button(this, 414, 530, this.languageLabel(), theme, {
      width: 190,
      height: 50,
      variant: 'ghost',
      fontSize: 18,
      onClick: () => {
        services.audio.play('click')
        services.setLang(services.i18n.lang === 'zh' ? 'en' : 'zh')
        this.scene.restart()
      },
    })

    this.add
      .text(104, 620, services.i18n.t('menu.controls'), textStyle(theme, 16, theme.textMuted))
      .setOrigin(0, 0.5)
    this.add
      .text(104, 650, services.i18n.t('menu.hint'), textStyle(theme, 16, theme.textMuted))
      .setOrigin(0, 0.5)

    this.drawSnakeArt()

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

  private drawSnakeArt(): void {
    const theme = getServices().theme
    createPanel(this, 760, 90, 440, 540, theme)

    const points = [
      [820, 180],
      [880, 180],
      [940, 180],
      [1000, 180],
      [1060, 180],
      [1060, 240],
      [1060, 300],
      [1000, 300],
      [940, 300],
      [880, 300],
      [880, 360],
      [880, 420],
      [940, 420],
      [1000, 420],
      [1060, 420],
      [1060, 480],
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

    const food = this.add.circle(1140, 520, 16, 0xf97362)
    this.tweens.add({
      targets: food,
      scale: { from: 0.85, to: 1.15 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })

    this.add.text(980, 590, '20 × 20', textStyle(theme, 16, theme.textMuted)).setOrigin(0.5)
  }
}
