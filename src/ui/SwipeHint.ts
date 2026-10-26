import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'

const HEIGHT = 64
const PADDING_X = 18
const ICON_WIDTH = 56
const GAP = 12
const FONT_SIZE = 28
const HAND_TRAVEL = 11
const DEPTH = 7

/**
 * One-shot first-run hint. A fingertip slides along a short track so the
 * "swipe, then lift" gesture is clear without adding permanent board chrome.
 */
export class SwipeHint extends Phaser.GameObjects.Container {
  private readonly hand: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, theme: Theme, label: string) {
    super(scene, 0, 0)

    const text = new Phaser.GameObjects.Text(
      scene,
      0,
      0,
      label,
      textStyle(theme, FONT_SIZE, theme.text),
    ).setOrigin(0.5)
    const width = PADDING_X * 2 + ICON_WIDTH + GAP + text.width

    const background = new Phaser.GameObjects.Graphics(scene)
    background.fillStyle(theme.surface, 0.94)
    background.fillRoundedRect(-width / 2, -HEIGHT / 2, width, HEIGHT, HEIGHT / 2)
    background.lineStyle(1.5, theme.borderSoft, 1)
    background.strokeRoundedRect(-width / 2, -HEIGHT / 2, width, HEIGHT, HEIGHT / 2)

    const iconX = -width / 2 + PADDING_X + ICON_WIDTH / 2
    const track = new Phaser.GameObjects.Graphics(scene)
    track.lineStyle(2, theme.ink, 0.16)
    track.lineBetween(-22, 0, 22, 0)
    track.fillStyle(theme.ink, 0.22)
    track.fillTriangle(-24, 0, -18, -4, -18, 4)
    track.fillTriangle(24, 0, 18, -4, 18, 4)

    this.hand = new Phaser.GameObjects.Graphics(scene)
    this.hand.fillStyle(theme.accentInk, 1)
    this.hand.fillRoundedRect(-5, -16, 10, 24, 5)
    this.hand.fillCircle(0, 8, 6)
    this.hand.fillStyle(theme.highlight, 0.45)
    this.hand.fillCircle(-2, -10, 3)

    const icon = new Phaser.GameObjects.Container(scene, iconX, 0, [track, this.hand])
    text.setPosition(iconX + ICON_WIDTH / 2 + GAP + text.width / 2, 0)

    this.add([background, icon, text])
    this.setDepth(DEPTH).setVisible(false).setAlpha(0)
    scene.add.existing(this)
  }

  show(): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.hand)
    this.hand.setX(-HAND_TRAVEL)
    this.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 180 })
    this.scene.tweens.add({
      targets: this.hand,
      x: HAND_TRAVEL,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  hide(): void {
    if (!this.visible) return
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.hand)
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 140,
      onComplete: () => this.setVisible(false),
    })
  }

  override destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.hand)
    super.destroy(fromScene)
  }
}
