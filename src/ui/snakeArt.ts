import type { Theme } from '@mg/core'
import type Phaser from 'phaser'
import { type FruitArtColors, snakeColors } from '../colors'
import type { EffectKind, FruitKind, PowerUpKind } from '../logic/types'

export interface Point {
  x: number
  y: number
}

export interface SnakeBlock {
  x: number
  y: number
  color: number
}

/**
 * Cell-aligned body: one rounded tile per segment, tail first so the head sits
 * on top. Ink tiles are inflated before the fills so the gaps read as seams.
 */
export function drawBlockSnakeBody(
  graphics: Phaser.GameObjects.Graphics,
  blocks: readonly SnakeBlock[],
  cell: number,
  ink: number,
  outline: number,
): void {
  if (blocks.length === 0) return

  const inset = Math.max(1.5, cell * 0.06)
  const size = cell - inset * 2
  const radius = cell * 0.28

  graphics.fillStyle(ink, 1)
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]
    if (!block) continue
    graphics.fillRoundedRect(
      block.x - size / 2 - outline,
      block.y - size / 2 - outline,
      size + outline * 2,
      size + outline * 2,
      radius + outline,
    )
  }

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]
    if (!block) continue
    graphics.fillStyle(block.color, 1)
    graphics.fillRoundedRect(block.x - size / 2, block.y - size / 2, size, size, radius)
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
  ink: number,
  headColor: number,
  outline: number,
  options: HeadOptions = {},
): void {
  const length = Math.hypot(direction.x, direction.y) || 1
  const dir = { x: direction.x / length, y: direction.y / length }
  const side = { x: -dir.y, y: dir.x }

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
  kind: FruitKind,
  theme: Theme,
  time: number,
): void {
  const palette = snakeColors.art.fruits[kind]
  const pulse = Math.sin(time * 0.006) * radius * 0.08
  const size = radius + pulse

  graphics.fillStyle(palette.light, 0.2)
  graphics.fillCircle(x, y, size * 1.7)

  FRUIT_DRAWERS[kind](graphics, x, y, size, palette, theme)
}

type FruitDrawer = (
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
) => void

/**
 * One entry per fruit kind. The Record type makes a missing drawing a compile
 * error, so adding a fruit to FRUIT_KINDS cannot silently produce an empty cell.
 */
const FRUIT_DRAWERS: Record<FruitKind, FruitDrawer> = {
  apple: (graphics, x, y, size, palette, theme) => {
    drawRoundFruit(graphics, x, y, size, palette, theme)
    drawLeaf(graphics, x, y, size, palette, theme)
  },
  orange: (graphics, x, y, size, palette, theme) => {
    drawRoundFruit(graphics, x, y, size, palette, theme)
    graphics.fillStyle(palette.dark, 0.35)
    graphics.fillCircle(x - size * 0.36, y - size * 0.08, size * 0.07)
    graphics.fillCircle(x + size * 0.24, y + size * 0.28, size * 0.07)
    graphics.fillCircle(x + size * 0.32, y - size * 0.3, size * 0.06)
    drawLeaf(graphics, x, y, size, palette, theme)
  },
  lemon: drawLemon,
  grape: drawGrapes,
  berry: drawBerries,
  melon: drawMelon,
  banana: drawBanana,
  watermelon: drawWatermelon,
  strawberry: drawStrawberry,
  peach: drawPeach,
  mango: drawMango,
  kiwi: drawKiwi,
  pomegranate: drawPomegranate,
  pineapple: drawPineapple,
}

export function drawPowerUp(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  kind: PowerUpKind,
  time: number,
): void {
  const palette = snakeColors.art.powerUps[kind]
  const color = kind === 'ice' ? snakeColors.art.effects.slow : snakeColors.art.effects.fast
  const pulse = Math.sin(time * 0.008) * radius * 0.06

  graphics.fillStyle(color, 0.18)
  graphics.fillCircle(x, y, radius * (1.85 + pulse / radius))

  if (kind === 'ice') drawIceCream(graphics, x, y, radius + pulse, palette)
  else drawChili(graphics, x, y, radius + pulse, palette)
}

