import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import { snakeColors } from '../colors'
import type { Point } from './layout'

const EFFECT_DEPTH = 1100
const CROWN_DEPTH = 1200
const CONFETTI_NORMAL = 24
const CONFETTI_RICH = 46
const FIREWORK_PARTICLES = 18

export interface GameOverEffectOptions {
  /** New best or a win: denser confetti and all four bursts in gold. */
  readonly rich: boolean
  readonly bursts: readonly Point[]
}

export function playGameOverEffects(
  scene: Phaser.Scene,
  { rich, bursts }: GameOverEffectOptions,
): void {
  const palette = rich ? richPalette() : snakeColors.art.confetti
  playConfetti(scene, rich ? CONFETTI_RICH : CONFETTI_NORMAL, palette)

  const selected = rich ? bursts : bursts.slice(0, 2)
  selected.forEach((burst, index) => {
    playFirework(scene, burst, palette, 160 + index * 220)
  })
}

export interface CrownOptions {
  readonly x: number
  readonly y: number
  readonly size: number
  readonly theme: Theme
}

/** Golden record crown. Caller owns the container and destroys it with the modal. */
export function spawnCrown(
  scene: Phaser.Scene,
  { x, y, size, theme }: CrownOptions,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(CROWN_DEPTH)
  const badge = scene.add.graphics()
  const art = scene.add.graphics()
  const sparkles = scene.add.graphics()

  drawCrownBadge(badge, size, theme)
  drawCrownArt(art, size)
  drawCrownSparkles(sparkles, size)
  container.add([badge, art, sparkles])
  container.setAlpha(0).setScale(0.4)

  scene.tweens.add({
    targets: container,
    alpha: 1,
    scale: 1,
    duration: 360,
    delay: 160,
    ease: 'Back.out',
  })
  scene.tweens.add({
    targets: container,
    y: y - 5,
    duration: 1400,
    delay: 520,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  })
  scene.tweens.add({
    targets: art,
    angle: { from: -3, to: 3 },
    duration: 1800,
    delay: 500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  })
  scene.tweens.add({
    targets: sparkles,
    alpha: { from: 0.35, to: 1 },
    duration: 900,
    delay: 500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  })

  const tweenTargets = [container, art, sparkles]
  container.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.tweens.killTweensOf(tweenTargets)
  })

  return container
}

function richPalette(): readonly number[] {
  const gold = snakeColors.art.superFruit
  return [gold.body, gold.light, gold.glow, ...snakeColors.art.confetti]
}

function playConfetti(scene: Phaser.Scene, count: number, colors: readonly number[]): void {
  const width = scene.scale.width
  const height = scene.scale.height

  for (let index = 0; index < count; index += 1) {
    const x = Phaser.Math.Between(20, width - 20)
    const piece = scene.add
      .rectangle(
        x,
        Phaser.Math.Between(-120, -10),
        Phaser.Math.Between(7, 13),
        Phaser.Math.Between(10, 18),
        colors[index % colors.length] ?? 0xffffff,
      )
      .setDepth(EFFECT_DEPTH)
      .setAngle(Phaser.Math.Between(0, 360))

    scene.tweens.add({
      targets: piece,
      x: x + Phaser.Math.Between(-48, 48),
      y: height + 40,
      angle: piece.angle + Phaser.Math.Between(180, 540),
      alpha: { from: 1, to: 0.2 },
      duration: Phaser.Math.Between(1400, 2600),
      delay: Phaser.Math.Between(0, 420),
      ease: 'Quad.in',
      onComplete: () => piece.destroy(),
    })
  }
}

function playFirework(
  scene: Phaser.Scene,
  origin: Point,
  colors: readonly number[],
  delay: number,
): void {
  const x = Phaser.Math.Clamp(origin.x, 24, scene.scale.width - 24)
  const y = Phaser.Math.Clamp(origin.y, 24, scene.scale.height - 24)
  const startY = Math.min(scene.scale.height - 16, y + 70)
  const rocket = scene.add.circle(x, startY, 4, colors[0] ?? 0xffffff).setDepth(EFFECT_DEPTH)

  scene.tweens.add({
    targets: rocket,
    y,
    duration: 240,
    delay,
    ease: 'Quad.out',
    onComplete: () => {
      rocket.destroy()
      explode(scene, { x, y }, colors)
    },
  })
}

