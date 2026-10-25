import { mixColor, type Theme, type Viewport } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import { drawLeaf } from './foliage'

/**
 * Scenery marks across the backdrop. Leaves and vines reuse the old confetti
 * scatter, with fewer and larger marks: the noise budget drops slightly, but
 * what is left belongs to the fruit habitat instead of a generic party.
 */
const FOLIAGE_COUNT = 14

/**
 * Shared cheerful backdrop for the menu and the game. Everything is drawn
 * procedurally so the game stays asset-free.
 */
export function drawBackdrop(
  graphics: Phaser.GameObjects.Graphics,
  viewport: Viewport,
  theme: Theme,
): void {
  const { width, height, insets } = viewport
  const bands = 30
  graphics.clear()

  for (let index = 0; index < bands; index += 1) {
    graphics.fillStyle(mixColor(theme.bg, theme.bgAlt, index / (bands - 1)), 1)
    graphics.fillRect(0, (index * height) / bands, width, height / bands + 1)
  }

  const sunX = width - insets.right - 150
  const sunY = insets.top + 112
  graphics.fillStyle(theme.accentWarm, 0.2)
  graphics.fillCircle(sunX, sunY, 108)
  graphics.fillStyle(theme.accentWarm, 0.85)
  graphics.fillCircle(sunX, sunY, 52)
  graphics.fillStyle(snakeColors.art.shine, 0.35)
  graphics.fillCircle(sunX - 14, sunY - 14, 16)

  for (let index = 0; index < 3; index += 1) {
    const x = width * (0.14 + index * 0.31)
    const y = insets.top + 90 + ((index * 97) % 120)
    drawCloud(graphics, x, y, 0.75 + (index % 3) * 0.18, 0.5)
  }

  const foliage = snakeColors.art.foliage
  const matter = [foliage.mid, foliage.deep, foliage.light] as const
  for (let index = 0; index < FOLIAGE_COUNT; index += 1) {
    const x = insets.left + (((index * 137) % 100) / 100) * (width - insets.left - insets.right)
    const y = insets.top + (((index * 71) % 100) / 100) * height * 0.82
    const color = matter[index % matter.length] ?? foliage.mid
    const alpha = color === foliage.light ? 0.16 : 0.22
    const angle = ((index * 53) % 360) * (Math.PI / 180)
    // Fewer, larger blades: a small blade at low alpha reads as a stray dash,
    // a large one reads as foliage without needing more contrast.
    const length = 20 + (index % 4) * 6

    if (index % 3 === 1) {
      // A shoot: two blades from one tail. Single blades alone read as dashes.
      const spread = 0.5 + (index % 3) * 0.08
      drawLeaf(graphics, {
        x,
        y,
        length: length * 0.72,
        width: length * 0.3,
        angle: angle - spread,
        color,
        alpha,
      })
      drawLeaf(graphics, {
        x,
        y,
        length,
        width: length * 0.4,
        angle: angle + spread,
        color,
        alpha,
      })
      continue
    }

    if (index % 3 === 0) {
      drawLeaf(graphics, {
        x,
        y,
        length: length * 0.62,
        width: length * 0.26,
        angle: angle - 0.5,
        color,
        alpha,
      })
    }
    drawLeaf(graphics, { x, y, length, width: length * 0.4, angle, color, alpha })
  }

  graphics.fillStyle(mixColor(theme.accentAlt, theme.highlight, 0.55), 1)
  graphics.fillEllipse(width * 0.18, height + 70, width * 0.95, 300)
  graphics.fillStyle(mixColor(theme.accentAlt, theme.highlight, 0.35), 1)
  graphics.fillEllipse(width * 0.86, height + 100, width * 0.82, 330)
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