/** Ad-reward super fruit: a gold star fruit with a crown and sparkles. */
export function drawSuperFruit(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  time: number,
  theme: Theme,
): void {
  const palette = snakeColors.art.superFruit
  const pulse = Math.sin(time * 0.008) * radius * 0.08
  const size = radius + pulse

  graphics.fillStyle(palette.glow, 0.2)
  graphics.fillCircle(x, y, size * 2.4)
  graphics.fillStyle(palette.glow, 0.3)
  graphics.fillCircle(x, y, size * 1.8)

  graphics.fillStyle(theme.ink, 1)
  graphics.fillCircle(x, y, size + inkWidth(size))
  graphics.fillStyle(palette.body, 1)
  graphics.fillCircle(x, y, size)

  const crownInk = [
    [
      x - size * 0.62,
      y - size * 0.72,
      x - size * 0.46,
      y - size * 1.42,
      x - size * 0.14,
      y - size * 0.86,
    ],
    [x - size * 0.2, y - size * 0.9, x, y - size * 1.55, x + size * 0.2, y - size * 0.9],
    [
      x + size * 0.14,
      y - size * 0.86,
      x + size * 0.46,
      y - size * 1.42,
      x + size * 0.62,
      y - size * 0.72,
    ],
  ] as const
  for (const [ax, ay, bx, by, cx, cy] of crownInk) {
    graphics.fillTriangle(ax, ay, bx, by, cx, cy)
  }
  for (const [ax, ay, bx, by, cx, cy] of crownInk) {
    graphics.fillStyle(palette.light, 1)
    graphics.fillTriangle(
      ax + (bx - ax) * 0.18,
      ay + (by - ay) * 0.14,
      bx,
      by + size * 0.08,
      cx + (bx - cx) * 0.18,
      cy + (by - cy) * 0.14,
    )
  }

  graphics.fillStyle(palette.light, 0.95)
  graphics.fillTriangle(x, y - size * 0.56, x - size * 0.2, y, x + size * 0.2, y)
  graphics.fillTriangle(x, y + size * 0.56, x - size * 0.2, y, x + size * 0.2, y)
  graphics.fillTriangle(x - size * 0.56, y, x, y - size * 0.2, x, y + size * 0.2)
  graphics.fillTriangle(x + size * 0.56, y, x, y - size * 0.2, x, y + size * 0.2)
  graphics.fillStyle(snakeColors.art.shine, 0.85)
  graphics.fillCircle(x - size * 0.3, y - size * 0.35, size * 0.1)

  for (let index = 0; index < 4; index += 1) {
    const angle = time * 0.0015 + (Math.PI * index) / 2
    const distance = size * (1.55 + 0.12 * Math.sin(time * 0.01 + index))
    graphics.fillStyle(palette.light, 0.75)
    graphics.fillCircle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, size * 0.07)
  }
}

export function drawEffectRing(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  effect: EffectKind,
  ratio: number,
  theme: Theme,
): void {
  const color = snakeColors.art.effects[effect]
  const pips = 8
  const filled = Math.max(1, Math.ceil(Math.min(1, Math.max(0, ratio)) * pips))
  for (let index = 0; index < pips; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / pips
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    graphics.fillStyle(index < filled ? color : theme.surface, index < filled ? 0.95 : 0.4)
    graphics.fillCircle(px, py, Math.max(2, radius * 0.11))
  }
}

/** Ink outline width that scales with the art, so small fruits keep a thin rim. */
function inkWidth(radius: number): number {
  return Math.max(1.2, radius * 0.12)
}

function drawRoundFruit(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillCircle(x, y, size + ink)
  graphics.fillStyle(palette.body, 1)
  graphics.fillCircle(x, y, size)
  graphics.fillStyle(palette.light, 0.45)
  graphics.fillCircle(x - size * 0.32, y - size * 0.36, size * 0.25)
  graphics.fillStyle(snakeColors.art.shine, 0.85)
  graphics.fillCircle(x + size * 0.3, y - size * 0.42, size * 0.09)
}

