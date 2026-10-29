import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import { snakeColors } from '../colors'
import type { OrchardPlan, Perch, SceneryDensity } from './scenery'

/**
 * Two butterflies and a handful of drifting petals. The layer is purely
 * decorative: it never takes input and sits below the board and the UI.
 *
 * Butterflies orbit the free-space perches from the orchard plan, so they stay
 * in the margins instead of crossing the playfield or the menu buttons.
 */
export class OrchardAmbience extends Phaser.GameObjects.Container {
  private readonly host: Phaser.Scene
  private readonly targets: Phaser.GameObjects.GameObject[] = []

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    plan: OrchardPlan,
    density: SceneryDensity = 'menu',
  ) {
    super(scene, 0, 0)
    this.host = scene
    scene.add.existing(this)

    const pool = plan.perches
    const perches =
      density === 'menu' && pool.length > 2
        ? [pool[0], pool[2]]
        : pool.slice(0, density === 'menu' ? 2 : 1)
    perches.forEach((perch, index) => {
      if (!perch) return
      this.addButterfly(perch, index, theme, plan.scale)
    })
    this.addPetals(density, theme)
  }

  override destroy(fromScene?: boolean): void {
    for (const target of this.targets) this.host.tweens.killTweensOf(target)
    this.targets.length = 0
    super.destroy(fromScene)
  }

  private addButterfly(perch: Perch, index: number, theme: Theme, planScale: number): void {
    const scale = Math.min(1.35, Math.max(0.85, planScale))
    const size = (10 + index * 2) * scale
    const wingColors = [
      snakeColors.art.fruits.orange.body,
      snakeColors.art.fruits.grape.body,
      snakeColors.art.fruits.apple.body,
    ]
    const wingColor = wingColors[index % wingColors.length] ?? theme.accentWarm

    const root = this.host.add.container(perch.x, perch.y)
    const bob = this.host.add.container(0, 0)
    const left = this.host.add.graphics()
    const right = this.host.add.graphics()
    const body = this.host.add.graphics()

    for (const [wing, dir] of [
      [left, -1],
      [right, 1],
    ] as const) {
      wing.fillStyle(wingColor, 0.94)
      wing.fillEllipse(dir * size * 0.52, 0, size * 0.86, size * 1.12)
      wing.fillStyle(theme.highlight, 0.34)
      wing.fillEllipse(dir * size * 0.62, -size * 0.22, size * 0.3, size * 0.42)
      wing.lineStyle(Math.max(1, size * 0.08), theme.ink, 0.28)
      wing.strokeEllipse(dir * size * 0.52, 0, size * 0.86, size * 1.12)
    }

    body.fillStyle(theme.ink, 0.82)
    body.fillRoundedRect(-size * 0.1, -size * 0.52, size * 0.2, size * 1.04, size * 0.1)
    body.lineStyle(Math.max(1, size * 0.07), theme.ink, 0.7)
    body.lineBetween(0, -size * 0.5, -size * 0.3, -size * 0.86)
    body.lineBetween(0, -size * 0.5, size * 0.3, -size * 0.86)

    bob.add([left, right, body])
    root.add(bob)
    this.add(root)

    this.targets.push(root, bob, left, right)

    for (const wing of [left, right]) {
      this.host.tweens.add({
        targets: wing,
        scaleX: 0.28,
        duration: 170 + index * 40,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
    }

    const driftX = (index % 2 === 0 ? 1 : -1) * (34 + perch.radius)
    const driftY = -24 - index * 12
    this.host.tweens.add({
      targets: root,
      x: perch.x + driftX,
      y: perch.y + driftY,
      duration: 4600 + index * 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.host.tweens.add({
      targets: bob,
      y: -6 - index * 2,
      duration: 1300 + index * 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  private addPetals(density: SceneryDensity, theme: Theme): void {
    const count = density === 'menu' ? 9 : 5
    const petalColors = [
      snakeColors.art.fruits.apple.light,
      snakeColors.art.garden.petal,
      snakeColors.art.fruits.peach.light,
      snakeColors.art.fruits.lemon.light,
    ]
    const width = this.host.cameras.main.width
    const height = this.host.cameras.main.height
    const baseX = width * 0.5

    for (let index = 0; index < count; index += 1) {
      const side = index % 2 === 0 ? -1 : 1
      const x = baseX + side * (width * 0.32 + (index % 3) * width * 0.06)
      const petal = this.host.add.ellipse(
        x,
        -24 - (index % 4) * 46,
        7 + (index % 3) * 2.2,
        4.4 + (index % 2) * 1.4,
        petalColors[index % petalColors.length] ?? theme.accentWarm,
        0.55,
      )
      petal.setAngle((index * 47) % 180)
      this.add(petal)
      this.targets.push(petal)

      this.host.tweens.add({
        targets: petal,
        y: height + 40,
        x: x + side * (18 + (index % 4) * 12),
        angle: petal.angle + 220 + (index % 3) * 90,
        alpha: { from: 0, to: 0.52 },
        duration: 9000 + (index % 5) * 1600,
        delay: index * 640,
        repeat: -1,
        ease: 'Sine.in',
      })
    }
  }
}
