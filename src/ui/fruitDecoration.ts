import { getServices } from '@mg/core'
import type Phaser from 'phaser'
import type { FruitKind } from '../logic/types'
import { playCharmSpots } from './layout'
import { drawFruit } from './snakeArt'

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

  playCharmSpots(size.width, size.height).forEach((spot, index) => {
    const kind = CHARM_KINDS[index]
    if (!kind) return
    const art = scene.add.graphics()
    drawFruit(art, 0, 0, spot.radius, kind, theme, 0)
    const fruit = scene.add.container(spot.x, spot.y, [art]).setAngle(spot.angle)
    container.add(fruit)

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

  return container
}
