import { readViewport, type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { FRUIT_KINDS, type PowerUpKind } from '../logic/types'
import { CloseButton } from './CloseButton'
import { drawFruit, drawPowerUp, drawSuperFruit } from './snakeArt'

export interface CollectionModalOptions {
  theme: Theme
  title: string
  fruitsLabel: string
  itemsLabel: string
  onClose?: () => void
}

type CollectionItem = PowerUpKind | 'super'

const ITEMS: readonly CollectionItem[] = ['ice', 'chili', 'super']
const CARD_MARGIN = 32
const CARD_TOP_PADDING = 92
const CARD_BOTTOM_PADDING = 32
const LABEL_SIZE = 24
const LABEL_HEIGHT = 28
const LABEL_GAP = 10
const SECTION_GAP = 24
const TILE_GAP = 12
const TILE_MAX = 132

/**
 * Read-only collection overlay. Fruit and item cards are icon-only: the art is
 * the catalogue, so the same modal works in every language without a wall of
 * translations. The grid loses columns instead of scrolling, keeping the whole
 * collection visible on phones and in both orientations.
 */
export class CollectionModal extends Phaser.GameObjects.Container {
  private closed = false

  constructor(scene: Phaser.Scene, options: CollectionModalOptions) {
    super(scene, 0, 0)
    scene.add.existing(this).setDepth(2000)

    const viewport = readViewport(scene)
    const width = viewport.width
    const height = viewport.height
    const backdrop = scene.add
      .rectangle(0, 0, width, height, options.theme.overlay, 0.72)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
    backdrop.on('pointerup', () => this.close())
    this.add(backdrop)

    const cardWidth = Math.min(width - CARD_MARGIN, 1040)
    const cardHeight = Math.min(height - CARD_MARGIN, 1100)
    const card = scene.add.container(width / 2, height / 2)
    this.add(card)

    const shield = scene.add.rectangle(0, 0, cardWidth, cardHeight, 0, 0).setInteractive()
    card.add(shield)

    const panel = scene.add.graphics()
    panel.fillStyle(options.theme.shadow, 0.16)
    panel.fillRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2 + 6,
      cardWidth,
      cardHeight,
      options.theme.radiusLarge,
    )
    panel.fillStyle(options.theme.panel, 1)
    panel.fillRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      options.theme.radiusLarge,
    )
    panel.lineStyle(2, options.theme.borderSoft, 1)
    panel.strokeRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      options.theme.radiusLarge,
    )
    card.add(panel)

    const title = scene.add
      .text(
        0,
        -cardHeight / 2 + 44,
        options.title,
        textStyle(options.theme, 32, options.theme.text, true),
      )
      .setOrigin(0.5)
    card.add(title)

    const close = new CloseButton(scene, cardWidth / 2 - 40, -cardHeight / 2 + 40, options.theme, {
      size: 56,
      onClick: () => this.close(),
    })
    card.add(close)

    const contentWidth = cardWidth - 64
    const columns = collectionColumns(cardWidth, cardHeight)
    const fruitRows = Math.ceil(FRUIT_KINDS.length / columns)
    const layout = collectionGridLayout(
      cardHeight,
      contentWidth,
      columns,
      fruitRows,
      TILE_GAP,
      TILE_MAX,
    )

    const tiles = scene.add.graphics()
    const art = scene.add.graphics()
    card.add(tiles)
    card.add(art)

    const contentLeft = -contentWidth / 2
    const fruitLabel = scene.add
      .text(
        contentLeft,
        layout.fruitLabelY,
        options.fruitsLabel,
        textStyle(options.theme, LABEL_SIZE, options.theme.textMuted, true),
      )
      .setOrigin(0, 0.5)
    card.add(fruitLabel)

    FRUIT_KINDS.forEach((kind, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = contentLeft + column * (layout.tile + TILE_GAP) + layout.tile / 2
      const y = layout.fruitGridTop + row * (layout.tile + TILE_GAP) + layout.tile / 2
      drawTile(tiles, x, y, layout.tile, options.theme)
      drawFruit(art, x, y, Math.min(34, layout.tile * 0.27), kind, options.theme, 0)
    })

    const itemsLabel = scene.add
      .text(
        contentLeft,
        layout.itemsLabelY,
        options.itemsLabel,
        textStyle(options.theme, LABEL_SIZE, options.theme.textMuted, true),
      )
      .setOrigin(0, 0.5)
    card.add(itemsLabel)

    const itemsWidth = ITEMS.length * layout.tile + (ITEMS.length - 1) * TILE_GAP
    const itemsLeft = -itemsWidth / 2
    ITEMS.forEach((item, index) => {
      const x = itemsLeft + index * (layout.tile + TILE_GAP) + layout.tile / 2
      const y = layout.itemsGridTop + layout.tile / 2
      drawTile(tiles, x, y, layout.tile, options.theme)
      if (item === 'super') {
        drawSuperFruit(art, x, y, Math.min(26, layout.tile * 0.19), 0, options.theme)
      } else {
        drawPowerUp(art, x, y, Math.min(32, layout.tile * 0.25), item, 0)
      }
    })

    const onEsc = (): void => this.close()
    scene.input.keyboard?.on('keydown-ESC', onEsc)
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.keyboard?.off('keydown-ESC', onEsc)
      options.onClose?.()
    })

    this.setAlpha(0)
    card.setScale(0.96)
    scene.tweens.add({ targets: this, alpha: 1, duration: 150 })
    scene.tweens.add({
      targets: card,
      scale: 1,
      duration: 180,
      ease: 'Back.Out',
    })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.destroy(true)
  }
}

