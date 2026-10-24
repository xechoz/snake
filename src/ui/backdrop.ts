import { mixColor, type Theme, type Viewport } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'

export interface BackdropOptions {
  sun?: boolean
  hills?: boolean
  confetti?: boolean
  clouds?: number
  hillAlpha?: number
}

/**
 * Shared cheerful backdrop for the menu and the game. Everything is drawn
 * procedurally so the game stays asset-free.
 */
export function drawBackdrop(
  graphics: Phaser.GameObjects.Graphics,
  viewport: Viewport,
  theme: Theme,
  options: BackdropOptions = {},
): void {
  const { width, height, insets } = viewport
  const bands = 30
  graphics.clear()

  for (let index = 0; index < bands; index += 1) {
    graphics.fillStyle(mixColor(theme.bg, theme.bgAlt, index / (bands - 1)), 1)
    graphics.fillRect(0, (index * height) / bands, width, height / bands + 1)
  }

  if (options.sun !== false) {
    const sunX = width - insets.right - 150
    const sunY = insets.top + 112
    graphics.fillStyle(theme.accentWarm, 0.2)
    graphics.fillCircle(sunX, sunY, 108)
    graphics.fillStyle(theme.accentWarm, 0.85)
    graphics.fillCircle(sunX, sunY, 52)
    graphics.fillStyle(snakeColors.art.shine, 0.35)
    graphics.fillCircle(sunX - 14, sunY - 14, 16)
  }

  const clouds = options.clouds ?? 3
  for (let index = 0; index < clouds; index += 1) {
    const x = width * (0.14 + index * 0.31)
    const y = insets.top + 90 + ((index * 97) % 120)
    drawCloud(graphics, x, y, 0.75 + (index % 3) * 0.18, 0.5)
  }

  if (options.confetti !== false) {
    const colors = snakeColors.art.confetti
    for (let index = 0; index < 26; index += 1) {
      const x = insets.left + (((index * 137) % 100) / 100) * (width - insets.left - insets.right)
      const y = insets.top + (((index * 71) % 100) / 100) * height * 0.82
      const size = 4 + (index % 4) * 2
      graphics.fillStyle(colors[index % colors.length] ?? theme.accent, 0.22)
      if (index % 3 === 0) graphics.fillCircle(x, y, size * 0.55)
      else graphics.fillRect(x, y, size, size)
    }
  }

  if (options.hills !== false) {
    const alpha = options.hillAlpha ?? 1
    graphics.fillStyle(mixColor(theme.accentAlt, theme.highlight, 0.55), alpha)
    graphics.fillEllipse(width * 0.18, height + 70, width * 0.95, 300)
    graphics.fillStyle(mixColor(theme.accentAlt, theme.highlight, 0.35), alpha)
    graphics.fillEllipse(width * 0.86, height + 100, width * 0.82, 330)
  }
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
