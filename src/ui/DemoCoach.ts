import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import { MENU_DEMO_BEATS, MENU_DEMO_CELL } from '../logic/menuDemo'
import type { Direction } from '../logic/types'
import { type MenuDemo, menuDemoCellCenter } from './menuDemo'

const LINE_WIDTH = 3.5
const LINE_ALPHA = 0.7
const HAND_SIZE = 50
const HAND_ORIGIN_X = 112 / 256
const HAND_ORIGIN_Y = 16 / 256
const HAND_OFFSET = 24
const KEYCAP_OFFSET = MENU_DEMO_CELL
const KEYCAP_SIZE = 42
const GESTURE_MS_TOUCH = 380
const GESTURE_MS_KEYS = 340
const FADE_MS = 120
const BEAT_GAP_MS = 240

const DELTAS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const ANGLES: Record<Direction, number> = {
  up: 0,
  left: -90,
  down: 180,
  right: 90,
}

const HAND_OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: HAND_OFFSET, y: 0 },
  left: { x: 0, y: HAND_OFFSET },
  down: { x: -HAND_OFFSET, y: 0 },
  right: { x: 0, y: -HAND_OFFSET },
}

const KEYCAP_OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: KEYCAP_OFFSET, y: 0 },
  left: { x: 0, y: KEYCAP_OFFSET },
  down: { x: -KEYCAP_OFFSET, y: 0 },
  right: { x: 0, y: -KEYCAP_OFFSET },
}

type GuideMode = 'touch' | 'keys'
type Phase = 'idle' | 'gesture' | 'fade' | 'travel' | 'gap' | 'reset'

/**
 * Draws one guided gesture per beat. The demo never chooses a turn on its own:
 * the coach swipes (touch) or presses a keycap (desktop), then asks the demo to
 * walk exactly two cells. A successful player input cancels the coach until
 * the demo resets.
 */
export class DemoCoach extends Phaser.GameObjects.Container {
  private readonly demo: MenuDemo
  private readonly theme: Theme
  private readonly mode: GuideMode
  private readonly line: Phaser.GameObjects.Graphics
  private readonly hand: Phaser.GameObjects.Image
  private readonly keycap: Phaser.GameObjects.Container
  private readonly keycapGraphics: Phaser.GameObjects.Graphics

  private started = false
  private canceled = false
  private paused = false
  private phase: Phase = 'idle'
  private beatIndex = 0
  private waitingForReset = false
  private gestureTween: Phaser.Tweens.Tween | undefined
  private fadeTween: Phaser.Tweens.Tween | undefined
  private gapTimer: Phaser.Time.TimerEvent | undefined

  constructor(scene: Phaser.Scene, theme: Theme, demo: MenuDemo, mode: GuideMode) {
    super(scene, 0, 0)
    this.demo = demo
    this.theme = theme
    this.mode = mode

    this.line = scene.add.graphics()
    // Sit under the snake and fruit, but above the board frame.
    demo.container.addAt(this.line, 1)

    this.hand = scene.add
      .image(0, 0, 'hand-pointer')
      .setDisplaySize(HAND_SIZE, HAND_SIZE)
      .setOrigin(HAND_ORIGIN_X, HAND_ORIGIN_Y)
      .setVisible(mode === 'touch')
      .setAlpha(0)

    this.keycapGraphics = scene.add.graphics()
    this.keycap = scene.add
      .container(0, 0, [this.keycapGraphics])
      .setVisible(mode === 'keys')
      .setAlpha(0)

    this.add([this.hand, this.keycap])
    demo.container.add(this)
    demo.onReset = () => this.handleReset()
  }

  start(): void {
    if (this.started || this.canceled) return
    this.started = true
    this.waitingForReset = false
    this.beatIndex = 0
    this.phase = 'idle'
    if (!this.paused) this.runBeat(0)
  }

  /** A successful player turn takes control; a later reset restarts the guide. */
  cancel(): void {
    this.started = false
    this.canceled = true
    this.waitingForReset = false
    this.phase = 'idle'
    this.stopMotion()
    this.hideVisuals()
  }

  pause(): void {
    if (this.paused) return
    this.paused = true
    this.gestureTween?.pause()
    this.fadeTween?.pause()
    if (this.gapTimer) this.gapTimer.paused = true
    this.demo.pause()
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    this.gestureTween?.resume()
    this.fadeTween?.resume()
    if (this.gapTimer) this.gapTimer.paused = false
    this.demo.resume()
    if (this.started && !this.waitingForReset && this.phase === 'idle') {
      this.runBeat(this.beatIndex)
    }
  }

