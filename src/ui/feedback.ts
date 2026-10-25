import { cssColor, type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { snakeColors } from '../colors'
import type { Cell, EffectKind, FruitKind, PowerUpKind } from '../logic/types'
import { type BoardMetrics, cellCenterX, cellCenterY, fruitColor } from './gameArt'

export function showEatFeedback(
  scene: Phaser.Scene,
  board: BoardMetrics,
  at: Cell,
  kind: FruitKind,
  points: number,
  theme: Theme,
): void {
  const x = cellCenterX(board, at.x)
  const y = cellCenterY(board, at.y)
  const color = fruitColor(kind)

  floatingBadge({
    scene,
    x,
    y,
    width: 68,
    border: color,
    borderAlpha: 0.9,
    label: `+${points}`,
    labelSize: 26,
    labelColor: theme.text,
    rise: 52,
    duration: 620,
    theme,
  })
  burst(scene, x, y, [color, theme.accent, theme.surface], 8, 22, 48, 420)
}

export function showPowerUpFeedback(
  scene: Phaser.Scene,
  board: BoardMetrics,
  at: Cell,
  kind: PowerUpKind,
  effect: EffectKind,
  label: string,
  theme: Theme,
): void {
  const x = cellCenterX(board, at.x)
  const y = cellCenterY(board, at.y)
  const color = snakeColors.art.effects[effect]
  const pickup = snakeColors.art.powerUps[kind]

  floatingBadge({
    scene,
    x,
    y,
    width: 104,
    border: color,
    borderAlpha: 1,
    label,
    labelSize: 24,
    labelColor: cssColor(color),
    rise: 58,
    duration: 700,
    theme,
  })
  burst(scene, x, y, [color, pickup.body, theme.surface], 10, 24, 52, 460)
}

export function showFeastFeedback(
  scene: Phaser.Scene,
  board: BoardMetrics,
  at: Cell,
  label: string,
  theme: Theme,
): void {
  const x = cellCenterX(board, at.x)
  const y = cellCenterY(board, at.y)
  const gold = snakeColors.art.superFruit.body

  floatingBadge({
    scene,
    x,
    y,
    width: 210,
    border: gold,
    borderAlpha: 1,
    label,
    labelSize: 30,
    labelColor: cssColor(snakeColors.art.superFruit.dark),
    rise: 78,
    duration: 900,
    theme,
  })
  burst(
    scene,
    x,
    y,
    [gold, snakeColors.art.superFruit.light, snakeColors.art.confetti[0] ?? gold],
    18,
    30,
    78,
    620,
  )
}

export function showFeastEndFeedback(
  scene: Phaser.Scene,
  board: BoardMetrics,
  label: string,
  theme: Theme,
): void {
  floatingBadge({
    scene,
    x: board.x + board.width / 2,
    y: board.y + board.width / 2,
    width: 190,
    border: theme.accentWarm,
    borderAlpha: 0.9,
    label,
    labelSize: 24,
    labelColor: theme.text,
    rise: 34,
    duration: 700,
    theme,
  })
}

export function flashDanger(scene: Phaser.Scene, theme: Theme): void {
  const width = scene.scale.width
  const height = scene.scale.height
  const overlay = scene.add
    .rectangle(width / 2, height / 2, width, height, theme.danger, 0.18)
    .setDepth(20)
  scene.tweens.add({
    targets: overlay,
    alpha: 0,
    duration: 320,
    onComplete: () => overlay.destroy(),
  })
}

interface BadgeOptions {
  scene: Phaser.Scene
  x: number
  y: number
  width: number
  border: number
  borderAlpha: number
  label: string
  labelSize: number
  labelColor: string
  rise: number
  duration: number
  theme: Theme
}

function floatingBadge({
  scene,
  x,
  y,
  width,
  border,
  borderAlpha,
  label,
  labelSize,
  labelColor,
  rise,
  duration,
  theme,
}: BadgeOptions): void {
  const badge = scene.add.container(x, y).setDepth(10)
  const background = scene.add.graphics()
  background.fillStyle(theme.shadow, 0.12)
  background.fillRoundedRect(-width / 2 + 2, -16, width, 40, 20)
  background.fillStyle(theme.surface, 1)
  background.fillRoundedRect(-width / 2, -20, width, 40, 20)
  background.lineStyle(2, border, borderAlpha)
  background.strokeRoundedRect(-width / 2 + 0.5, -19.5, width - 1, 39, 20)
  const text = scene.add
    .text(0, 0, label, textStyle(theme, labelSize, labelColor, true))
    .setOrigin(0.5)
  badge.add([background, text])
  scene.tweens.add({
    targets: badge,
    y: y - rise,
    alpha: 0,
    duration,
    ease: 'Quad.out',
    onComplete: () => badge.destroy(),
  })
}

function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colors: readonly number[],
  count: number,
  minDistance: number,
  maxDistance: number,
  duration: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const color = colors[index % colors.length] ?? colors[0] ?? 0xffffff
    const particle = scene.add.circle(x, y, 4, color).setDepth(9)
    const angle = (Math.PI * 2 * index) / count
    const distance = Phaser.Math.Between(minDistance, maxDistance)
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: 0.4,
      duration,
      ease: 'Quad.out',
      onComplete: () => particle.destroy(),
    })
  }
}
