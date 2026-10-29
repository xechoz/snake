import type { Viewport } from '@mg/core'
import type { WorldId } from '../logic/levels'
import type { Point, Rect } from './layout'

export interface LevelMapNodeInput {
  readonly id: string
  readonly label: string
  readonly open: boolean
  readonly stars: number
  readonly current: boolean
}

export interface LevelMapWorldInput {
  readonly id: WorldId
  readonly nameKey: string
  readonly levels: readonly LevelMapNodeInput[]
  readonly stars: number
  readonly maxStars: number
  readonly unlocked: boolean
  readonly gateStars: number
}

export interface LevelMapLayoutInput {
  readonly viewport: Viewport
  readonly worlds: readonly LevelMapWorldInput[]
}

export interface LevelMapNode {
  readonly id: string
  readonly label: string
  readonly x: number
  readonly y: number
  readonly size: number
  readonly stars: number
  readonly open: boolean
  readonly current: boolean
}

export interface LevelMapWorld {
  readonly id: WorldId
  readonly nameKey: string
  readonly header: Point
  readonly starsLabel: Point
  readonly stars: number
  readonly maxStars: number
  readonly unlocked: boolean
  readonly gateStars: number
  readonly bounds: Rect
  readonly nodes: readonly LevelMapNode[]
  /** Gate separating this world from the next one. */
  readonly gate: Rect | null
}

export interface LevelMapLayout {
  readonly card: Rect
  readonly content: Rect
  readonly worlds: readonly LevelMapWorld[]
  readonly footer: {
    readonly y: number
    readonly buttonWidth: number
    readonly gap: number
  }
  readonly columns: number
  readonly nodeSize: number
}

const CARD_MARGIN = 24
const MAX_CARD_WIDTH = 1040
const MAX_CARD_HEIGHT = 900
const CARD_PAD = 32
const TITLE_BAND = 96
const FOOTER_BAND = 88
const WORLD_HEADER = 30
const LABEL_HEIGHT = 22
const STARS_HEIGHT = 18
const NODE_GAP_X = 16
const ROW_GAP = 12
const WORLD_GAP = 34
const GATE_HEIGHT = 38
const MIN_NODE = 56
const MAX_NODE = 120

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Lays out the two campaign regions as a winding path. Landscape screens get
 * six nodes in a row; tall screens get three columns and two rows, which keeps
 * the tap targets large enough on phones.
 */
export function computeLevelMapLayout(input: LevelMapLayoutInput): LevelMapLayout {
  const { viewport, worlds } = input
  const availableWidth = viewport.width - viewport.insets.left - viewport.insets.right
  const availableHeight = viewport.height - viewport.insets.top - viewport.insets.bottom
  const cardWidth = Math.min(MAX_CARD_WIDTH, availableWidth - CARD_MARGIN * 2)
  const cardHeightLimit = Math.min(MAX_CARD_HEIGHT, availableHeight - CARD_MARGIN * 2)
  const contentWidth = cardWidth - CARD_PAD * 2
  const portrait = viewport.height > viewport.width * 1.15
  const columns = portrait ? 3 : 6
  const rowsByWorld = worlds.map((world) => Math.ceil(world.levels.length / columns))
  const totalRows = rowsByWorld.reduce((sum, rows) => sum + rows, 0)
  const gates = Math.max(0, worlds.length - 1)

  const fixedHeight =
    TITLE_BAND +
    FOOTER_BAND +
    worlds.length * WORLD_HEADER +
    totalRows * (LABEL_HEIGHT + STARS_HEIGHT + ROW_GAP) -
    worlds.length * ROW_GAP +
    gates * (GATE_HEIGHT + WORLD_GAP)
  const nodeByHeight = Math.max(0, (cardHeightLimit - fixedHeight) / Math.max(1, totalRows))
  const nodeByWidth = (contentWidth - (columns - 1) * NODE_GAP_X) / Math.max(1, columns)
  const nodeSize = Math.round(
    clamp(Math.min(MAX_NODE, nodeByWidth, nodeByHeight), MIN_NODE, MAX_NODE),
  )
  const cardHeight = Math.min(cardHeightLimit, fixedHeight + totalRows * nodeSize)
  const card: Rect = {
    x: viewport.insets.left + (availableWidth - cardWidth) / 2,
    y: viewport.insets.top + (availableHeight - cardHeight) / 2,
    width: cardWidth,
    height: cardHeight,
  }
  const content: Rect = {
    x: card.x + CARD_PAD,
    y: card.y + TITLE_BAND,
    width: contentWidth,
    height: cardHeight - TITLE_BAND - FOOTER_BAND,
  }

  const rowStride = nodeSize + LABEL_HEIGHT + STARS_HEIGHT + ROW_GAP
  let cursor = content.y
  const worldLayouts: LevelMapWorld[] = []

  worlds.forEach((world, worldIndex) => {
    const rows = rowsByWorld[worldIndex] ?? 1
    const worldTop = cursor
    const gridTop = worldTop + WORLD_HEADER
    const nodes: LevelMapNode[] = world.levels.map((level, index) => {
      const row = Math.floor(index / columns)
      const offset = index - row * columns
      const column = row % 2 === 0 ? offset : columns - 1 - offset
      return {
        id: level.id,
        label: level.label,
        x: content.x + column * (nodeSize + NODE_GAP_X) + nodeSize / 2,
        y: gridTop + row * rowStride + nodeSize / 2,
        size: nodeSize,
        stars: level.stars,
        open: level.open,
        current: level.current,
      }
    })
    const worldBottom = gridTop + rows * rowStride - ROW_GAP
    const gateTop = worldBottom + WORLD_GAP / 2
    const gate =
      worldIndex < worlds.length - 1
        ? {
            x: content.x + content.width * 0.12,
            y: gateTop,
            width: content.width * 0.76,
            height: GATE_HEIGHT,
          }
        : null

    worldLayouts.push({
      id: world.id,
      nameKey: world.nameKey,
      header: { x: content.x, y: worldTop },
      starsLabel: { x: content.x + content.width, y: worldTop },
      stars: world.stars,
      maxStars: world.maxStars,
      unlocked: world.unlocked,
      gateStars: world.gateStars,
      bounds: {
        x: content.x,
        y: worldTop,
        width: content.width,
        height: worldBottom - worldTop,
      },
      nodes,
      gate,
    })

    cursor = gate ? gateTop + GATE_HEIGHT + WORLD_GAP : worldBottom + WORLD_GAP
  })

  return {
    card,
    content,
    worlds: worldLayouts,
    footer: {
      y: card.y + card.height - FOOTER_BAND / 2,
      buttonWidth: Math.min(240, (contentWidth - 16) / 2),
      gap: 16,
    },
    columns,
    nodeSize,
  }
}