  destroy(fromScene?: boolean): void {
    this.stopMotion()
    this.demo.onReset = undefined
    this.line.destroy()
    super.destroy(fromScene)
  }

  private handleReset(): void {
    this.stopMotion()
    this.hideVisuals()
    this.started = true
    this.canceled = false
    this.waitingForReset = false
    this.phase = 'idle'
    this.beatIndex = 0
    if (!this.paused) this.runBeat(0)
  }

  private runBeat(index: number): void {
    if (!this.started || this.paused || this.waitingForReset) return

    const beat = MENU_DEMO_BEATS[index]
    const head = this.demo.head()
    if (!beat || !head) {
      this.waitingForReset = true
      this.phase = 'reset'
      this.demo.finishGuidedLoop()
      return
    }

    const delta = DELTAS[beat.direction]
    const length = MENU_DEMO_CELL * beat.steps
    const start = menuDemoCellCenter(head.cell)
    const end = { x: start.x + delta.x * length, y: start.y + delta.y * length }
    const handOffset = HAND_OFFSETS[beat.direction]

    this.beatIndex = index
    this.phase = 'gesture'
    this.line.setAlpha(1)
    this.drawLine(start, end, 0)

    if (this.mode === 'touch') {
      this.animateHand(start, end, handOffset, beat.direction)
    } else {
      this.animateKeycap(start, end, beat.direction)
    }
  }

  private animateHand(
    start: { x: number; y: number },
    end: { x: number; y: number },
    offset: { x: number; y: number },
    direction: Direction,
  ): void {
    this.keycap.setAlpha(0)
    this.hand
      .setPosition(start.x + offset.x, start.y + offset.y)
      .setAngle(ANGLES[direction])
      .setAlpha(0)

    const travel = { t: 0 }
    this.gestureTween = this.scene.tweens.add({
      targets: travel,
      t: 1,
      duration: GESTURE_MS_TOUCH,
      ease: 'Sine.inOut',
      onUpdate: () => {
        const t = travel.t
        this.hand.setPosition(
          start.x + offset.x + (end.x - start.x) * t,
          start.y + offset.y + (end.y - start.y) * t,
        )
        this.hand.setAlpha(Math.min(1, t * 4))
        this.drawLine(start, end, t)
      },
      onComplete: () => {
        this.gestureTween = undefined
        this.hand.setAlpha(1)
        this.drawLine(start, end, 1)
        this.finishGesture()
      },
    })
    if (this.paused) this.gestureTween.pause()
  }

  private animateKeycap(
    start: { x: number; y: number },
    end: { x: number; y: number },
    direction: Direction,
  ): void {
    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    const offset = KEYCAP_OFFSETS[direction]
    this.hand.setAlpha(0)
    this.drawKeycap(direction)
    this.keycap
      .setPosition(middle.x + offset.x, middle.y + offset.y)
      .setScale(0.92)
      .setAlpha(0)

    const travel = { t: 0 }
    this.gestureTween = this.scene.tweens.add({
      targets: travel,
      t: 1,
      duration: GESTURE_MS_KEYS,
      ease: 'Sine.inOut',
      onUpdate: () => {
        const t = travel.t
        this.keycap.setAlpha(Math.min(1, t * 5))
        this.keycap.setScale(0.92 + Math.min(1, t * 3) * 0.08)
        this.drawLine(start, end, t)
      },
      onComplete: () => {
        this.gestureTween = undefined
        this.keycap.setAlpha(1).setScale(1)
        this.drawLine(start, end, 1)
        this.finishGesture()
      },
    })
    if (this.paused) this.gestureTween.pause()
  }

