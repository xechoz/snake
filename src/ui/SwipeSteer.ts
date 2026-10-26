import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import type { Direction } from '../logic/types'
import { resolveJoystickDirection } from './joystick'
import type { Rect } from './layout'

const DEAD_ZONE = 30
/** A second finger must travel this far from its own press point to take over. */
const TAKEOVER_DISTANCE = 44
const RIPPLE_RADIUS = 56
const RIPPLE_DURATION = 220
const DEPTH = 8

/**
 * Floating swipe input. A press leaves a short-lived touch ripple, not a
 * joystick: the snake's turn is the feedback, and a persistent ring would
 * imply holding a stick.
 */
export class SwipeSteer extends Phaser.GameObjects.Container {
  private readonly ripple: Phaser.GameObjects.Graphics
  private activePointerId: number | null = null
  private activeDownTime = 0
  private lastDirection: Direction | null = null
  private enabled = true
  private blockedRect: Rect | null = null
  private activeRect: Rect | null = null

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    private readonly onDirection: (direction: Direction) => void,
  ) {
    super(scene, 0, 0)

    this.ripple = new Phaser.GameObjects.Graphics(scene)
    this.ripple.lineStyle(2.5, theme.accentInk, 0.45)
    this.ripple.strokeCircle(0, 0, RIPPLE_RADIUS)

    this.add(this.ripple)
    this.setDepth(DEPTH).setVisible(false)

    scene.input.on('pointerdown', this.handleDown, this)
    scene.input.on('pointermove', this.handleMove, this)
    scene.input.on('pointerup', this.handleUp, this)
    scene.input.on('gameout', this.handleGameOut, this)
    scene.add.existing(this)
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) {
      this.reset()
      this.dismiss()
    }
  }

  /** Keeps the touch feedback from popping up under HUD controls. */
  setBlockedRect(rect: Rect | null): void {
    this.blockedRect = rect
  }

  /** Restricts new gestures to a region; null means the whole scene. */
  setActiveRect(rect: Rect | null): void {
    this.activeRect = rect
  }

  reset(): void {
    this.activePointerId = null
    this.lastDirection = null
  }

  override destroy(fromScene?: boolean): void {
    this.scene.input.off('pointerdown', this.handleDown, this)
    this.scene.input.off('pointermove', this.handleMove, this)
    this.scene.input.off('pointerup', this.handleUp, this)
    this.scene.input.off('gameout', this.handleGameOut, this)
    this.scene.tweens.killTweensOf(this.ripple)
    super.destroy(fromScene)
  }

  private handleDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.activePointerId !== null) return
    const point = this.pointAt(pointer.x, pointer.y)
    if (this.isBlocked(point) || !this.isActive(point)) return
    this.begin(pointer, point)
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || !pointer.isDown) return

    if (pointer.id === this.activePointerId) {
      this.applyMove(pointer)
      return
    }

    const down = this.pointAt(pointer.downX, pointer.downY)
    if (this.isBlocked(down) || !this.isActive(down)) return
    // A finger that was already down when the current one took over must not
    // steal the stick back mid-gesture; only a newer press can take over.
    if (this.activePointerId !== null && pointer.downTime <= this.activeDownTime) return

    const point = this.pointAt(pointer.x, pointer.y)
    if (Math.hypot(point.x - down.x, point.y - down.y) < TAKEOVER_DISTANCE) return
    this.begin(pointer, down)
    this.applyMove(pointer)
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return
    // Very fast flicks can end before any move crossed the dead zone. Resolve
    // once from the release point so the turn is never swallowed.
    if (this.lastDirection === null) {
      const point = this.pointAt(pointer.x, pointer.y)
      const next = resolveJoystickDirection(point.x - this.x, point.y - this.y, DEAD_ZONE, null)
      if (next) this.onDirection(next)
    }
    this.reset()
  }

  private begin(
    pointer: Phaser.Input.Pointer,
    point: { readonly x: number; readonly y: number },
  ): void {
    this.activePointerId = pointer.id
    this.activeDownTime = pointer.downTime
    this.lastDirection = null
    this.setPosition(point.x, point.y)
    this.scene.tweens.killTweensOf(this.ripple)
    this.ripple.setScale(0.72).setAlpha(0.65)
    this.setVisible(true)
    this.scene.tweens.add({
      targets: this.ripple,
      scale: 1.15,
      alpha: 0,
      duration: RIPPLE_DURATION,
      ease: 'Sine.out',
      onComplete: () => this.setVisible(false),
    })
  }

  private applyMove(pointer: Phaser.Input.Pointer): void {
    const point = this.pointAt(pointer.x, pointer.y)
    const next = resolveJoystickDirection(
      point.x - this.x,
      point.y - this.y,
      DEAD_ZONE,
      this.lastDirection,
    )
    if (next === this.lastDirection) return
    this.lastDirection = next
    if (next) this.onDirection(next)
  }

  private pointAt(x: number, y: number): { readonly x: number; readonly y: number } {
    const point = this.scene.cameras.main.getWorldPoint(x, y)
    return { x: point.x, y: point.y }
  }

  private handleGameOut(): void {
    if (this.activePointerId === null) return
    this.reset()
    this.dismiss()
  }

  private dismiss(): void {
    this.scene.tweens.killTweensOf(this.ripple)
    this.setVisible(false)
  }

  private isBlocked(point: { readonly x: number; readonly y: number }): boolean {
    return this.contains(this.blockedRect, point)
  }

  private isActive(point: { readonly x: number; readonly y: number }): boolean {
    if (!this.activeRect) return true
    return this.contains(this.activeRect, point)
  }

  private contains(rect: Rect | null, point: { readonly x: number; readonly y: number }): boolean {
    if (!rect) return false
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    )
  }
}
