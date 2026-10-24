import { mixColor, type Theme } from '@mg/core'
import Phaser from 'phaser'

export interface PauseButtonOptions {
  size?: number
  onClick: () => void
}

export class PauseButton extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly buttonSize: number
  private readonly background: Phaser.GameObjects.Graphics
  private readonly icon: Phaser.GameObjects.Graphics
  private readonly zone: Phaser.GameObjects.Zone
  private readonly canHover: boolean
  private readonly onClickHandler: () => void
  private hovered = false
  private pressed = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    theme: Theme,
    options: PauseButtonOptions,
  ) {
    super(scene, x, y)
    this.theme = theme
    this.buttonSize = options.size ?? 64
    this.onClickHandler = options.onClick
    this.canHover = window.matchMedia('(hover: hover)').matches

    this.background = new Phaser.GameObjects.Graphics(scene)
    this.icon = new Phaser.GameObjects.Graphics(scene)
    const hitSize = Math.max(this.buttonSize, 96)
    this.zone = new Phaser.GameObjects.Zone(scene, 0, 0, hitSize, hitSize)
    this.zone.setInteractive({ useHandCursor: true })

    this.add([this.background, this.icon, this.zone])
    this.redraw()

    this.zone.on('pointerover', () => {
      if (!this.canHover) return
      this.hovered = true
      this.redraw()
      scene.tweens.add({ targets: this, scale: 1.05, duration: 90, ease: 'Quad.out' })
    })
    this.zone.on('pointerout', () => {
      this.hovered = false
      this.cancelPress()
      this.redraw()
      scene.tweens.add({ targets: this, scale: 1, duration: 90, ease: 'Quad.out' })
    })
    this.zone.on('pointerupoutside', () => this.cancelPress())
    this.zone.on('pointerdown', () => {
      this.pressed = true
      this.redraw()
      scene.tweens.add({ targets: this, scale: 0.95, duration: 60, ease: 'Quad.out' })
    })
    this.zone.on('pointerup', () => {
      if (!this.pressed) return
      this.pressed = false
      this.redraw()
      scene.tweens.add({ targets: this, scale: this.hovered ? 1.05 : 1, duration: 90 })
      this.onClickHandler()
    })

    scene.add.existing(this)
  }

  private cancelPress(): void {
    if (!this.pressed) return
    this.pressed = false
    this.redraw()
    this.scene.tweens.add({ targets: this, scale: this.hovered ? 1.05 : 1, duration: 90 })
  }

  private redraw(): void {
    const half = this.buttonSize / 2

    this.background.clear()
    this.background.fillStyle(this.theme.shadow, 0.12)
    this.background.fillCircle(0, 4, half)
    this.background.fillStyle(this.hovered ? this.theme.surfaceAlt : this.theme.surface, 1)
    this.background.fillCircle(0, 0, half)
    this.background.lineStyle(
      1,
      this.hovered ? mixColor(this.theme.borderSoft, this.theme.ink, 0.3) : this.theme.borderSoft,
      1,
    )
    this.background.strokeCircle(0, 0, half - 0.5)

    const offset = this.pressed ? 2 : 0
    this.icon.clear()
    this.icon.fillStyle(this.hovered ? this.theme.accentHover : this.theme.accent, 1)
    this.icon.fillRoundedRect(-13, -15 + offset, 9, 30, 4)
    this.icon.fillRoundedRect(4, -15 + offset, 9, 30, 4)
  }
}