function drawLeaf(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  graphics.lineStyle(Math.max(2, size * 0.16), theme.ink, 1)
  graphics.lineBetween(x, y - size - 1, x, y - size - size * 0.34)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillEllipse(x + size * 0.42, y - size - 4, size * 0.62 + ink, size * 0.32 + ink)
  graphics.fillStyle(palette.leaf, 1)
  graphics.fillEllipse(x + size * 0.42, y - size - 4, size * 0.62, size * 0.32)
}

function drawLemon(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const width = size * 2.3
  const height = size * 1.65
  const ink = inkWidth(size)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillEllipse(x, y, width + ink * 2, height + ink * 2)
  graphics.fillStyle(palette.body, 1)
  graphics.fillEllipse(x, y, width, height)
  graphics.fillStyle(palette.light, 0.5)
  graphics.fillEllipse(x - size * 0.38, y - size * 0.22, size * 0.7, size * 0.32)
  graphics.fillStyle(snakeColors.art.shine, 0.85)
  graphics.fillCircle(x + size * 0.55, y - size * 0.38, size * 0.09)
  graphics.fillStyle(palette.dark, 1)
  graphics.fillCircle(x - width * 0.54, y, size * 0.16)
  graphics.fillCircle(x + width * 0.54, y, size * 0.16)
}

function drawGrapes(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const berries = [
    { x: 0, y: -size * 0.5 },
    { x: -size * 0.48, y: size * 0.02 },
    { x: 0, y: size * 0.02 },
    { x: size * 0.48, y: size * 0.02 },
    { x: -size * 0.25, y: size * 0.55 },
    { x: size * 0.25, y: size * 0.55 },
  ]
  const berryRadius = size * 0.42
  const ink = Math.max(1, berryRadius * 0.2)

  for (const berry of berries) {
    graphics.fillStyle(theme.ink, 1)
    graphics.fillCircle(x + berry.x, y + berry.y, berryRadius + ink)
    graphics.fillStyle(palette.body, 1)
    graphics.fillCircle(x + berry.x, y + berry.y, berryRadius)
    graphics.fillStyle(palette.light, 0.5)
    graphics.fillCircle(
      x + berry.x - berryRadius * 0.3,
      y + berry.y - berryRadius * 0.32,
      berryRadius * 0.28,
    )
  }
  graphics.lineStyle(Math.max(2, size * 0.14), theme.ink, 1)
  graphics.lineBetween(x, y - size * 0.8, x, y - size * 1.15)
  graphics.fillStyle(palette.leaf, 1)
  graphics.fillEllipse(x + size * 0.36, y - size * 1.05, size * 0.6, size * 0.3)
}

function drawBerries(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const berries = [
    { x: -size * 0.4, y: size * 0.08, r: size * 0.48 },
    { x: size * 0.4, y: size * 0.08, r: size * 0.48 },
    { x: 0, y: -size * 0.28, r: size * 0.55 },
  ]

  for (const berry of berries) {
    graphics.fillStyle(theme.ink, 1)
    graphics.fillCircle(x + berry.x, y + berry.y, berry.r + Math.max(1, berry.r * 0.18))
    graphics.fillStyle(palette.body, 1)
    graphics.fillCircle(x + berry.x, y + berry.y, berry.r)
    graphics.fillStyle(palette.light, 0.55)
    graphics.fillCircle(x + berry.x - berry.r * 0.3, y + berry.y - berry.r * 0.35, berry.r * 0.26)
  }
  graphics.lineStyle(Math.max(2, size * 0.13), palette.dark, 1)
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 5
    graphics.lineBetween(
      x,
      y - size * 0.28,
      x + Math.cos(angle) * size * 0.28,
      y - size * 0.28 + Math.sin(angle) * size * 0.28,
    )
  }
}

