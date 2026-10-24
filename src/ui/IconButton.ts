import type { Theme } from '@mg/core'
import Phaser from 'phaser'

export type IconKind = 'pause' | 'soundOn' | 'soundOff'

export interface IconButtonOptions {
  size?: number
  onClick: () => void
}

export class IconButton extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly buttonSize: number
  private readonly background: Phaser.GameObjects.Graphics
  private readonly icon: Phaser.GameObjects.Graphics
  private readonly zone: Phaser.GameObjects.Zone
  private readonly canHover: boolean
  private readonly onClickHandler: () => void
  private kind: IconKind
  private hovered = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: IconKind,
    theme: Theme,
    options: IconButtonOptions,
  ) {
    super(scene, x, y)
    this.theme = theme
    this.kind = kind
    this.buttonSize = options.size ?? 92
    this.onClickHandler = options.onClick
    this.canHover = window.matchMedia('(hover: hover)').matches

    this.background = new Phaser.GameObjects.Graphics(scene)
    this.icon = new Phaser.GameObjects.Graphics(scene)
    this.zone = new Phaser.GameObjects.Zone(scene, 0, 0, this.buttonSize, this.buttonSize)
    this.zone.setInteractive({ useHandCursor: true })

    this.add([this.background, this.icon, this.zone])
    this.redraw()

    if (this.canHover) {
      this.zone.on('pointerover', () => {
        this.hovered = true
        this.redraw()
        scene.tweens.add({ targets: this, scale: 1.04, duration: 90, ease: 'Quad.out' })
      })
      this.zone.on('pointerout', () => {
        this.hovered = false
        this.redraw()
        scene.tweens.add({ targets: this, scale: 1, duration: 90, ease: 'Quad.out' })
      })
    }
    this.zone.on('pointerdown', () => {
      scene.tweens.add({ targets: this, scale: 0.95, duration: 60, ease: 'Quad.out' })
    })
    this.zone.on('pointerup', () => {
      scene.tweens.add({ targets: this, scale: this.hovered ? 1.04 : 1, duration: 90 })
      this.onClickHandler()
    })

    scene.add.existing(this)
  }

  setKind(kind: IconKind): this {
    this.kind = kind
    this.redrawIcon()
    return this
  }

  private redraw(): void {
    const radius = 20
    const half = this.buttonSize / 2
    this.background.clear()
    this.background.fillStyle(0x000000, 0.2)
    this.background.fillRoundedRect(-half + 2, -half + 4, this.buttonSize, this.buttonSize, radius)
    this.background.fillStyle(
      this.hovered ? this.theme.panelStroke : this.theme.panel,
      this.hovered ? 0.7 : 1,
    )
    this.background.fillRoundedRect(-half, -half, this.buttonSize, this.buttonSize, radius)
    this.background.lineStyle(1, this.theme.panelStroke, 1)
    this.background.strokeRoundedRect(-half, -half, this.buttonSize, this.buttonSize, radius)
    this.redrawIcon()
  }

  private redrawIcon(): void {
    const color = this.hovered
      ? this.theme.accent
      : Phaser.Display.Color.HexStringToColor(this.theme.text).color
    const icon = this.icon
    icon.clear()
    icon.fillStyle(color, 1)
    icon.lineStyle(3, color, 1)

    if (this.kind === 'pause') {
      icon.fillRoundedRect(-13, -16, 8, 32, 3)
      icon.fillRoundedRect(5, -16, 8, 32, 3)
      return
    }

    icon.fillPoints(
      [
        new Phaser.Math.Vector2(-20, -7),
        new Phaser.Math.Vector2(-9, -7),
        new Phaser.Math.Vector2(4, -18),
        new Phaser.Math.Vector2(4, 18),
        new Phaser.Math.Vector2(-9, 7),
        new Phaser.Math.Vector2(-20, 7),
      ],
      true,
    )

    if (this.kind === 'soundOn') {
      icon.beginPath()
      icon.arc(6, 0, 13, -0.65, 0.65)
      icon.strokePath()
      icon.beginPath()
      icon.arc(6, 0, 21, -0.65, 0.65)
      icon.strokePath()
    } else {
      icon.lineBetween(7, -16, 24, 16)
      icon.lineBetween(24, -16, 7, 16)
    }
  }
}