  private finishGesture(): void {
    this.phase = 'fade'
    this.fadeTween = this.scene.tweens.add({
      targets: [this.line, this.hand, this.keycap],
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        this.fadeTween = undefined
        this.hideVisuals()
        this.beginTurn()
      },
    })
    if (this.paused) this.fadeTween.pause()
  }

  private beginTurn(): void {
    if (!this.started || this.paused) return

    const beat = MENU_DEMO_BEATS[this.beatIndex]
    if (!beat) {
      this.finishLoop()
      return
    }

    this.phase = 'travel'
    const started = this.demo.startGuidedTurn(beat.direction, beat.steps, () => {
      this.afterBeat(this.beatIndex)
    })
    if (!started) {
      this.finishLoop()
    }
  }

  private afterBeat(index: number): void {
    if (!this.started || this.waitingForReset) return

    if (index + 1 >= MENU_DEMO_BEATS.length) {
      this.finishLoop()
      return
    }

    this.phase = 'gap'
    this.gapTimer = this.scene.time.delayedCall(BEAT_GAP_MS, () => {
      this.gapTimer = undefined
      if (!this.started || this.paused || this.waitingForReset) return
      this.runBeat(index + 1)
    })
    if (this.paused) this.gapTimer.paused = true
  }

  private finishLoop(): void {
    if (this.waitingForReset) return
    this.waitingForReset = true
    this.phase = 'reset'
    this.hideVisuals()
    this.demo.finishGuidedLoop()
  }

  private drawLine(
    start: { x: number; y: number },
    end: { x: number; y: number },
    progress: number,
  ): void {
    const graphics = this.line
    graphics.clear()
    if (progress <= 0) return

    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.hypot(dx, dy)
    if (distance === 0) return

    const unitX = dx / distance
    const unitY = dy / distance
    const normalX = -unitY
    const normalY = unitX
    const segments = 10

    graphics.lineStyle(LINE_WIDTH, this.theme.accentInk, LINE_ALPHA)
    graphics.beginPath()
    for (let index = 0; index <= segments; index += 1) {
      const t = (index / segments) * progress
      // A tiny bow keeps the line feeling hand-drawn without looking wobbly.
      const bow = Math.sin(t * Math.PI) * 1.2
      const x = start.x + dx * t + normalX * bow
      const y = start.y + dy * t + normalY * bow
      if (index === 0) {
        graphics.moveTo(x, y)
      } else {
        graphics.lineTo(x, y)
      }
    }
    graphics.strokePath()

    if (progress >= 0.92) {
      const wing = Math.PI * 0.78
      const arrowLength = 11
      graphics.beginPath()
      graphics.moveTo(end.x, end.y)
      graphics.lineTo(
        end.x + Math.cos(Math.atan2(unitY, unitX) + wing) * arrowLength,
        end.y + Math.sin(Math.atan2(unitY, unitX) + wing) * arrowLength,
      )
      graphics.moveTo(end.x, end.y)
      graphics.lineTo(
        end.x + Math.cos(Math.atan2(unitY, unitX) - wing) * arrowLength,
        end.y + Math.sin(Math.atan2(unitY, unitX) - wing) * arrowLength,
      )
      graphics.strokePath()
    }
  }

  private drawKeycap(direction: Direction): void {
    const graphics = this.keycapGraphics
    const half = KEYCAP_SIZE / 2
    graphics.clear()

    graphics.fillStyle(this.theme.shadow, 0.12)
    graphics.fillRoundedRect(-half, -half + 2, KEYCAP_SIZE, KEYCAP_SIZE, 9)
    graphics.fillStyle(this.theme.surface, 0.98)
    graphics.fillRoundedRect(-half, -half, KEYCAP_SIZE, KEYCAP_SIZE, 9)
    graphics.lineStyle(1.5, this.theme.borderSoft, 1)
    graphics.strokeRoundedRect(-half, -half, KEYCAP_SIZE, KEYCAP_SIZE, 9)

    graphics.fillStyle(this.theme.ink, 0.82)
    const arrow = 8
    if (direction === 'up') {
      graphics.fillTriangle(0, -arrow, -arrow * 0.9, arrow * 0.6, arrow * 0.9, arrow * 0.6)
    } else if (direction === 'down') {
      graphics.fillTriangle(0, arrow, -arrow * 0.9, -arrow * 0.6, arrow * 0.9, -arrow * 0.6)
    } else if (direction === 'left') {
      graphics.fillTriangle(-arrow, 0, arrow * 0.6, -arrow * 0.9, arrow * 0.6, arrow * 0.9)
    } else {
      graphics.fillTriangle(arrow, 0, -arrow * 0.6, -arrow * 0.9, -arrow * 0.6, arrow * 0.9)
    }
  }

  private hideVisuals(): void {
    this.line.clear()
    this.line.setAlpha(0)
    this.hand.setAlpha(0)
    this.keycap.setAlpha(0)
  }

  private stopMotion(): void {
    this.gestureTween?.stop()
    this.fadeTween?.stop()
    this.gestureTween = undefined
    this.fadeTween = undefined
    this.gapTimer?.remove()
    this.gapTimer = undefined
  }
}
