import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import type { Direction } from '../logic/types'
import { resolveJoystickDirection } from './joystick'

const BASE_RADIUS = 150
const KNOB_RADIUS = 56
const MAX_TRAVEL = BASE_RADIUS - KNOB_RADIUS
const DEAD_ZONE = 28
const HIT_RADIUS = 172
const ARROW_TIP = 132
const ARROW_SIZE = 10

const ARROW_POSITIONS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -ARROW_TIP },
  down: { x: 0, y: ARROW_TIP },
  left: { x: -ARROW_TIP, y: 0 },
  right: { x: ARROW_TIP, y: 0 },
}

export class VirtualJoystick extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly onDirection: (direction: Direction) => void
  private readonly arrowLayer: Phaser.GameObjects.Graphics
  private readonly highlight: Phaser.GameObjects.Graphics
  private readonly knob: Phaser.GameObjects.Graphics
  private readonly hitZone: Phaser.GameObjects.Zone
  private activePointerId: number | null = null
  private lastDirection: Direction | null = null

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    theme: Theme,
    onDirection: (direction: Direction) => void,
  ) {
    super(scene, x, y)
    this.theme = theme
    this.onDirection = onDirection

    const base = new Phaser.GameObjects.Graphics(scene)
    base.fillStyle(theme.panel, 0.65)
    base.fillCircle(0, 0, BASE_RADIUS)
    base.lineStyle(2, theme.panelStroke, 0.9)
    base.strokeCircle(0, 0, BASE_RADIUS)
    base.lineStyle(1, theme.panelStroke, 0.45)
    base.strokeCircle(0, 0, BASE_RADIUS - 38)

    this.arrowLayer = new Phaser.GameObjects.Graphics(scene)
    const muted = Phaser.Display.Color.HexStringToColor(theme.textMuted).color
    for (const direction of Object.keys(ARROW_POSITIONS) as Direction[]) {
      drawArrow(this.arrowLayer, direction, muted, 0.5)
    }

    this.highlight = new Phaser.GameObjects.Graphics(scene)
    this.knob = new Phaser.GameObjects.Graphics(scene)
    this.knob.fillStyle(0x000000, 0.22)
    this.knob.fillCircle(0, 5, KNOB_RADIUS)
    this.knob.fillStyle(theme.accent, 1)
    this.knob.fillCircle(0, 0, KNOB_RADIUS)
    this.knob.lineStyle(4, theme.accentHover, 0.4)
    this.knob.strokeCircle(0, 0, KNOB_RADIUS)
    this.knob.fillStyle(0xffffff, 0.14)
    this.knob.fillCircle(-16, -16, 16)

    this.add([base, this.arrowLayer, this.highlight, this.knob])

    this.hitZone = scene.add.zone(x, y, HIT_RADIUS * 2, HIT_RADIUS * 2)
    this.hitZone.setInteractive(
      new Phaser.Geom.Circle(HIT_RADIUS, HIT_RADIUS, HIT_RADIUS),
      Phaser.Geom.Circle.Contains,
    )
    this.hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.activate(pointer))

    scene.input.on('pointermove', this.handleMove, this)
    scene.input.on('pointerup', this.handleUp, this)
    scene.input.on('gameout', this.handleGameOut, this)
    scene.add.existing(this)
  }

  reset(): void {
    this.activePointerId = null
    this.lastDirection = null
    this.drawHighlight(null)
    this.scene.tweens.killTweensOf(this.knob)
    this.scene.tweens.add({
      targets: this.knob,
      x: 0,
      y: 0,
      scale: 1,
      duration: 120,
      ease: 'Quad.out',
    })
  }

  override destroy(fromScene?: boolean): void {
    this.scene.input.off('pointermove', this.handleMove, this)
    this.scene.input.off('pointerup', this.handleUp, this)
    this.scene.input.off('gameout', this.handleGameOut, this)
    this.hitZone.destroy()
    super.destroy(fromScene)
  }

  private activate(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) return
    this.activePointerId = pointer.id
    this.scene.tweens.killTweensOf(this.knob)
    this.knob.setScale(1.06)
    this.updateFromPointer(pointer)
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return
    this.updateFromPointer(pointer)
  }

  private handleUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return
    this.reset()
  }

  private handleGameOut(): void {
    if (this.activePointerId === null) return
    this.reset()
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.x
    const dy = pointer.y - this.y
    const length = Math.hypot(dx, dy)
    const scale = length > MAX_TRAVEL ? MAX_TRAVEL / length : 1
    this.knob.setPosition(dx * scale, dy * scale)

    const next = resolveJoystickDirection(dx, dy, DEAD_ZONE, this.lastDirection)
    if (next === this.lastDirection) return
    this.lastDirection = next
    this.drawHighlight(next)
    if (next) this.onDirection(next)
  }

  private drawHighlight(direction: Direction | null): void {
    this.highlight.clear()
    if (!direction) return
    drawArrow(this.highlight, direction, this.theme.accent, 1)
  }
}

function drawArrow(
  graphics: Phaser.GameObjects.Graphics,
  direction: Direction,
  color: number,
  alpha: number,
): void {
  graphics.fillStyle(color, alpha)
  const tip = ARROW_TIP
  const size = ARROW_SIZE
  if (direction === 'up') {
    graphics.fillTriangle(0, -tip, -size, -tip + size, size, -tip + size)
  } else if (direction === 'down') {
    graphics.fillTriangle(0, tip, -size, tip - size, size, tip - size)
  } else if (direction === 'left') {
    graphics.fillTriangle(-tip, 0, -tip + size, -size, -tip + size, size)
  } else {
    graphics.fillTriangle(tip, 0, tip - size, -size, tip - size, size)
  }
}
