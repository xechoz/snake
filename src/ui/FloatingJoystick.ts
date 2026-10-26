import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import type { Direction } from '../logic/types'
import { resolveJoystickDirection } from './joystick'
import type { Rect } from './layout'

const BASE_RADIUS = 84
const KNOB_RADIUS = 30
const MAX_TRAVEL = 52
const DEAD_ZONE = 30
const BASE_REVEAL_DISTANCE = 14
const DEPTH = 8

export class FloatingJoystick extends Phaser.GameObjects.Container {
  private readonly base: Phaser.GameObjects.Graphics
  private readonly knob: Phaser.GameObjects.Graphics
  private activePointerId: number | null = null
  private lastDirection: Direction | null = null
  private baseRevealed = false
  private enabled = true
  private blockedRect: Rect | null = null

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    private readonly onDirection: (direction: Direction) => void,
  ) {
    super(scene, 0, 0)

    this.base = new Phaser.GameObjects.Graphics(scene)
    // A hollow, low-contrast base keeps the board readable under the thumb.
    this.base.fillStyle(theme.surface, 0.14)
    this.base.fillCircle(0, 0, BASE_RADIUS)
    this.base.lineStyle(2, theme.ink, 0.3)
    this.base.strokeCircle(0, 0, BASE_RADIUS)
    this.base.lineStyle(2, theme.accentInk, 0.28)
    this.base.strokeCircle(0, 0, MAX_TRAVEL)
    this.base.fillStyle(theme.ink, 0.24)
    this.base.fillTriangle(0, -BASE_RADIUS + 14, -8, -BASE_RADIUS + 30, 8, -BASE_RADIUS + 30)
    this.base.fillTriangle(0, BASE_RADIUS - 14, -8, BASE_RADIUS - 30, 8, BASE_RADIUS - 30)
    this.base.fillTriangle(-BASE_RADIUS + 14, 0, -BASE_RADIUS + 30, -8, -BASE_RADIUS + 30, 8)
    this.base.fillTriangle(BASE_RADIUS - 14, 0, BASE_RADIUS - 30, -8, BASE_RADIUS - 30, 8)
    this.base.setAlpha(0)

    this.knob = new Phaser.GameObjects.Graphics(scene)
    this.knob.fillStyle(theme.shadow, 0.15)
    this.knob.fillCircle(2, 6, KNOB_RADIUS)
    this.knob.fillStyle(theme.accentInk, 1)
    this.knob.fillCircle(0, 0, KNOB_RADIUS)
    this.knob.lineStyle(1.5, theme.ink, 0.35)
    this.knob.strokeCircle(0, 0, KNOB_RADIUS)
    this.knob.fillStyle(theme.highlight, 0.4)
    this.knob.fillCircle(-11, -13, 10)

    this.add([this.base, this.knob])
    this.setDepth(DEPTH).setVisible(false).setAlpha(0)

    scene.input.on('pointerdown', this.handleDown, this)
    scene.input.on('pointermove', this.handleMove, this)
    scene.input.on('pointerup', this.handleUp, this)
    scene.input.on('gameout', this.handleGameOut, this)
    scene.add.existing(this)
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) this.reset()
  }

  /** Keeps the joystick from popping up under HUD controls. */
  setBlockedRect(rect: Rect | null): void {
    this.blockedRect = rect
  }

  reset(): void {
    this.activePointerId = null
    this.lastDirection = null
    this.baseRevealed = false
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.base)
    if (!this.visible) return
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 120,
      onComplete: () => this.setVisible(false),
    })
  }

  override destroy(fromScene?: boolean): void {
    this.scene.input.off('pointerdown', this.handleDown, this)
    this.scene.input.off('pointermove', this.handleMove, this)
    this.scene.input.off('pointerup', this.handleUp, this)
    this.scene.input.off('gameout', this.handleGameOut, this)
    this.scene.tweens.killTweensOf(this.base)
    super.destroy(fromScene)
  }

  private handleDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.activePointerId !== null) return
    const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    if (this.isBlocked(point)) return
    this.activePointerId = pointer.id
    this.lastDirection = null
    this.baseRevealed = false
    this.knob.setPosition(0, 0)
    this.setPosition(point.x, point.y)
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.base)
    this.base.setAlpha(0)
    this.setVisible(true).setAlpha(1)
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return
    const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const dx = point.x - this.x
    const dy = point.y - this.y
    const length = Math.hypot(dx, dy)
    if (!this.baseRevealed && length >= BASE_REVEAL_DISTANCE) {
      this.baseRevealed = true
      this.scene.tweens.killTweensOf(this.base)
      this.scene.tweens.add({ targets: this.base, alpha: 1, duration: 100 })
    }
    const scale = length > MAX_TRAVEL ? MAX_TRAVEL / length : 1
    this.knob.setPosition(dx * scale, dy * scale)

    const next = resolveJoystickDirection(dx, dy, DEAD_ZONE, this.lastDirection)
    if (next === this.lastDirection) return
    this.lastDirection = next
    if (next) this.onDirection(next)
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return
    this.reset()
  }

  private handleGameOut(): void {
    if (this.activePointerId === null) return
    this.reset()
  }

  private isBlocked(point: { readonly x: number; readonly y: number }): boolean {
    const rect = this.blockedRect
    if (!rect) return false
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    )
  }
}