function drawMelon(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillCircle(x, y, size + ink)
  graphics.fillStyle(palette.body, 1)
  graphics.fillCircle(x, y, size)

  graphics.fillStyle(palette.dark, 0.8)
  for (const offset of [-0.45, 0, 0.45]) {
    graphics.fillEllipse(x + size * offset, y, size * 0.14, size * 1.52)
  }
  graphics.fillStyle(palette.light, 0.55)
  graphics.fillCircle(x - size * 0.32, y - size * 0.36, size * 0.22)
  graphics.lineStyle(Math.max(2, size * 0.14), theme.ink, 1)
  graphics.lineBetween(x, y - size - 1, x, y - size - size * 0.34)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillEllipse(x + size * 0.42, y - size - 4, size * 0.62 + ink, size * 0.32 + ink)
  graphics.fillStyle(palette.leaf, 1)
  graphics.fillEllipse(x + size * 0.42, y - size - 4, size * 0.62, size * 0.32)
}

function drawBanana(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  const curve = [
    { x: -0.68, y: -0.08, radius: 0.13 },
    { x: -0.54, y: 0.28, radius: 0.21 },
    { x: -0.26, y: 0.54, radius: 0.26 },
    { x: 0.1, y: 0.6, radius: 0.26 },
    { x: 0.44, y: 0.4, radius: 0.21 },
    { x: 0.66, y: 0.04, radius: 0.13 },
  ]

  for (const point of curve) {
    graphics.fillStyle(theme.ink, 1)
    graphics.fillCircle(x + point.x * size, y + point.y * size, point.radius * size + ink)
  }
  for (const point of curve) {
    graphics.fillStyle(palette.body, 1)
    graphics.fillCircle(x + point.x * size, y + point.y * size, point.radius * size)
  }

  graphics.fillStyle(palette.dark, 1)
  graphics.fillCircle(x - size * 0.68, y - size * 0.08, size * 0.11)
  graphics.fillCircle(x + size * 0.66, y + size * 0.04, size * 0.11)
  graphics.fillStyle(palette.light, 0.5)
  graphics.fillCircle(x - size * 0.18, y + size * 0.32, size * 0.08)
  graphics.fillCircle(x + size * 0.12, y + size * 0.38, size * 0.07)
}

function drawWatermelon(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  const top = y - size * 0.62
  const tip = y + size * 0.98
  const half = size * 0.98

  graphics.fillStyle(theme.ink, 1)
  graphics.fillTriangle(x - half - ink, top - ink, x + half + ink, top - ink, x, tip + ink)
  graphics.fillStyle(palette.body, 1)
  graphics.fillTriangle(x - half, top, x + half, top, x, tip)
  graphics.fillStyle(palette.leaf, 1)
  graphics.fillRoundedRect(x - size * 0.88, top, size * 1.76, size * 0.24, size * 0.12)

  graphics.fillStyle(theme.ink, 0.85)
  for (const seed of [
    { x: -0.45, y: -0.03 },
    { x: 0.08, y: -0.12 },
    { x: 0.5, y: 0.02 },
    { x: -0.18, y: 0.36 },
    { x: 0.28, y: 0.44 },
  ]) {
    graphics.fillEllipse(
      x + seed.x * size,
      y + seed.y * size,
      Math.max(1, size * 0.09),
      Math.max(1.4, size * 0.15),
    )
  }
}

