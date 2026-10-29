import { mixColor, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import { FRUIT_KINDS } from '../logic/types'
import { drawLeaf } from './foliage'
import {
  type BirdSpot,
  type BranchSpot,
  type BushSpot,
  type FencePost,
  type FlowerSpot,
  type OrchardPlan,
  type RowTreeSpot,
  TREE_CANOPY_R,
  TREE_CANOPY_Y,
  TREE_TRUNK,
  type TreeSpot,
  type TuftSpot,
} from './scenery'

/**
 * Orchard scenery vocabulary. Fruit on the scenery deliberately skips the ink
 * outline, glow and pulse that edible board fruit uses, so a hanging apple can
 * never be mistaken for the next pickup.
 */

const TAU = Math.PI * 2

export function drawFruitTree(
  graphics: Phaser.GameObjects.Graphics,
  tree: TreeSpot,
  theme: Theme,
): void {
  const garden = snakeColors.art.garden
  const foliage = snakeColors.art.foliage
  const { x, y, scale, flip, tone } = tree
  const dir = flip ? -1 : 1
  const trunk = TREE_TRUNK * scale
  const baseWidth = 21 * scale
  const topWidth = 10 * scale

  graphics.fillStyle(theme.shadow, 0.16)
  graphics.fillEllipse(x, y + 3 * scale, 126 * scale, 26 * scale)

  graphics.fillStyle(garden.barkDark, 1)
  graphics.fillTriangle(
    x - baseWidth / 2,
    y,
    x + baseWidth / 2,
    y,
    x + (dir * topWidth) / 2,
    y - trunk,
  )
  graphics.fillStyle(garden.bark, 1)
  graphics.fillTriangle(
    x - baseWidth / 2,
    y,
    x - (dir * topWidth) / 2,
    y - trunk,
    x + (dir * topWidth) / 2,
    y - trunk,
  )
  graphics.fillStyle(garden.barkLight, 0.55)
  graphics.fillTriangle(
    x - baseWidth * 0.2,
    y - 3 * scale,
    x - dir * topWidth * 0.16,
    y - trunk + 10 * scale,
    x + dir * topWidth * 0.12,
    y - trunk + 10 * scale,
  )

  graphics.lineStyle(6 * scale, garden.bark, 1)
  graphics.lineBetween(x, y - trunk * 0.62, x - dir * 34 * scale, y - trunk * 1.02)
  graphics.lineBetween(x, y - trunk * 0.72, x + dir * 30 * scale, y - trunk * 1.08)
  graphics.lineStyle(3 * scale, garden.barkLight, 0.5)
  graphics.lineBetween(x, y - trunk * 0.66, x - dir * 26 * scale, y - trunk * 0.98)

  const canopyY = y - TREE_CANOPY_Y * scale
  const radius = TREE_CANOPY_R * scale
  const mid = mixColor(foliage.mid, foliage.light, 0.12 + tone * 0.35)
  const clusters = [
    { dx: 0, dy: 0, r: 1 },
    { dx: -0.66, dy: 0.18, r: 0.74 },
    { dx: 0.66, dy: 0.16, r: 0.76 },
    { dx: -0.34, dy: -0.46, r: 0.68 },
    { dx: 0.38, dy: -0.5, r: 0.62 },
    { dx: 0, dy: 0.38, r: 0.68 },
  ]

  for (const cluster of clusters) {
    graphics.fillStyle(foliage.deep, 0.9)
    graphics.fillCircle(
      x + dir * cluster.dx * radius + 3 * scale,
      canopyY + cluster.dy * radius + 5 * scale,
      cluster.r * radius,
    )
  }
  for (const cluster of clusters) {
    graphics.fillStyle(mid, 1)
    graphics.fillCircle(
      x + dir * cluster.dx * radius,
      canopyY + cluster.dy * radius,
      cluster.r * radius * 0.9,
    )
  }
  for (const cluster of clusters.slice(0, 4)) {
    graphics.fillStyle(foliage.light, 0.34)
    graphics.fillCircle(
      x + dir * cluster.dx * radius - 9 * scale,
      canopyY + cluster.dy * radius - 10 * scale,
      cluster.r * radius * 0.46,
    )
  }

  const fruitSpots = [
    { dx: -0.5, dy: 0.22 },
    { dx: 0.16, dy: -0.32 },
    { dx: 0.58, dy: 0.22 },
    { dx: -0.12, dy: 0.48 },
    { dx: -0.32, dy: -0.58 },
    { dx: 0.34, dy: 0.52 },
  ]
  tree.fruits.forEach((index, fruit) => {
    const spot = fruitSpots[fruit % fruitSpots.length]
    if (!spot) return
    const kind = FRUIT_KINDS[index % FRUIT_KINDS.length] ?? 'apple'
    const palette = snakeColors.art.fruits[kind]
    drawHangingFruit(
      graphics,
      x + dir * spot.dx * radius,
      canopyY + spot.dy * radius,
      8.4 * scale,
      palette.body,
      palette.light,
    )
  })
}

function drawHangingFruit(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  body: number,
  light: number,
): void {
  const foliage = snakeColors.art.foliage
  graphics.lineStyle(Math.max(1, radius * 0.16), foliage.deep, 0.75)
  graphics.lineBetween(x, y - radius * 2.1, x, y - radius * 0.86)
  graphics.fillStyle(body, 0.96)
  graphics.fillCircle(x, y, radius)
  graphics.fillStyle(light, 0.7)
  graphics.fillCircle(x - radius * 0.3, y - radius * 0.32, radius * 0.3)
  graphics.fillStyle(foliage.mid, 0.9)
  graphics.fillEllipse(x + radius * 0.62, y - radius * 1.7, radius * 0.86, radius * 0.36)
}

export function drawBush(
  graphics: Phaser.GameObjects.Graphics,
  bush: BushSpot,
  theme: Theme,
): void {
  const foliage = snakeColors.art.foliage
  const { x, y, scale, flip, berries } = bush
  const radius = 58 * scale
  const dir = flip ? -1 : 1

  graphics.fillStyle(theme.shadow, 0.13)
  graphics.fillEllipse(x, y + 2 * scale, radius * 2.3, 20 * scale)

  graphics.fillStyle(foliage.deep, 0.95)
  graphics.fillCircle(x, y - radius * 0.18 + 4 * scale, radius)
  graphics.fillCircle(x - dir * radius * 0.52, y - radius * 0.02, radius * 0.64)
  graphics.fillCircle(x + dir * radius * 0.48, y - radius * 0.08, radius * 0.6)

  graphics.fillStyle(foliage.mid, 1)
  graphics.fillCircle(x, y - radius * 0.26, radius * 0.88)
  graphics.fillCircle(x - dir * radius * 0.52, y - radius * 0.1, radius * 0.56)
  graphics.fillCircle(x + dir * radius * 0.46, y - radius * 0.16, radius * 0.52)

  graphics.fillStyle(foliage.light, 0.32)
  graphics.fillCircle(x - dir * radius * 0.3, y - radius * 0.56, radius * 0.32)

  if (!berries) return
  const colors = [
    snakeColors.art.fruits.apple.body,
    snakeColors.art.fruits.orange.body,
    snakeColors.art.fruits.grape.body,
  ]
  const spots = [
    { dx: -0.42, dy: -0.28 },
    { dx: 0.22, dy: -0.48 },
    { dx: 0.5, dy: 0.02 },
    { dx: -0.05, dy: 0.1 },
  ]
  spots.forEach((spot, index) => {
    const color = colors[index % colors.length] ?? colors[0]
    if (color === undefined) return
    graphics.fillStyle(color, 0.95)
    graphics.fillCircle(x + dir * spot.dx * radius, y + spot.dy * radius, radius * 0.11)
    graphics.fillStyle(snakeColors.art.shine, 0.5)
    graphics.fillCircle(
      x + dir * spot.dx * radius - radius * 0.03,
      y + spot.dy * radius - radius * 0.03,
      radius * 0.035,
    )
  })
}

export function drawDistantOrchard(
  graphics: Phaser.GameObjects.Graphics,
  rows: readonly RowTreeSpot[],
  theme: Theme,
): void {
  const foliage = snakeColors.art.foliage
  const canopy = mixColor(foliage.deep, theme.bg, 0.32)
  const fruit = snakeColors.art.fruits.apple.body

  for (const row of rows) {
    const { x, y, scale } = row
    graphics.fillStyle(theme.shadow, 0.1)
    graphics.fillEllipse(x, y + 3 * scale, 26 * scale, 6 * scale)
    graphics.lineStyle(Math.max(1, 2 * scale), canopy, 0.5)
    graphics.lineBetween(x, y, x, y - 12 * scale)
    graphics.fillStyle(canopy, 0.5)
    graphics.fillCircle(x, y - 18 * scale, 9.5 * scale)
    graphics.fillCircle(x - 6 * scale, y - 15 * scale, 6.4 * scale)
    graphics.fillCircle(x + 6.2 * scale, y - 15.4 * scale, 6 * scale)
    if (Math.round(x) % 3 === 0) {
      graphics.fillStyle(fruit, 0.42)
      graphics.fillCircle(x + 2.4 * scale, y - 17 * scale, 2.1 * scale)
    }
  }
}

export function drawFence(
  graphics: Phaser.GameObjects.Graphics,
  fence: NonNullable<OrchardPlan['fence']>,
  scale: number,
  theme: Theme,
): void {
  const { posts, step } = fence
  const height = 36 * scale
  const width = 12 * scale

  for (let index = 1; index < posts.length; index += 1) {
    const previous = posts[index - 1]
    const current = posts[index]
    if (!previous || !current) continue
    const dx = current.x - previous.x
    if (dx > step * 1.45) continue
    graphics.fillStyle(theme.surfaceAlt, 0.92)
    graphics.fillRoundedRect(previous.x, current.y - height * 0.66, dx, 5 * scale, 2.5 * scale)
    graphics.fillStyle(theme.surface, 0.95)
    graphics.fillRoundedRect(previous.x, current.y - height * 0.34, dx, 4.4 * scale, 2.2 * scale)
  }

  for (const post of posts) {
    drawFencePost(graphics, post, width, height, theme)
  }
}

function drawFencePost(
  graphics: Phaser.GameObjects.Graphics,
  post: FencePost,
  width: number,
  height: number,
  theme: Theme,
): void {
  graphics.fillStyle(theme.shadow, 0.14)
  graphics.fillRoundedRect(post.x - width / 2 + 1.5, post.y - height + 3, width, height, 4)
  graphics.fillStyle(theme.surface, 1)
  graphics.fillRoundedRect(post.x - width / 2, post.y - height, width, height, 4)
  graphics.fillStyle(theme.surfaceAlt, 1)
  graphics.fillTriangle(
    post.x - width / 2 - 1,
    post.y - height,
    post.x + width / 2 + 1,
    post.y - height,
    post.x,
    post.y - height - width * 0.9,
  )
  graphics.fillStyle(theme.borderSoft, 0.55)
  graphics.fillRect(post.x - width * 0.18, post.y - height + 4, width * 0.36, height - 8)
}

export function drawTuft(graphics: Phaser.GameObjects.Graphics, tuft: TuftSpot): void {
  const foliage = snakeColors.art.foliage
  const baseAngle = -Math.PI / 2 + tuft.angle
  const tone = mixColor(foliage.mid, foliage.deep, 0.35)
  for (let index = 0; index < 3; index += 1) {
    drawLeaf(graphics, {
      x: tuft.x,
      y: tuft.y,
      length: (19 + index * 6) * tuft.scale,
      width: 5.2 * tuft.scale,
      angle: baseAngle + (index - 1) * 0.34,
      color: index === 1 ? foliage.mid : tone,
      alpha: 0.5,
    })
  }
}

export function drawBackdropFlower(
  graphics: Phaser.GameObjects.Graphics,
  flower: FlowerSpot,
): void {
  const palette = [
    snakeColors.art.fruits.apple.body,
    snakeColors.art.fruits.orange.body,
    snakeColors.art.fruits.lemon.body,
    snakeColors.art.fruits.grape.body,
  ]
  const color = palette[Math.floor(flower.tone * palette.length) % palette.length] ?? palette[0]
  if (color === undefined) return
  drawTinyFlower(graphics, flower.x, flower.y, 8 * flower.scale, color)
}

export function drawBird(
  graphics: Phaser.GameObjects.Graphics,
  bird: BirdSpot,
  theme: Theme,
): void {
  const size = 9 * bird.scale
  const dir = bird.flip ? -1 : 1
  graphics.lineStyle(Math.max(1.4, 2.4 * bird.scale), theme.ink, 0.3)
  graphics.beginPath()
  graphics.moveTo(bird.x - size, bird.y)
  graphics.lineTo(bird.x - size * 0.45, bird.y - size * 0.52)
  graphics.lineTo(bird.x, bird.y)
  graphics.lineTo(bird.x + size * 0.45, bird.y - size * 0.52)
  graphics.lineTo(bird.x + size, bird.y)
  graphics.strokePath()
  // A tiny offset stroke reads as the far wing on lighter backgrounds.
  graphics.lineStyle(Math.max(1, 1.6 * bird.scale), theme.ink, 0.16)
  graphics.lineBetween(bird.x + dir * size * 0.2, bird.y + 2, bird.x + dir * size, bird.y + 3)
}

export function drawBranch(graphics: Phaser.GameObjects.Graphics, branch: BranchSpot): void {
  const garden = snakeColors.art.garden
  const foliage = snakeColors.art.foliage
  const dir = branch.flip ? -1 : 1
  const scale = branch.width / 250
  const points = [0, 0.28, 0.56, 0.8, 1].map((t) => ({
    x: branch.x + dir * branch.width * t,
    y: branch.y + branch.height * (0.24 + t * 0.5 - 0.2 * t * t),
  }))
  const widths = [12, 10, 8, 5]

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    if (!from || !to) continue
    graphics.lineStyle(widths[index - 1] ?? 5, garden.bark, 1)
    graphics.lineBetween(from.x, from.y, to.x, to.y)
    graphics.lineStyle(((widths[index - 1] ?? 5) * 0.36) | 0, garden.barkLight, 0.55)
    graphics.lineBetween(from.x, from.y - 2, to.x, to.y - 2)
  }

  const leafSpots = [1, 2, 3, 4]
  for (const index of leafSpots) {
    const point = points[index]
    if (!point) continue
    const sway = index % 2 === 0 ? 1 : -1
    for (let leaf = 0; leaf < 2; leaf += 1) {
      drawLeaf(graphics, {
        x: point.x,
        y: point.y,
        length: (30 - leaf * 9) * scale,
        width: (11 - leaf * 2.6) * scale,
        angle: Math.PI * 0.5 + sway * (0.55 + leaf * 0.32) + dir * 0.24,
        color: leaf === 0 ? foliage.mid : foliage.deep,
        alpha: leaf === 0 ? 0.82 : 0.62,
      })
    }
  }

  const fruitSpots = [
    { point: 1, drape: 12, kind: 'apple' as const },
    { point: 2, drape: 18, kind: 'orange' as const },
    { point: 3, drape: 13, kind: 'grape' as const },
  ]
  for (const spot of fruitSpots) {
    const point = points[spot.point]
    if (!point) continue
    const palette = snakeColors.art.fruits[spot.kind]
    drawHangingFruit(
      graphics,
      point.x + dir * 6 * scale,
      point.y + (spot.drape + 14) * scale,
      8 * scale,
      palette.body,
      palette.light,
    )
  }

  // A few far leaves frame the top edge with a lighter, hazier tone.
  for (let index = 0; index < 5; index += 1) {
    const point = points[index % points.length]
    if (!point) continue
    drawLeaf(graphics, {
      x: point.x - dir * (8 + index * 4) * scale,
      y: point.y + (10 + index * 5) * scale,
      length: (16 + (index % 3) * 5) * scale,
      width: 6 * scale,
      angle: Math.PI * 0.5 - dir * (0.9 + (index % 4) * 0.18),
      color: foliage.light,
      alpha: 0.28,
    })
  }
}

