import { mixColor, type Theme, type Viewport } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import {
  drawBackdropFlower,
  drawBird,
  drawBranch,
  drawBush,
  drawDistantOrchard,
  drawFence,
  drawFruitTree,
  drawMeadowGround,
  drawTuft,
} from './orchard'
import { type OrchardPlan, planOrchard, type SceneryDensity, type SceneryRect } from './scenery'

export interface BackdropOptions {
  /** UI rectangles the solid scenery must avoid: logo, CTA, HUD, board. */
  readonly quiet?: readonly SceneryRect[]
  readonly density?: SceneryDensity
}

/**
 * The garden sits inside a working orchard: sky and sun at the back, a distant
 * tree line, a fence and meadow at the bottom, fruit trees in the free margins
 * and an overhanging branch framing a top corner.
 *
 * Scenery is drawn from the quiet zones outwards, so the playfield and every
 * piece of UI stay readable. The returned plan lets the scene attach ambient
 * life (butterflies, petals) to the same spots.
 */
export function drawBackdrop(
  graphics: Phaser.GameObjects.Graphics,
  viewport: Viewport,
  theme: Theme,
  options: BackdropOptions = {},
): OrchardPlan {
  const { width, height, insets } = viewport
  const bands = 30
  graphics.clear()

  for (let index = 0; index < bands; index += 1) {
    graphics.fillStyle(mixColor(theme.bg, theme.bgAlt, index / (bands - 1)), 1)
    graphics.fillRect(0, (index * height) / bands, width, height / bands + 1)
  }

  const plan = planOrchard(viewport, options.quiet ?? [], options.density ?? 'game')
  const scale = plan.scale

  drawSun(graphics, viewport, theme, scale)
  for (let index = 0; index < 3; index += 1) {
    const x = width * (0.14 + index * 0.31)
    const y = insets.top + 90 + ((index * 97) % 120)
    drawCloud(graphics, x, y, 0.75 + (index % 3) * 0.18, 0.5)
  }
  for (const bird of plan.birds) drawBird(graphics, bird, theme)

  drawHills(graphics, viewport, theme)
  drawMeadowGround(graphics, width, height, theme)
  drawDistantOrchard(graphics, plan.rowTrees, theme)
  if (plan.fence) drawFence(graphics, plan.fence, scale, theme)
  for (const tree of plan.trees) drawFruitTree(graphics, tree, theme)
  for (const bush of plan.bushes) drawBush(graphics, bush, theme)
  for (const tuft of plan.tufts) drawTuft(graphics, tuft)
  for (const flower of plan.flowers) drawBackdropFlower(graphics, flower)
  if (plan.branch) drawBranch(graphics, plan.branch)

  return plan
}

function drawSun(
  graphics: Phaser.GameObjects.Graphics,
  viewport: Viewport,
  theme: Theme,
  scale: number,
): void {
  const { width, insets } = viewport
  const sunX = width - insets.right - 150
  const sunY = insets.top + 112
  const radius = 48 * scale

  graphics.fillStyle(theme.accentWarm, 0.08)
  graphics.fillCircle(sunX, sunY, radius * 3.1)
  graphics.fillStyle(theme.accentWarm, 0.14)
  graphics.fillCircle(sunX, sunY, radius * 2)
  graphics.fillStyle(theme.accentWarm, 0.9)
  graphics.fillCircle(sunX, sunY, radius)
  graphics.fillStyle(snakeColors.art.shine, 0.38)
  graphics.fillCircle(sunX - radius * 0.28, sunY - radius * 0.28, radius * 0.32)

  graphics.lineStyle(3, theme.accentWarm, 0.22)
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12 + 0.16
    const inner = radius * 1.4
    const outer = radius * (index % 2 === 0 ? 2.5 : 2)
    graphics.lineBetween(
      sunX + Math.cos(angle) * inner,
      sunY + Math.sin(angle) * inner,
      sunX + Math.cos(angle) * outer,
      sunY + Math.sin(angle) * outer,
    )
  }
}

function drawHills(graphics: Phaser.GameObjects.Graphics, viewport: Viewport, theme: Theme): void {
  const { width, height } = viewport
  const foliage = snakeColors.art.foliage
  const low = mixColor(foliage.mid, theme.bg, 0.58)
  const high = mixColor(foliage.deep, theme.bg, 0.66)

  graphics.fillStyle(high, 0.55)
  graphics.fillEllipse(width * 0.22, height * 0.63, width * 0.9, height * 0.5)
  graphics.fillStyle(low, 0.6)
  graphics.fillEllipse(width * 0.78, height * 0.68, width * 1.05, height * 0.46)
}

function drawCloud(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  alpha: number,
): void {
  graphics.fillStyle(snakeColors.art.cloud, alpha)
  graphics.fillRoundedRect(x - 74 * scale, y, 148 * scale, 34 * scale, 17 * scale)
  graphics.fillCircle(x - 44 * scale, y + 6 * scale, 26 * scale)
  graphics.fillCircle(x + 2 * scale, y - 8 * scale, 32 * scale)
  graphics.fillCircle(x + 44 * scale, y + 7 * scale, 24 * scale)
}
