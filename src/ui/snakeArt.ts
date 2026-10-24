import type { Theme } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'

export interface SnakeSegment {
  x: number
  y: number
  radius: number
  color: number
}

export interface Point {
  x: number
  y: number
}

/** Two-pass body: an ink underlay for the outline, then tapered colour fills. */
export function drawSnakeBody(
  graphics: Phaser.GameObjects.Graphics,
  segments: readonly SnakeSegment[],
  ink: number,
  outline: number,
): void {
  if (segments.length === 0) return

  graphics.fillStyle(ink, 1)
  for (const segment of segments) {
    graphics.fillCircle(segment.x, segment.y, segment.radius + outline)
  }
  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1]
    const current = segments[index]
    if (!previous || !current) continue
    graphics.lineStyle(previous.radius + current.radius + outline * 2, ink, 1)
    graphics.lineBetween(previous.x, previous.y, current.x, current.y)
  }

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (!segment) continue
    graphics.fillStyle(segment.color, 1)
    graphics.fillCircle(segment.x, segment.y, segment.radius)
    const previous = segments[index - 1]
    if (previous) {
      graphics.lineStyle(previous.radius + segment.radius, segment.color, 1)
      graphics.lineBetween(previous.x, previous.y, segment.x, segment.y)
    }
  }
}

export interface HeadOptions {
  dead?: boolean
  blink?: boolean
  /** 0..1 tongue flick amount. */
  tongue?: number
}

export function drawSnakeHead(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  direction: Point,
  radius: number,
  theme: Theme,
  headColor: number,
  outline: number,
  options: HeadOptions = {},
): void {
  const length = Math.hypot(direction.x, direction.y) || 1
  const dir = { x: direction.x / length, y: direction.y / length }
  const side = { x: -dir.y, y: dir.x }
  const ink = theme.ink

  graphics.fillStyle(ink, 1)
  graphics.fillCircle(x, y, radius + outline)
  graphics.fillStyle(headColor, 1)
  graphics.fillCircle(x, y, radius)

  graphics.fillStyle(snakeColors.art.blush, 0.38)
  graphics.fillCircle(
    x - dir.x * radius * 0.1 + side.x * radius * 0.62,
    y - dir.y * radius * 0.1 + side.y * radius * 0.62,
    radius * 0.2,
  )
  graphics.fillCircle(
    x - dir.x * radius * 0.1 - side.x * radius * 0.62,
    y - dir.y * radius * 0.1 - side.y * radius * 0.62,
    radius * 0.2,
  )

  const eyeForward = radius * 0.27
  const eyeSide = radius * 0.36
  for (const sign of [-1, 1]) {
    const eyeX = x + dir.x * eyeForward + side.x * sign * eyeSide
    const eyeY = y + dir.y * eyeForward + side.y * sign * eyeSide
    if (options.dead) {
      graphics.lineStyle(Math.max(2, radius * 0.16), ink, 1)
      graphics.lineBetween(
        eyeX - radius * 0.16,
        eyeY - radius * 0.16,
        eyeX + radius * 0.16,
        eyeY + radius * 0.16,
      )
      graphics.lineBetween(
        eyeX + radius * 0.16,
        eyeY - radius * 0.16,
        eyeX - radius * 0.16,
        eyeY + radius * 0.16,
      )
    } else if (options.blink) {
      graphics.lineStyle(Math.max(2, radius * 0.14), ink, 1)
      graphics.lineBetween(eyeX - radius * 0.16, eyeY, eyeX + radius * 0.16, eyeY)
    } else {
      graphics.fillStyle(snakeColors.art.eyeWhite, 1)
      graphics.fillCircle(eyeX, eyeY, radius * 0.22)
      graphics.fillStyle(ink, 1)
      graphics.fillCircle(eyeX + dir.x * radius * 0.06, eyeY + dir.y * radius * 0.06, radius * 0.12)
      graphics.fillStyle(snakeColors.art.shine, 0.8)
      graphics.fillCircle(eyeX - radius * 0.04, eyeY - radius * 0.05, radius * 0.05)
    }
  }

  if (!options.dead) {
    const mouthX = x + dir.x * radius * 0.48
    const mouthY = y + dir.y * radius * 0.48
    graphics.lineStyle(Math.max(2, radius * 0.12), ink, 0.85)
    graphics.lineBetween(
      mouthX - side.x * radius * 0.2,
      mouthY - side.y * radius * 0.2,
      mouthX + side.x * radius * 0.2,
      mouthY + side.y * radius * 0.2,
    )

    const flick = options.tongue ?? 0
    if (flick > 0.02) {
      const startX = x + dir.x * (radius + 1)
      const startY = y + dir.y * (radius + 1)
      const endX = startX + dir.x * radius * (0.45 + flick * 0.55)
      const endY = startY + dir.y * radius * (0.45 + flick * 0.55)
      graphics.lineStyle(Math.max(2, radius * 0.12), snakeColors.art.tongue, 1)
      graphics.lineBetween(startX, startY, endX, endY)
      graphics.lineBetween(endX, endY, endX + dir.x * 4 + side.x * 4, endY + dir.y * 4 + side.y * 4)
      graphics.lineBetween(endX, endY, endX + dir.x * 4 - side.x * 4, endY + dir.y * 4 - side.y * 4)
    }
  }
}

export function drawFruit(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  theme: Theme,
  time: number,
): void {
  const pulse = Math.sin(time * 0.006) * radius * 0.08
  const size = radius + pulse

  graphics.fillStyle(theme.accentWarm, 0.18)
  graphics.fillCircle(x, y, size * 1.65)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillCircle(x, y, size + 3)
  graphics.fillStyle(color, 1)
  graphics.fillCircle(x, y, size)

  graphics.fillStyle(snakeColors.art.shine, 0.55)
  graphics.fillCircle(x - size * 0.3, y - size * 0.34, size * 0.26)
  graphics.fillStyle(snakeColors.art.shine, 0.8)
  graphics.fillCircle(x + size * 0.34, y - size * 0.42, size * 0.09)

  graphics.fillStyle(theme.ink, 1)
  graphics.fillEllipse(x + size * 0.42, y - size - 4, size * 0.62 + 3, size * 0.32 + 3)
  graphics.fillStyle(snakeColors.art.leaf, 1)
  graphics.fillEllipse(x + size * 0.42, y - size - 4, size * 0.62, size * 0.32)

  graphics.lineStyle(Math.max(2, size * 0.16), theme.ink, 1)
  graphics.lineBetween(x, y - size - 1, x, y - size - size * 0.34)
}