function drawStrawberry(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  const lobe = size * 0.58
  const lobeY = y - size * 0.12

  graphics.fillStyle(theme.ink, 1)
  graphics.fillCircle(x - size * 0.4, lobeY, lobe + ink)
  graphics.fillCircle(x + size * 0.4, lobeY, lobe + ink)
  graphics.fillTriangle(x - size * 0.94, y, x + size * 0.94, y, x, y + size * 1.04)
  graphics.fillStyle(palette.body, 1)
  graphics.fillCircle(x - size * 0.4, lobeY, lobe)
  graphics.fillCircle(x + size * 0.4, lobeY, lobe)
  graphics.fillTriangle(x - size * 0.88, y, x + size * 0.88, y, x, y + size * 0.98)

  graphics.fillStyle(palette.light, 0.55)
  graphics.fillCircle(x - size * 0.45, y - size * 0.28, size * 0.18)
  graphics.fillCircle(x + size * 0.3, y - size * 0.32, size * 0.14)
  graphics.fillStyle(theme.accentWarm, 0.95)
  for (const seed of [
    { x: -0.3, y: 0.1 },
    { x: 0.06, y: -0.05 },
    { x: 0.4, y: 0.14 },
    { x: -0.12, y: 0.45 },
    { x: 0.26, y: 0.52 },
  ]) {
    graphics.fillEllipse(
      x + seed.x * size,
      y + seed.y * size,
      Math.max(1, size * 0.08),
      Math.max(1.3, size * 0.12),
    )
  }

  graphics.lineStyle(Math.max(1.4, size * 0.1), theme.ink, 1)
  graphics.lineBetween(x, y - size * 0.58, x, y - size * 0.95)
  graphics.fillStyle(palette.leaf, 1)
  graphics.fillEllipse(x - size * 0.26, y - size * 0.78, size * 0.52, size * 0.22)
  graphics.fillEllipse(x + size * 0.26, y - size * 0.78, size * 0.52, size * 0.22)
  graphics.fillEllipse(x, y - size * 0.88, size * 0.44, size * 0.2)
}

function drawPeach(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  drawRoundFruit(graphics, x, y, size, palette, theme)
  graphics.lineStyle(Math.max(1.2, size * 0.08), palette.dark, 0.55)
  graphics.lineBetween(x, y - size * 0.62, x + size * 0.04, y + size * 0.42)
  drawLeaf(graphics, x, y, size, palette, theme)
}

function drawMango(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillEllipse(x, y + size * 0.04, size * 1.6 + ink * 2, size * 2 + ink * 2)
  graphics.fillStyle(palette.body, 1)
  graphics.fillEllipse(x, y + size * 0.04, size * 1.6, size * 2)
  graphics.fillStyle(palette.light, 0.5)
  graphics.fillEllipse(x - size * 0.28, y - size * 0.3, size * 0.66, size * 0.86)
  graphics.fillStyle(palette.leaf, 0.95)
  graphics.fillEllipse(x + size * 0.34, y - size * 0.78, size * 0.58, size * 0.3)
  graphics.fillStyle(palette.dark, 0.45)
  graphics.fillEllipse(x + size * 0.18, y + size * 0.48, size * 0.32, size * 0.12)
  drawLeaf(graphics, x, y, size, palette, theme)
}

function drawKiwi(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  graphics.fillStyle(theme.ink, 1)
  graphics.fillEllipse(x, y, size * 1.7 + ink * 2, size * 2.1 + ink * 2)
  graphics.fillStyle(palette.body, 1)
  graphics.fillEllipse(x, y, size * 1.7, size * 2.1)
  graphics.fillStyle(palette.leaf, 1)
  graphics.fillEllipse(x, y, size * 1.24, size * 1.64)
  graphics.fillStyle(theme.surface, 0.9)
  graphics.fillEllipse(x, y, size * 0.5, size * 0.68)

  graphics.fillStyle(theme.ink, 0.85)
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    graphics.fillEllipse(
      x + Math.cos(angle) * size * 0.4,
      y + Math.sin(angle) * size * 0.55,
      Math.max(1, size * 0.07),
      Math.max(1.4, size * 0.12),
    )
  }

  graphics.fillStyle(palette.light, 0.55)
  graphics.fillEllipse(x - size * 0.55, y - size * 0.6, size * 0.16, size * 0.3)
}

