import { getTextResolution, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { snakeConfig } from '../logic/config'
import { type FoodItem, FRUIT_KINDS, type FruitKind } from '../logic/types'
import { type BoardMetrics, cellCenterX, cellCenterY, FOOD_RADIUS } from './gameArt'
import { drawFruit } from './snakeArt'

const TEXTURE_PREFIX = 'snake-food'
/**
 * `drawFruit` glows at 1.7× the body radius; a little extra room keeps the
 * soft edge and antialiasing inside the baked texture.
 */
const ART_EXTENT = 1.8

interface CachedFruit {
  readonly image: Phaser.GameObjects.Image
  kind: FruitKind
}

/**
 * Fruit art is expensive to tessellate and Phaser re-tessellates every
 * `Graphics` path on every frame. Bake each kind once at the current backing
 * scale and reuse pooled images, so a full feast board costs the same as a
 * handful of sprites.
 */
export class FoodLayer {
  private readonly images = new Map<number, CachedFruit>()
  private textureKeys: string[] = []
  private resolution = 0
  private cell = 0
  private theme: Theme

  constructor(
    private readonly scene: Phaser.Scene,
    theme: Theme,
  ) {
    this.theme = theme
  }

  /** True when the backing scale changed and the baked textures are stale. */
  needsRebake(): boolean {
    return this.resolution !== currentResolution()
  }

  /** Call when `state.foods` or the board changes. */
  sync(foods: readonly FoodItem[], board: BoardMetrics, theme: Theme): void {
    if (this.needsRebake() || this.cell !== board.cell || this.theme !== theme) {
      this.bake(board, theme)
    }

    const seen = new Set<number>()
    for (const food of foods) {
      const id = food.cell.y * snakeConfig.width + food.cell.x
      seen.add(id)

      let cached = this.images.get(id)
      if (!cached) {
        const image = this.scene.add
          .image(0, 0, this.textureKey(food.kind))
          .setDepth(3)
          .setOrigin(0.5)
          .setScale(1 / this.resolution)
        cached = { image, kind: food.kind }
        this.images.set(id, cached)
      } else if (cached.kind !== food.kind) {
        cached.image.setTexture(this.textureKey(food.kind))
        cached.kind = food.kind
      }

      cached.image
        .setPosition(cellCenterX(board, food.cell.x), cellCenterY(board, food.cell.y))
        .setVisible(true)
    }

    for (const [id, cached] of this.images) {
      if (!seen.has(id)) cached.image.setVisible(false)
    }
  }

  destroy(): void {
    for (const cached of this.images.values()) cached.image.destroy()
    this.images.clear()
    this.removeTextures()
  }

  private bake(board: BoardMetrics, theme: Theme): void {
    this.removeTextures()
    this.theme = theme
    this.cell = board.cell
    this.resolution = currentResolution()

    const radius = board.cell * FOOD_RADIUS * this.resolution
    const half = Math.ceil(radius * ART_EXTENT)
    const size = half * 2
    const graphics = this.scene.make.graphics(undefined, false)

    try {
      for (const kind of FRUIT_KINDS) {
        const key = this.textureKey(kind)
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key)
        graphics.clear()
        drawFruit(graphics, half, half, radius, kind, theme, 0)
        graphics.generateTexture(key, size, size)
        this.textureKeys.push(key)
      }
    } finally {
      graphics.destroy()
    }

    for (const cached of this.images.values()) {
      cached.image.setTexture(this.textureKey(cached.kind)).setScale(1 / this.resolution)
    }
  }

  private textureKey(kind: FruitKind): string {
    return `${TEXTURE_PREFIX}:${kind}:${this.resolution.toFixed(3)}`
  }

  private removeTextures(): void {
    for (const key of this.textureKeys) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key)
    }
    this.textureKeys = []
  }
}

function currentResolution(): number {
  return Math.max(1, getTextResolution())
}
