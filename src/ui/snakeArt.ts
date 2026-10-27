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
  const curve: CubicCurve = {
    x0: -0.8,
    y0: -0.5,
    x1: -0.56,
    y1: 0.74,
    x2: 0.56,
    y2: 0.74,
    x3: 0.8,
    y3: -0.5,
  }

  const crescent = (thickness: number): ArtPoint[] => {
    const points: ArtPoint[] = []
    const inner: ArtPoint[] = []
    for (let index = 0; index <= BANANA_SAMPLES; index += 1) {
      const t = index / BANANA_SAMPLES
      const { at, nx, ny } = curveFrame(curve, t)
      const half = thickness * Math.sin(Math.PI * t) ** 0.45

      points.push({ x: x + at.x * size + nx * half * size, y: y + at.y * size + ny * half * size })
      inner.push({ x: x + at.x * size - nx * half * size, y: y + at.y * size - ny * half * size })
    }
    return [...points, ...inner.reverse()]
  }

  fillPolygon(graphics, crescent(0.3 + ink / size), theme.ink)
  fillPolygon(graphics, crescent(0.3), palette.body)

  const stemX = x + curve.x0 * size
  const stemY = y + curve.y0 * size
  graphics.lineStyle(Math.max(2, size * 0.17), theme.ink, 1)
  graphics.lineBetween(stemX, stemY, stemX - size * 0.09, stemY - size * 0.2)
  graphics.lineStyle(Math.max(1.2, size * 0.08), palette.dark, 1)
  graphics.lineBetween(stemX, stemY, stemX - size * 0.09, stemY - size * 0.2)
  graphics.fillStyle(palette.dark, 1)
  graphics.fillCircle(stemX - size * 0.09, stemY - size * 0.2, size * 0.06)
  graphics.fillStyle(palette.dark, 1)
  graphics.fillCircle(x + curve.x3 * size, y + curve.y3 * size, size * 0.06)

  graphics.lineStyle(Math.max(1, size * 0.08), palette.light, 0.55)
  const shine: ArtPoint[] = []
  for (let index = 0; index <= 12; index += 1) {
    const t = 0.2 + (index / 12) * 0.6
    const { at, nx, ny } = curveFrame(curve, t)
    const half = 0.3 * size * Math.sin(Math.PI * t) ** 0.45 * 0.45
    shine.push({ x: x + at.x * size + nx * half, y: y + at.y * size + ny * half })
  }
  strokePolyline(graphics, shine)
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
  const cx = x
  const cy = y - size * 0.08
  const radius = size
  const chordY = y - size * 0.46
  const theta = Math.asin((chordY - cy) / radius)
  const band = size * 0.22

  const arc = (arcRadius: (u: number) => number, start: number, end: number): ArtPoint[] => {
    const points: ArtPoint[] = []
    for (let index = 0; index <= 24; index += 1) {
      const u = index / 24
      const angle = start + (end - start) * u
      const r = arcRadius(u)
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      })
    }
    return points
  }

  const cornerX = Math.cos(theta) * radius
  const wedge = [
    { x: cx - cornerX, y: chordY },
    ...arc(() => radius, Math.PI - theta, theta),
    { x: cx + cornerX, y: chordY },
  ]
  fillPolygon(graphics, inflatePolygon(wedge, ink), theme.ink)
  fillPolygon(graphics, wedge, palette.body)

  const rind = [
    ...arc(() => radius, Math.PI - theta, theta),
    ...arc(
      (u) => radius - band * (0.12 + 0.88 * Math.sin(Math.PI * u) ** 0.45),
      Math.PI - theta,
      theta,
    ).reverse(),
  ]
  fillPolygon(graphics, rind, palette.leaf)

  graphics.fillStyle(palette.light, 0.35)
  graphics.fillEllipse(x - size * 0.34, y - size * 0.2, size * 0.42, size * 0.16)

  graphics.fillStyle(theme.ink, 0.85)
  for (const seed of [
    { x: -0.5, y: -0.06 },
    { x: -0.16, y: -0.16 },
    { x: 0.3, y: -0.12 },
    { x: -0.3, y: 0.3 },
    { x: 0.14, y: 0.4 },
  ]) {
    graphics.fillEllipse(
      x + seed.x * size,
      y + seed.y * size,
      Math.max(1, size * 0.09),
      Math.max(1.4, size * 0.14),
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
  const body = smoothClosed(
    [
      { x: 0, y: -0.62 },
      { x: 0.5, y: -0.58 },
      { x: 0.82, y: -0.3 },
      { x: 0.9, y: 0.05 },
      { x: 0.72, y: 0.44 },
      { x: 0.4, y: 0.78 },
      { x: 0, y: 1.04 },
      { x: -0.4, y: 0.78 },
      { x: -0.72, y: 0.44 },
      { x: -0.9, y: 0.05 },
      { x: -0.82, y: -0.3 },
      { x: -0.5, y: -0.58 },
    ].map((point) => ({ x: x + point.x * size, y: y + point.y * size })),
  )

  fillPolygon(graphics, inflatePolygon(body, ink), theme.ink)
  fillPolygon(graphics, body, palette.body)

  graphics.fillStyle(palette.light, 0.4)
  graphics.fillEllipse(x - size * 0.38, y - size * 0.26, size * 0.5, size * 0.34)
  graphics.fillStyle(snakeColors.art.shine, 0.8)
  graphics.fillCircle(x - size * 0.5, y - size * 0.34, size * 0.07)

  graphics.fillStyle(theme.accentWarm, 0.95)
  for (const seed of [
    { x: -0.4, y: 0.04 },
    { x: 0.02, y: -0.14 },
    { x: 0.44, y: 0.02 },
    { x: -0.24, y: 0.38 },
    { x: 0.24, y: 0.34 },
    { x: 0, y: 0.62 },
  ]) {
    graphics.fillEllipse(
      x + seed.x * size,
      y + seed.y * size,
      Math.max(1, size * 0.09),
      Math.max(1.3, size * 0.14),
    )
  }

  const baseY = y - size * 0.55
  graphics.lineStyle(Math.max(2, size * 0.16), theme.ink, 1)
  graphics.lineBetween(x, baseY, x + size * 0.05, y - size * 1.0)
  graphics.lineStyle(Math.max(1.2, size * 0.09), palette.leaf, 1)
  graphics.lineBetween(x, baseY, x + size * 0.05, y - size * 1.0)

  const sepals = [
    { x: -0.64, y: -0.84 },
    { x: -0.32, y: -0.92 },
    { x: 0, y: -0.96 },
    { x: 0.32, y: -0.92 },
    { x: 0.64, y: -0.84 },
  ]
  for (const tip of sepals) {
    const leaf = [
      { x: x - size * 0.13, y: baseY + size * 0.06 },
      { x: x + size * 0.13, y: baseY + size * 0.06 },
      { x: x + tip.x * size, y: y + tip.y * size },
    ]
    fillPolygon(graphics, inflatePolygon(leaf, ink), theme.ink)
    fillPolygon(graphics, leaf, palette.leaf)
  }
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
  const width = size * 1.5
  const height = size * 1.9
  const centerY = y + size * 0.56
  const halfW = width / 2
  const halfH = height / 2

  graphics.fillStyle(theme.ink, 1)
  graphics.fillEllipse(x, centerY, width + ink * 2, height + ink * 2)
  graphics.fillStyle(palette.body, 1)
  graphics.fillEllipse(x, centerY, width, height)

  for (let row = 0; row < 6; row += 1) {
    const localY = -halfH + ((row + 0.5) * height) / 6
    for (let column = -3; column <= 3; column += 1) {
      const localX = column * size * 0.33 + (row % 2 === 0 ? 0 : size * 0.165)
      const inside = (localX / halfW) ** 2 + (localY / halfH) ** 2
      if (inside > 0.8) continue
      const diamond = [
        { x: x + localX, y: centerY + localY - size * 0.13 },
        { x: x + localX + size * 0.16, y: centerY + localY },
        { x: x + localX, y: centerY + localY + size * 0.13 },
        { x: x + localX - size * 0.16, y: centerY + localY },
      ]
      fillPolygon(graphics, diamond, palette.dark, 0.38)
    }
  }

  graphics.fillStyle(palette.light, 0.18)
  graphics.fillEllipse(x - size * 0.36, y + size * 0.24, size * 0.26, size * 0.62)

  const leaves = [
    { baseX: -0.36, baseY: -0.26, tipX: -0.96, tipY: -1.0, width: 0.2, bend: -0.09 },
    { baseX: -0.2, baseY: -0.32, tipX: -0.5, tipY: -1.28, width: 0.19, bend: -0.05 },
    { baseX: 0, baseY: -0.34, tipX: 0.03, tipY: -1.4, width: 0.18, bend: 0.02 },
    { baseX: 0.2, baseY: -0.32, tipX: 0.5, tipY: -1.28, width: 0.19, bend: 0.05 },
    { baseX: 0.36, baseY: -0.26, tipX: 0.96, tipY: -1.0, width: 0.2, bend: 0.09 },
  ] as const

  const crowns = leaves.map((leaf) =>
    leafPolygon(
      { x: x + leaf.baseX * size, y: y + leaf.baseY * size },
      { x: x + leaf.tipX * size, y: y + leaf.tipY * size },
      leaf.width * size,
      leaf.bend * size,
    ),
  )

  for (const leaf of crowns) fillPolygon(graphics, inflatePolygon(leaf, ink), theme.ink)
  for (const [index, leaf] of crowns.entries()) {
    const source = leaves[index]
    fillPolygon(graphics, leaf, palette.leaf)
    if (!source) continue
    graphics.lineStyle(Math.max(1, size * 0.05), palette.light, 0.35)
    graphics.lineBetween(
      x + source.baseX * size,
      y + source.baseY * size,
      x + source.tipX * size,
      y + source.tipY * size,
    )
  }
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
  const ink = inkWidth(size)
  const curve: CubicCurve = {
    x0: -0.2,
    y0: -0.52,
    x1: 0.46,
    y1: -0.14,
    x2: 0.38,
    y2: 0.56,
    x3: -0.04,
    y3: 1.06,
  }
  const halfAt = (t: number): number => 0.32 * Math.sin(Math.PI * (0.26 + 0.74 * t)) ** 0.85

  const ribbon = (extra: number): ArtPoint[] => {
    const outer: ArtPoint[] = []
    const inner: ArtPoint[] = []
    for (let index = 0; index <= BANANA_SAMPLES; index += 1) {
      const t = index / BANANA_SAMPLES
      const { at, nx, ny } = curveFrame(curve, t)
      const half = halfAt(t) * size + extra
      outer.push({ x: x + at.x * size + nx * half, y: y + at.y * size + ny * half })
      inner.push({ x: x + at.x * size - nx * half, y: y + at.y * size - ny * half })
    }
    return [...outer, ...inner.reverse()]
  }

  const baseX = x + curve.x0 * size
  const baseY = y + curve.y0 * size
  const baseHalf = halfAt(0) * size

  fillPolygon(graphics, ribbon(ink), snakeColors.art.ink)
  graphics.fillStyle(snakeColors.art.ink, 1)
  graphics.fillCircle(baseX, baseY, baseHalf + ink)
  fillPolygon(graphics, ribbon(0), palette.body)
  graphics.fillStyle(palette.body, 1)
  graphics.fillCircle(baseX, baseY, baseHalf)

  const shine: ArtPoint[] = []
  for (let index = 0; index <= 9; index += 1) {
    const t = 0.1 + (0.3 * index) / 9
    const { at, nx, ny } = curveFrame(curve, t)
    const offset = halfAt(t) * size * 0.45
    shine.push({ x: x + at.x * size + nx * offset, y: y + at.y * size + ny * offset })
  }
  graphics.lineStyle(Math.max(1, size * 0.08), palette.light, 0.45)
  strokePolyline(graphics, shine)

  const stemX = baseX - size * 0.08
  const stemY = baseY - size * 0.38
  graphics.lineStyle(Math.max(2, size * 0.15), snakeColors.art.ink, 1)
  graphics.lineBetween(baseX, baseY, stemX, stemY)
  graphics.lineStyle(Math.max(1.2, size * 0.085), palette.accent, 1)
  graphics.lineBetween(baseX, baseY, stemX, stemY)

  const calyx = [
    { x: baseX - size * 0.42, y: baseY - size * 0.02, bend: size * 0.02 },
    { x: baseX + size * 0.4, y: baseY + size * 0.08, bend: -size * 0.02 },
  ]
  for (const tip of calyx) {
    const leaf = leafPolygon(
      { x: baseX - size * 0.04, y: baseY - size * 0.12 },
      { x: tip.x, y: tip.y },
      size * 0.1,
      tip.bend,
    )
    fillPolygon(graphics, inflatePolygon(leaf, Math.max(1, size * 0.05)), snakeColors.art.ink)
    fillPolygon(graphics, leaf, palette.accent)
  }
}

interface ArtPoint {
  x: number
  y: number
}

interface CubicCurve {
  x0: number
  y0: number
  x1: number
  y1: number
  x2: number
  y2: number
  x3: number
  y3: number
}

const BANANA_SAMPLES = 20

/** Single closed fill; the path API avoids allocating Phaser vectors per point. */
function fillPolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly ArtPoint[],
  color: number,
  alpha = 1,
): void {
  const first = points[0]
  if (!first) return
  graphics.fillStyle(color, alpha)
  graphics.beginPath()
  graphics.moveTo(first.x, first.y)
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y)
  graphics.closePath()
  graphics.fillPath()
}