function drawPomegranate(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  drawRoundFruit(graphics, x, y + size * 0.1, size, palette, theme)

  for (const [baseX, baseY, tipX, tipY] of [
    [x - size * 0.44, y - size * 0.5, x - size * 0.56, y - size * 1.22],
    [x - size * 0.1, y - size * 0.68, x, y - size * 1.42],
    [x + size * 0.44, y - size * 0.5, x + size * 0.56, y - size * 1.22],
  ] as const) {
    graphics.lineStyle(Math.max(2, size * 0.2), theme.ink, 1)
    graphics.lineBetween(baseX, baseY, tipX, tipY)
    graphics.lineStyle(Math.max(1.2, size * 0.11), palette.dark, 1)
    graphics.lineBetween(baseX, baseY, tipX, tipY)
  }

  graphics.fillStyle(palette.light, 0.35)
  graphics.fillCircle(x + size * 0.22, y + size * 0.35, size * 0.28)
  graphics.fillStyle(palette.dark, 0.85)
  graphics.fillCircle(x + size * 0.14, y + size * 0.28, size * 0.055)
  graphics.fillCircle(x + size * 0.3, y + size * 0.38, size * 0.05)
  graphics.fillCircle(x + size * 0.2, y + size * 0.47, size * 0.045)
}

function drawPineapple(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FruitArtColors,
  theme: Theme,
): void {
  const ink = inkWidth(size)
  const width = size * 1.6
  const height = size * 1.95
  const top = y - size * 0.34

  graphics.fillStyle(theme.ink, 1)
  graphics.fillRoundedRect(
    x - width / 2 - ink,
    top - ink,
    width + ink * 2,
    height + ink * 2,
    size * 0.5 + ink,
  )
  graphics.fillStyle(palette.body, 1)
  graphics.fillRoundedRect(x - width / 2, top, width, height, size * 0.5)

  graphics.lineStyle(Math.max(1, size * 0.075), palette.dark, 0.8)
  for (const offset of [-0.32, 0, 0.32]) {
    graphics.lineBetween(
      x + offset * width,
      top + height * 0.16,
      x + offset * width,
      top + height * 0.84,
    )
  }
  for (const ratio of [0.3, 0.5, 0.7]) {
    const lineY = top + height * ratio
    graphics.lineBetween(x - width * 0.34, lineY, x + width * 0.34, lineY)
  }

  const crown = [
    {
      ax: x - size * 0.55,
      ay: y - size * 0.28,
      bx: x - size * 0.92,
      by: y - size * 1.28,
      cx: x - size * 0.16,
      cy: y - size * 0.52,
    },
    {
      ax: x - size * 0.16,
      ay: y - size * 0.4,
      bx: x,
      by: y - size * 1.52,
      cx: x + size * 0.16,
      cy: y - size * 0.4,
    },
    {
      ax: x + size * 0.16,
      ay: y - size * 0.52,
      bx: x + size * 0.92,
      by: y - size * 1.28,
      cx: x + size * 0.55,
      cy: y - size * 0.28,
    },
  ] as const

  for (const leaf of crown) {
    graphics.fillStyle(theme.ink, 1)
    graphics.fillTriangle(leaf.ax, leaf.ay, leaf.bx, leaf.by, leaf.cx, leaf.cy)
  }
  for (const leaf of crown) {
    const centerX = (leaf.ax + leaf.bx + leaf.cx) / 3
    const centerY = (leaf.ay + leaf.by + leaf.cy) / 3
    const inset = 0.22
    graphics.fillStyle(palette.leaf, 1)
    graphics.fillTriangle(
      leaf.ax + (centerX - leaf.ax) * inset,
      leaf.ay + (centerY - leaf.ay) * inset,
      leaf.bx + (centerX - leaf.bx) * inset,
      leaf.by + (centerY - leaf.by) * inset,
      leaf.cx + (centerX - leaf.cx) * inset,
      leaf.cy + (centerY - leaf.cy) * inset,
    )
  }

  graphics.fillStyle(palette.light, 0.35)
  graphics.fillEllipse(x - size * 0.3, top + height * 0.3, size * 0.38, size * 0.62)
}

