import { mixColor, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import { drawSnakeBody, drawSnakeHead, type Point, type SnakeSegment } from './snakeArt'

/** A friendly coiled snake used as the menu mascot. */
export function createSnakeMascot(scene: Phaser.Scene, theme: Theme): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0)
  const bob = scene.add.container(0, 0)

  const shadow = scene.add.graphics()
  shadow.fillStyle(theme.ink, 0.08)
  shadow.fillEllipse(0, 152, 220, 38)

  const points: Point[] = []
  const count = 30
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1)
    const angle = -Math.PI * 0.4 + t * Math.PI * 1.7
    const radius = 150 - t * 100
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.82,
    })
  }

  const head = points[0] ?? { x: 0, y: 0 }
  const next = points[1] ?? { x: 1, y: 0 }
  const direction = { x: head.x - next.x, y: head.y - next.y }

  const segments: SnakeSegment[] = points.map((point, index) => {
    const t = index / (points.length - 1)
    return {
      x: point.x,
      y: point.y,
      radius: 18 - t * 8,
      color: mixColor(snakeColors.art.snakeHead, snakeColors.art.snakeTail, t),
    }
  })

  const body = scene.add.graphics()
  drawSnakeBody(body, segments, theme.ink, 4)

  const headGraphics = scene.add.graphics()
  const redrawHead = (): void => {
    const now = scene.time.now
    const blink = now % 3800 < 130
    const flickPhase = now % 3100
    const tongue = flickPhase < 300 ? Math.sin((flickPhase / 300) * Math.PI) : 0
    headGraphics.clear()
    drawSnakeHead(
      headGraphics,
      head.x,
      head.y,
      direction,
      23,
      theme,
      snakeColors.art.snakeHead,
      4,
      {
        blink,
        tongue,
      },
    )
  }
  redrawHead()
  scene.time.addEvent({ delay: 90, loop: true, callback: redrawHead })

  bob.add([shadow, body, headGraphics])
  root.add(bob)

  scene.tweens.add({
    targets: bob,
    y: -8,
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  })

  return root
}