function strokePolyline(graphics: Phaser.GameObjects.Graphics, points: readonly ArtPoint[]): void {
  const first = points[0]
  if (!first) return
  graphics.beginPath()
  graphics.moveTo(first.x, first.y)
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y)
  graphics.strokePath()
}

function cubicPoint(curve: CubicCurve, t: number): ArtPoint {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: curve.x0 * a + curve.x1 * b + curve.x2 * c + curve.x3 * d,
    y: curve.y0 * a + curve.y1 * b + curve.y2 * c + curve.y3 * d,
  }
}

/** Point, tangent and unit normal of a cubic at `t`, for offset ribbons. */
function curveFrame(curve: CubicCurve, t: number): { at: ArtPoint; nx: number; ny: number } {
  const at = cubicPoint(curve, t)
  const ahead = cubicPoint(curve, Math.min(1, t + 0.01))
  const behind = cubicPoint(curve, Math.max(0, t - 0.01))
  const length = Math.hypot(ahead.x - behind.x, ahead.y - behind.y) || 1
  return {
    at,
    nx: -(ahead.y - behind.y) / length,
    ny: (ahead.x - behind.x) / length,
  }
}

/** Catmull-Rom through the anchors as one closed silhouette, no visible corners. */
function smoothClosed(points: readonly ArtPoint[], samples = 6): ArtPoint[] {
  const result: ArtPoint[] = []
  const count = points.length
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index + count - 1) % count]
    const p1 = points[index]
    const p2 = points[(index + 1) % count]
    const p3 = points[(index + 2) % count]
    for (let step = 0; step < samples; step += 1) {
      const t = step / samples
      const t2 = t * t
      const t3 = t2 * t
      result.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  return result
}

/** Radial ink halo for convex silhouettes; cheaper and smoother than strokes. */
function inflatePolygon(points: readonly ArtPoint[], distance: number): ArtPoint[] {
  const center = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
    x: 0,
    y: 0,
  })
  const cx = center.x / points.length
  const cy = center.y / points.length
  return points.map((point) => {
    const dx = point.x - cx
    const dy = point.y - cy
    const length = Math.hypot(dx, dy) || 1
    return { x: point.x + (dx / length) * distance, y: point.y + (dy / length) * distance }
  })
}

/** Kite-shaped leaf, bowed sideways so a row of them reads as a crown. */
function leafPolygon(base: ArtPoint, tip: ArtPoint, width: number, bend: number): ArtPoint[] {
  const dx = tip.x - base.x
  const dy = tip.y - base.y
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length
  const ny = dx / length
  const shoulder = (side: number): ArtPoint => ({
    x: base.x + dx * 0.48 + nx * (side * width + bend),
    y: base.y + dy * 0.48 + ny * (side * width + bend),
  })
  return [base, shoulder(1), tip, shoulder(-1)]
}