export function drawMeadowGround(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  theme: Theme,
): void {
  const foliage = snakeColors.art.foliage
  graphics.fillStyle(mixColor(foliage.mid, theme.bgAlt, 0.42), 1)
  graphics.fillEllipse(width * 0.18, height + 70, width * 0.95, 300)
  graphics.fillStyle(mixColor(foliage.light, theme.bgAlt, 0.42), 1)
  graphics.fillEllipse(width * 0.86, height + 100, width * 0.82, 330)
  graphics.fillStyle(mixColor(foliage.deep, theme.bg, 0.55), 0.55)
  graphics.fillEllipse(width * 0.52, height + 138, width * 1.1, 190)
}

/** Five-petal flower head with a stem, used only for backdrop dressings. */
export function drawTinyFlower(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
): void {
  graphics.lineStyle(Math.max(1, radius * 0.16), snakeColors.art.foliage.deep, 0.55)
  graphics.lineBetween(x, y, x, y + radius * 1.6)
  for (let index = 0; index < 5; index += 1) {
    const angle = (TAU * index) / 5 - Math.PI / 2
    graphics.fillStyle(color, 0.85)
    graphics.fillCircle(
      x + Math.cos(angle) * radius * 0.62,
      y + Math.sin(angle) * radius * 0.62,
      radius * 0.46,
    )
  }
  graphics.fillStyle(snakeColors.art.garden.gold, 0.9)
  graphics.fillCircle(x, y, radius * 0.3)
}