function drawIceCream(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: { light: number; body: number; dark: number; accent: number },
): void {
  const coneTop = y - size * 0.1
  const coneTip = y + size * 1.35
  graphics.fillStyle(snakeColors.art.shine, 0.9)
  graphics.fillTriangle(x - size * 0.6, coneTop - 2, x + size * 0.6, coneTop - 2, x, coneTip + 3)
  graphics.fillStyle(0xe0a96d, 1)
  graphics.fillTriangle(x - size * 0.55, coneTop, x + size * 0.55, coneTop, x, coneTip)
  graphics.lineStyle(Math.max(1.5, size * 0.07), 0xb9773d, 0.8)
  graphics.lineBetween(
    x - size * 0.28,
    coneTop + size * 0.35,
    x + size * 0.28,
    coneTop + size * 0.35,
  )
  graphics.lineBetween(
    x - size * 0.14,
    coneTop + size * 0.75,
    x + size * 0.14,
    coneTop + size * 0.75,
  )

  // Offsets stay relative to the centre: `coneTop` is absolute, so reusing it
  // here would add `y` twice and detach the scoops from the cone.
  const scoops = [
    { x: -size * 0.32, y: -size * 0.52, r: size * 0.58, color: palette.body },
    { x: size * 0.32, y: -size * 0.52, r: size * 0.58, color: palette.accent },
    { x: 0, y: -size * 1.02, r: size * 0.55, color: palette.light },
  ]
  for (const scoop of scoops) {
    graphics.fillStyle(snakeColors.art.ink, 1)
    graphics.fillCircle(x + scoop.x, y + scoop.y, scoop.r + Math.max(1, scoop.r * 0.18))
    graphics.fillStyle(scoop.color, 1)
    graphics.fillCircle(x + scoop.x, y + scoop.y, scoop.r)
    graphics.fillStyle(snakeColors.art.shine, 0.55)
    graphics.fillCircle(x + scoop.x - scoop.r * 0.25, y + scoop.y - scoop.r * 0.3, scoop.r * 0.22)
  }
  graphics.fillStyle(palette.dark, 1)
  graphics.fillCircle(x + size * 0.55, y - size * 0.95, size * 0.13)
}

function drawChili(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: { light: number; body: number; dark: number; accent: number },
): void {
  const body = [
    { x: -size * 0.32, y: -size * 0.5, r: size * 0.34 },
    { x: size * 0.05, y: -size * 0.2, r: size * 0.38 },
    { x: size * 0.34, y: size * 0.22, r: size * 0.31 },
    { x: size * 0.32, y: size * 0.68, r: size * 0.23 },
    { x: size * 0.12, y: size * 1.02, r: size * 0.14 },
  ]

  for (const part of body) {
    graphics.fillStyle(snakeColors.art.ink, 1)
    graphics.fillCircle(x + part.x, y + part.y, part.r + Math.max(1, part.r * 0.18))
  }
  for (const part of body) {
    graphics.fillStyle(palette.body, 1)
    graphics.fillCircle(x + part.x, y + part.y, part.r)
  }
  graphics.fillStyle(palette.light, 0.55)
  graphics.fillCircle(x - size * 0.4, y - size * 0.58, size * 0.1)
  graphics.fillStyle(palette.light, 0.4)
  graphics.fillCircle(x + size * 0.02, y - size * 0.26, size * 0.08)

  graphics.lineStyle(Math.max(2, size * 0.14), snakeColors.art.ink, 1)
  graphics.lineBetween(x - size * 0.32, y - size * 0.5, x - size * 0.5, y - size * 1.05)
  graphics.lineStyle(Math.max(1.2, size * 0.09), palette.accent, 1)
  graphics.lineBetween(x - size * 0.32, y - size * 0.5, x - size * 0.5, y - size * 1.05)
  graphics.fillStyle(palette.accent, 1)
  graphics.fillEllipse(x - size * 0.78, y - size * 0.88, size * 0.58, size * 0.26)
}
