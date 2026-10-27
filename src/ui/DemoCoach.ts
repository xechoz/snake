import type { Theme } from '@mg/core'
import Phaser from 'phaser'

const GLOVE_SWEEP = 86
const GLOVE_SWIPE_MS = 1100
const GLOVE_SIZE = 96

/**
 * A looping white-glove swipe guide on the menu demo. The glove drifts left
 * and right along a dashed path with arrowheads so the gesture reads as a
 * horizontal swipe. It lives inside the demo container so the board's scale
 * and tilt carry the gesture with it, and it stays visible for as long as the
 * demo is on screen.
 */
export class DemoCoach extends Phaser.GameObjects.Container {
  private readonly hand: Phaser.GameObjects.Container

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ) {
    super(scene, x, y)

    const path = scene.add.graphics()
    drawPath(path, theme)

    this.hand = scene.add.container(-GLOVE_SWEEP, 0)
    this.hand.add(scene.add.image(0, 0, 'hand-pointer').setDisplaySize(GLOVE_SIZE, GLOVE_SIZE))

    this.add([path, this.hand])
    this.setAlpha(0)
    parent.add(this)

    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 260,
      ease: 'Sine.out',
    })
    scene.tweens.add({
      targets: this.hand,
      x: GLOVE_SWEEP,
      duration: GLOVE_SWIPE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  override destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.hand)
    super.destroy(fromScene)
  }
}

/** A dashed horizontal path with an arrowhead at each end. */
function drawPath(graphics: Phaser.GameObjects.Graphics, theme: Theme): void {
  const start = -112
  const end = 112
  const dash = 16
  const gap = 12

  graphics.fillStyle(theme.accentInk, 0.2)
  for (let x = start; x < end; x += dash + gap) {
    const width = Math.min(dash, end - x)
    graphics.fillRoundedRect(x, -1.5, width, 3, 1.5)
  }

  graphics.fillTriangle(140, 0, 126, -7, 126, 7)
  graphics.fillTriangle(-140, 0, -126, -7, -126, 7)
}
