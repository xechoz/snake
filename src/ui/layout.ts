import type { Viewport } from '@mg/core'
import { snakeConfig } from '../logic/config'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export const SCORE_LABEL_SIZE = 26
export const SCORE_VALUE_SIZE = 72
export const SCORE_INLINE_GAP = 16

const MARGIN = 24
const EDGE = 24
const PAUSE_HIT = 96
const HUD_GAP = 20
const SCORE_BLOCK_WIDTH = 220
const SCORE_BLOCK_HEIGHT = SCORE_LABEL_SIZE + 6 + SCORE_VALUE_SIZE
const COLUMN_HUD = { width: SCORE_BLOCK_WIDTH, height: PAUSE_HIT + HUD_GAP + SCORE_BLOCK_HEIGHT }
const ROW_HUD = { width: SCORE_BLOCK_WIDTH + HUD_GAP + PAUSE_HIT, height: SCORE_BLOCK_HEIGHT }
const HUD_CLEARANCE = 16
const MIN_BOARD = 200

export interface SnakeLayout {
  orientation: 'landscape' | 'portrait'
  /** `side` puts the HUD in the left margin, `top` in the top margin. */
  placement: 'side' | 'top'
  board: Rect & { cell: number }
  hud: Rect
  score:
    | { mode: 'stacked'; x: number; labelY: number; valueY: number }
    | { mode: 'inline'; x: number; y: number }
  pause: Point
}

/** Centres the inline score group so digit count changes never shift it. */
export function inlineScorePositions(
  centerX: number,
  labelWidth: number,
  valueWidth: number,
): { labelX: number; valueX: number } {
  const left = centerX - (labelWidth + SCORE_INLINE_GAP + valueWidth) / 2
  return {
    labelX: left + labelWidth / 2,
    valueX: left + labelWidth + SCORE_INLINE_GAP + valueWidth / 2,
  }
}

/**
 * The board always takes the largest square that still leaves room for the HUD
 * outside of it, so score and pause never cover playable cells. Whichever
 * placement yields the bigger board wins: side on wide screens, top on tall
 * ones.
 */
export function computeSnakeLayout(viewport: Viewport): SnakeLayout {
  const { insets } = viewport
  const availableWidth = Math.max(1, viewport.width - insets.left - insets.right)
  const availableHeight = Math.max(1, viewport.height - insets.top - insets.bottom)

  const sideBoard = Math.min(
    availableHeight - MARGIN * 2,
    availableWidth - 2 * (COLUMN_HUD.width + EDGE + HUD_CLEARANCE),
  )
  const topBoard = Math.min(
    availableWidth - MARGIN * 2,
    availableHeight - 2 * (ROW_HUD.height + EDGE + HUD_CLEARANCE),
  )

  const placement: SnakeLayout['placement'] = sideBoard >= topBoard ? 'side' : 'top'
  const size = Math.max(MIN_BOARD, Math.round(placement === 'side' ? sideBoard : topBoard))

  const boardX = insets.left + Math.round((availableWidth - size) / 2)
  const boardY = insets.top + Math.round((availableHeight - size) / 2)
  const board = {
    x: boardX,
    y: boardY,
    width: size,
    height: size,
    cell: size / snakeConfig.width,
  }

  if (placement === 'side') {
    const hudX =
      insets.left + Math.max(EDGE, Math.round((boardX - insets.left - COLUMN_HUD.width) / 2))
    const hudY = insets.top + EDGE
    const scoreLabelY = hudY + PAUSE_HIT + HUD_GAP + SCORE_LABEL_SIZE / 2
    return {
      orientation: orientationOf(viewport),
      placement,
      board,
      hud: { x: hudX, y: hudY, width: COLUMN_HUD.width, height: COLUMN_HUD.height },
      score: {
        mode: 'stacked',
        x: hudX + COLUMN_HUD.width / 2,
        labelY: scoreLabelY,
        valueY: scoreLabelY + SCORE_LABEL_SIZE / 2 + 6 + SCORE_VALUE_SIZE / 2,
      },
      pause: { x: hudX + COLUMN_HUD.width / 2, y: hudY + PAUSE_HIT / 2 },
    }
  }

  const hudX = insets.left + Math.round((availableWidth - ROW_HUD.width) / 2)
  const hudY = insets.top + EDGE
  return {
    orientation: orientationOf(viewport),
    placement,
    board,
    hud: { x: hudX, y: hudY, width: ROW_HUD.width, height: ROW_HUD.height },
    score: {
      mode: 'inline',
      x: hudX + SCORE_BLOCK_WIDTH / 2,
      y: hudY + ROW_HUD.height / 2,
    },
    pause: { x: hudX + ROW_HUD.width - PAUSE_HIT / 2, y: hudY + ROW_HUD.height / 2 },
  }
}

export interface MenuLayout {
  centerX: number
  titleY: number
  subtitleY: number
  bestY: number
  playY: number
  secondaryY: number
  controlsY: number
  hintY: number
  installHintY: number
  playWidth: number
  secondaryWidth: number
  motif: { x: number; y: number; scale: number }
}

const MENU_SPAN = 506
const MOTIF_WIDTH = 240
const MOTIF_HEIGHT = 360

export function computeMenuLayout(viewport: Viewport): MenuLayout {
  const { insets, width, height } = viewport
  const availableWidth = Math.max(1, width - insets.left - insets.right)
  const availableHeight = Math.max(1, height - insets.top - insets.bottom)
  const top = Math.max(insets.top + 96, Math.round((availableHeight - MENU_SPAN) / 2) - 30)

  const motifScale = 1
  const motifX = width - insets.right - MOTIF_WIDTH * motifScale - 24
  const motifY =
    width >= height
      ? Math.round(insets.top + Math.max(24, (availableHeight - MOTIF_HEIGHT * motifScale) / 2))
      : Math.round(insets.top + availableHeight - MOTIF_HEIGHT * motifScale - 96)

  return {
    centerX: insets.left + Math.round(availableWidth / 2),
    titleY: top,
    subtitleY: top + 82,
    bestY: top + 150,
    playY: top + 260,
    secondaryY: top + 390,
    controlsY: top + 470,
    hintY: top + 506,
    installHintY: top + 544,
    playWidth: Math.min(480, availableWidth - 48),
    secondaryWidth: Math.min(230, Math.round((availableWidth - 72) / 2)),
    motif: { x: motifX, y: motifY, scale: motifScale },
  }
}

function orientationOf(viewport: Viewport): SnakeLayout['orientation'] {
  return viewport.width >= viewport.height ? 'landscape' : 'portrait'
}