function collectionColumns(cardWidth: number, cardHeight: number): number {
  if (cardWidth >= 900) return 7
  if (cardWidth >= 560) return cardHeight >= 900 ? 4 : 6
  return 4
}

interface CollectionGridLayout {
  tile: number
  fruitLabelY: number
  fruitGridTop: number
  itemsLabelY: number
  itemsGridTop: number
}

function collectionGridLayout(
  cardHeight: number,
  contentWidth: number,
  columns: number,
  fruitRows: number,
  gap: number,
  maxTile: number,
): CollectionGridLayout {
  const contentTop = -cardHeight / 2 + CARD_TOP_PADDING
  const contentBottom = cardHeight / 2 - CARD_BOTTOM_PADDING
  const room = contentBottom - contentTop
  const overhead = LABEL_HEIGHT * 2 + LABEL_GAP * 2 + SECTION_GAP
  const widthTile = (contentWidth - (columns - 1) * gap) / columns
  const heightTile = (room - overhead - (fruitRows - 1) * gap) / (fruitRows + 1)
  const tile = Math.max(24, Math.min(maxTile, widthTile, heightTile))

  const totalHeight = overhead + fruitRows * tile + (fruitRows - 1) * gap + tile
  const start = contentTop + Math.max(0, (room - totalHeight) / 2)
  const fruitLabelY = start + LABEL_HEIGHT / 2
  const fruitGridTop = start + LABEL_HEIGHT + LABEL_GAP
  const itemsLabelY = fruitGridTop + fruitRows * tile + (fruitRows - 1) * gap + SECTION_GAP
  return {
    tile,
    fruitLabelY,
    fruitGridTop,
    itemsLabelY: itemsLabelY + LABEL_HEIGHT / 2,
    itemsGridTop: itemsLabelY + LABEL_HEIGHT / 2 + LABEL_GAP,
  }
}

function drawTile(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  theme: Theme,
): void {
  const radius = Math.min(24, size * 0.18)
  graphics.fillStyle(theme.shadow, 0.08)
  graphics.fillRoundedRect(x - size / 2, y - size / 2 + 3, size, size, radius)
  graphics.fillStyle(theme.surface, 1)
  graphics.fillRoundedRect(x - size / 2, y - size / 2, size, size, radius)
  graphics.lineStyle(1, theme.borderSoft, 1)
  graphics.strokeRoundedRect(x - size / 2 + 0.5, y - size / 2 + 0.5, size - 1, size - 1, radius)
}
