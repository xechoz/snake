import type { Theme } from '@mg/core'
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
      scene.tweens.add({ targets: this, scale: 1.04, duration: 90, ease: 'Quad.out' })
    })
    this.zone.on('pointerout', () => {
      this.hovered = false
      this.cancelPress()
    })
    this.zone.on('pointerupoutside', () => this.cancelPress())
    this.zone.on('pointerdown', () => {
      this.pressed = true
      scene.tweens.add({ targets: this, scale: 0.95, duration: 60, ease: 'Quad.out' })
    })
    this.zone.on('pointerup', () => {
      if (!this.pressed) return
      this.pressed = false
      scene.tweens.add({ targets: this, scale: this.hovered ? 1.04 : 1, duration: 90 })
      this.onClickHandler()
    })

    scene.add.existing(this)
  }

  private cancelPress(): void {
    if (!this.pressed) return
    this.pressed = false
    this.scene.tweens.add({ targets: this, scale: this.hovered ? 1.04 : 1, duration: 90 })
  }

  private redraw(): void {
    const radius = 16
    const half = this.buttonSize / 2
    this.background.clear()
    this.background.fillStyle(0x000000, 0.12)
    this.background.fillRoundedRect(-half + 2, -half + 3, this.buttonSize, this.buttonSize, radius)
    this.background.fillStyle(
      this.hovered ? this.theme.panelStroke : this.theme.panel,
      this.hovered ? 0.5 : 0.22,
    )
    this.background.fillRoundedRect(-half, -half, this.buttonSize, this.buttonSize, radius)
    this.background.lineStyle(1, this.theme.panelStroke, this.hovered ? 0.7 : 0.4)
    this.background.strokeRoundedRect(-half, -half, this.buttonSize, this.buttonSize, radius)

    const color = this.hovered
      ? this.theme.accent
      : Phaser.Display.Color.HexStringToColor(this.theme.text).color
    this.icon.clear()
    this.icon.fillStyle(color, this.hovered ? 1 : 0.8)
    this.icon.fillRoundedRect(-12, -14, 8, 28, 3)
    this.icon.fillRoundedRect(4, -14, 8, 28, 3)
  }
}
