import { getServices } from '@mg/core'
import type Phaser from 'phaser'
import { snakeColors } from '../colors'
import type { FruitKind } from '../logic/types'
import { playCharmSpots, superFruitSpot } from './layout'
import { drawFruit, drawSuperFruit } from './snakeArt'

const CHARM_KINDS = [
  'apple',
  'melon',
  'lemon',
  'grape',
  'berry',
  'orange',
] as const satisfies readonly FruitKind[]

const BOB = 2
const BOB_MS = 1500
const SUPER_BOB = 3
const SUPER_BOB_MS = 1400
const SUPER_HALO = 1.9
const SUPER_SPARKLE_MS = 820

interface SuperSparkle {
  /** Offsets in fruit radii, relative to the super fruit centre. */
  readonly x: number
  readonly y: number
  readonly size: number
  readonly delay: number
}

const SUPER_SPARKLES: readonly SuperSparkle[] = [
  { x: -0.5, y: -1.85, size: 0.22, delay: 0 },
  { x: 1.08, y: -0.92, size: 0.15, delay: 260 },
  { x: 0.88, y: 1.18, size: 0.17, delay: 520 },
]

/**
 * Scattered fruit resting on a primary button. Used as `Button.decoration`, so
 * the art sits above the face but below the label and follows the button's
 * hover, press and alpha state.
 */
export function fruitDecoration(
  scene: Phaser.Scene,
  size: { readonly width: number; readonly height: number },
): Phaser.GameObjects.Container {
  const theme = getServices().theme
  const container = scene.add.container(0, 0)
  const tweenTargets: Phaser.GameObjects.GameObject[] = []

  playCharmSpots(size.width, size.height).forEach((spot, index) => {
    const kind = CHARM_KINDS[index]
    if (!kind) return
    const art = scene.add.graphics()
    drawFruit(art, 0, 0, spot.radius, kind, theme, 0)
    const fruit = scene.add.container(spot.x, spot.y, [art]).setAngle(spot.angle)
    container.add(fruit)
    tweenTargets.push(art)

    scene.tweens.add({
      targets: art,
      y: -BOB,
      duration: BOB_MS,
      delay: index * 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  })

  container.once('destroy', () => scene.tweens.killTweensOf(tweenTargets))
  return container
}

/**
 * A single gold super fruit on the right end of the rewarded action, previewing
 * what the ad unlocks. A pulsing halo and twinkling sparkles make the offer
 * readable at a glance without outshining the standard action above it.
 */
export function superFruitDecoration(
  scene: Phaser.Scene,
  size: { readonly width: number; readonly height: number },
): Phaser.GameObjects.Container {
  const theme = getServices().theme
  const spot = superFruitSpot(size.width, size.height)
  const gold = snakeColors.art.superFruit

  const halo = scene.add.graphics()
  halo.fillStyle(gold.body, 0.12)
  halo.fillCircle(0, 0, spot.radius * SUPER_HALO)
  halo.fillStyle(gold.body, 0.18)
  halo.fillCircle(0, 0, spot.radius * 1.45)
  halo.setPosition(spot.x, spot.y)

  const art = scene.add.graphics()
  drawSuperFruit(art, 0, 0, spot.radius, scene.time.now, theme)
  const fruit = scene.add.container(spot.x, spot.y, [art])

  const sparkleLayer = scene.add.container(spot.x, spot.y)
  const tweenTargets: Phaser.GameObjects.GameObject[] = [halo, fruit]
  for (const sparkle of SUPER_SPARKLES) {
    const glyph = scene.add.graphics()
    drawSparkle(glyph, 0, 0, sparkle.size * spot.radius)
    glyph.setPosition(sparkle.x * spot.radius, sparkle.y * spot.radius)
    sparkleLayer.add(glyph)
    tweenTargets.push(glyph)

    scene.tweens.add({
      targets: glyph,
      alpha: { from: 0.2, to: 1 },
      scale: { from: 0.72, to: 1.06 },
      duration: SUPER_SPARKLE_MS,
      delay: sparkle.delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  scene.tweens.add({
    targets: halo,
    alpha: { from: 0.55, to: 1 },
    scale: { from: 0.9, to: 1.08 },
    duration: SUPER_BOB_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  })
  scene.tweens.add({
    targets: fruit,
    y: spot.y - SUPER_BOB,
    scale: 1.08,
    duration: SUPER_BOB_MS,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  })

  return scene.add
    .container(0, 0, [halo, fruit, sparkleLayer])
    .once('destroy', () => scene.tweens.killTweensOf(tweenTargets))
}

function drawSparkle(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
): void {
  const waist = size * 0.26
  graphics.fillStyle(snakeColors.art.shine, 0.95)
  graphics.fillTriangle(x, y - size, x - waist, y, x + waist, y)
  graphics.fillTriangle(x, y + size, x - waist, y, x + waist, y)
  graphics.fillTriangle(x - size, y, x, y - waist, x, y + waist)
  graphics.fillTriangle(x + size, y, x, y - waist, x, y + waist)
}
