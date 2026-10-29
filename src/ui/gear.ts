import { getServices } from '@mg/core'
import Phaser from 'phaser'

/**
 * Gear glyph used by the menu's settings button. The shared icon set has no
 * settings mark, so the game draws one and reuses the button's hover/press
 * treatment as a decoration.
 */
export function gearDecoration(
  scene: Phaser.Scene,
  size: { readonly width: number; readonly height: number },
): Phaser.GameObjects.Graphics {
  const theme = getServices().theme
  const graphics = scene.add.graphics()
  drawGear(graphics, 0, 0, Math.min(size.width, size.height) * 0.27, theme.ink, theme.surface)
  return graphics
}

export function drawGear(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  holeColor: number,
): void {
  const teeth = 8
  const outer = radius
  const inner = radius * 0.64
  const points: Phaser.Math.Vector2[] = []

  for (let index = 0; index < teeth; index += 1) {
    const center = (index / teeth) * Math.PI * 2
    const step = (Math.PI * 2) / teeth
    const angles: readonly [number, number][] = [
      [center - step * 0.3, inner],
      [center - step * 0.16, outer],
      [center + step * 0.16, outer],
      [center + step * 0.3, inner],
    ]
    for (const [angle, r] of angles) {
      points.push(new Phaser.Math.Vector2(x + Math.cos(angle) * r, y + Math.sin(angle) * r))
    }
  }

  graphics.fillStyle(color, 0.92)
  graphics.fillPoints(points, true)
  graphics.fillStyle(holeColor, 1)
  graphics.fillCircle(x, y, radius * 0.3)
}
