import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import type { Direction } from '../logic/types'
import { resolveJoystickDirection } from './joystick'
import type { Rect } from './layout'

const BASE_RADIUS = 92
const KNOB_RADIUS = 34
const MAX_TRAVEL = 58
const DEAD_ZONE = 24
const DEPTH = 8

export class FloatingJoystick extends Phaser.GameObjects.Container {
  private readonly knob: Phaser.GameObjects.Graphics
  private activePointerId: number | null = null
  private lastDirection: Direction | null = null
  private enabled = true
  private blockedRect: Rect | null = null

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    private readonly onDirection: (direction: Direction) => void,
  ) {
    super(scene, 0, 0)

    const base = new Phaser.GameObjects.Graphics(scene)
    base.fillStyle(theme.surface, 0.5)
    base.fillCircle(0, 0, BASE_RADIUS)
    base.lineStyle(1.5, theme.ink, 0.35)
    base.strokeCircle(0, 0, BASE_RADIUS)
    base.lineStyle(2, theme.accent, 0.35)
    base.strokeCircle(0, 0, MAX_TRAVEL)
    base.fillStyle(theme.ink, 0.3)
    base.fillTriangle(0, -BASE_RADIUS + 14, -8, -BASE_RADIUS + 30, 8, -BASE_RADIUS + 30)
    base.fillTriangle(0, BASE_RADIUS - 14, -8, BASE_RADIUS - 30, 8, BASE_RADIUS - 30)
    base.fillTriangle(-BASE_RADIUS + 14, 0, -BASE_RADIUS + 30, -8, -BASE_RADIUS + 30, 8)
    base.fillTriangle(BASE_RADIUS - 14, 0, BASE_RADIUS - 30, -8, BASE_RADIUS - 30, 8)

    this.knob = new Phaser.GameObjects.Graphics(scene)
    this.knob.fillStyle(theme.shadow, 0.15)
    this.knob.fillCircle(2, 6, KNOB_RADIUS)
    this.knob.fillStyle(theme.accent, 1)
    this.knob.fillCircle(0, 0, KNOB_RADIUS)
    this.knob.lineStyle(1.5, theme.ink, 0.35)
    this.knob.strokeCircle(0, 0, KNOB_RADIUS)
    this.knob.fillStyle(theme.highlight, 0.4)
    this.knob.fillCircle(-11, -13, 10)

    this.add([base, this.knob])
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
    this.scene.tweens.killTweensOf(this)
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
    super.destroy(fromScene)
  }

  private handleDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.activePointerId !== null) return
    if (this.isBlocked(pointer)) return
    this.activePointerId = pointer.id
    this.lastDirection = null
    this.knob.setPosition(0, 0)
    this.setPosition(pointer.x, pointer.y)
    this.scene.tweens.killTweensOf(this)
    this.setVisible(true).setAlpha(0.55)
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 100 })
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return
    const dx = pointer.x - this.x
    const dy = pointer.y - this.y
    const length = Math.hypot(dx, dy)
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

  private isBlocked(pointer: Phaser.Input.Pointer): boolean {
    const rect = this.blockedRect
    if (!rect) return false
    return (
      pointer.x >= rect.x &&
      pointer.x <= rect.x + rect.width &&
      pointer.y >= rect.y &&
      pointer.y <= rect.y + rect.height
    )
  }
}
