import type { Theme } from '@mg/core'
import Phaser from 'phaser'

/**
 * A looping vertical swipe ghost on the menu demo. It lives inside the demo
 * container so the board's scale and tilt carry the gesture with it.
 */
export class DemoCoach extends Phaser.GameObjects.Container {
  private readonly hand: Phaser.GameObjects.Graphics
  private shown = false

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ) {
    super(scene, x, y)

    const track = scene.add.graphics()
    track.lineStyle(4, theme.accentInk, 0.28)
    track.lineBetween(0, -34, 0, 34)
    drawArrow(track, theme.accentInk, 0.55, -42, -1)
    drawArrow(track, theme.accentInk, 0.55, 42, 1)

    this.hand = scene.add.graphics()
    this.hand.fillStyle(theme.accentInk, 0.92)
    this.hand.fillRoundedRect(-6, -18, 12, 26, 6)
    this.hand.fillCircle(0, 8, 7)
    this.hand.fillStyle(theme.highlight, 0.5)
    this.hand.fillCircle(-2, -12, 2.5)

    this.add([track, this.hand])
    this.setAlpha(0).setVisible(false)
    parent.add(this)
  }

  show(): void {
    if (this.shown) return
    this.shown = true
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.hand)
    this.hand.setY(-18)
    this.setVisible(true)
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 220,
      ease: 'Sine.out',
    })
    this.scene.tweens.add({
      targets: this.hand,
      y: 18,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  hide(): void {
    if (!this.shown) return
    this.shown = false
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.hand)
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 180,
      ease: 'Sine.in',
      onComplete: () => this.setVisible(false),
    })
  }

  isShown(): boolean {
    return this.shown
  }

  override destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.hand)
    super.destroy(fromScene)
  }
}

function drawArrow(
  graphics: Phaser.GameObjects.Graphics,
  color: number,
  alpha: number,
  y: number,
  direction: -1 | 1,
): void {
  graphics.fillStyle(color, alpha)
  const tip = y + direction * 6
  const base = y - direction * 4
  graphics.fillTriangle(0, tip, -6, base, 6, base)
}