function explode(scene: Phaser.Scene, origin: Point, colors: readonly number[]): void {
  const flash = scene.add
    .circle(origin.x, origin.y, 8, colors[1] ?? 0xffffff, 0.55)
    .setDepth(EFFECT_DEPTH)
  scene.tweens.add({
    targets: flash,
    scale: 3.2,
    alpha: 0,
    duration: 260,
    ease: 'Quad.out',
    onComplete: () => flash.destroy(),
  })

  for (let index = 0; index < FIREWORK_PARTICLES; index += 1) {
    const color = colors[index % colors.length] ?? 0xffffff
    const angle = (Math.PI * 2 * index) / FIREWORK_PARTICLES + Phaser.Math.FloatBetween(-0.1, 0.1)
    const distance = Phaser.Math.Between(46, 110)
    const particle = scene.add
      .circle(origin.x, origin.y, Phaser.Math.FloatBetween(2.4, 4.6), color)
      .setDepth(EFFECT_DEPTH)

    scene.tweens.add({
      targets: particle,
      x: origin.x + Math.cos(angle) * distance,
      y: origin.y + Math.sin(angle) * distance + Phaser.Math.Between(20, 60),
      alpha: 0,
      scale: 0.3,
      duration: Phaser.Math.Between(620, 900),
      ease: 'Quad.out',
      onComplete: () => particle.destroy(),
    })
  }
}

function drawCrownBadge(graphics: Phaser.GameObjects.Graphics, size: number, theme: Theme): void {
  const gold = snakeColors.art.superFruit
  const radius = size * 0.62

  graphics.fillStyle(theme.shadow, 0.14)
  graphics.fillCircle(0, size * 0.07, radius)
  graphics.fillStyle(theme.surface, 1)
  graphics.fillCircle(0, 0, radius)
  graphics.lineStyle(Math.max(2, size * 0.045), gold.body, 1)
  graphics.strokeCircle(0, 0, radius - 1)
}

function drawCrownArt(graphics: Phaser.GameObjects.Graphics, size: number): void {
  const gold = snakeColors.art.superFruit
  const ink = snakeColors.art.ink
  const s = size * 0.58
  const points = [
    new Phaser.Math.Vector2(-s * 0.5, s * 0.34),
    new Phaser.Math.Vector2(-s * 0.46, -s * 0.3),
    new Phaser.Math.Vector2(-s * 0.18, s * 0.04),
    new Phaser.Math.Vector2(0, -s * 0.5),
    new Phaser.Math.Vector2(s * 0.18, s * 0.04),
    new Phaser.Math.Vector2(s * 0.46, -s * 0.3),
    new Phaser.Math.Vector2(s * 0.5, s * 0.34),
  ]

  graphics.fillStyle(gold.body, 1)
  graphics.fillPoints(points, true)
  graphics.lineStyle(Math.max(2, size * 0.035), ink, 1)
  graphics.strokePoints(points, true)

  graphics.fillStyle(gold.dark, 1)
  graphics.fillRoundedRect(-s * 0.52, s * 0.2, s * 1.04, s * 0.24, s * 0.08)
  graphics.lineStyle(Math.max(2, size * 0.03), ink, 1)
  graphics.strokeRoundedRect(-s * 0.52, s * 0.2, s * 1.04, s * 0.24, s * 0.08)

  for (const [tx, ty] of [
    [-s * 0.46, -s * 0.3],
    [0, -s * 0.5],
    [s * 0.46, -s * 0.3],
  ] as const) {
    graphics.fillStyle(gold.light, 1)
    graphics.fillCircle(tx, ty, s * 0.08)
  }

  const jewels = [snakeColors.art.tongue, snakeColors.art.snakeHead, snakeColors.art.leaf] as const
  jewels.forEach((color, index) => {
    graphics.fillStyle(color, 1)
    graphics.fillCircle((index - 1) * s * 0.26, s * 0.32, s * 0.055)
  })

  graphics.fillStyle(snakeColors.art.shine, 0.7)
  graphics.fillCircle(-s * 0.22, -s * 0.12, s * 0.05)
}

function drawCrownSparkles(graphics: Phaser.GameObjects.Graphics, size: number): void {
  const shine = snakeColors.art.shine
  for (const [x, y, radius] of [
    [-size * 0.62, -size * 0.36, size * 0.055],
    [size * 0.6, -size * 0.22, size * 0.045],
    [size * 0.5, size * 0.52, size * 0.05],
    [-size * 0.56, size * 0.46, size * 0.04],
  ] as const) {
    graphics.fillStyle(shine, 0.9)
    graphics.fillCircle(x, y, radius)
  }
}
