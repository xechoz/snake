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
const TOP_CARD_WIDTH = 260
const SIDE_CARD_WIDTH = 220
const SIDE_CARD_HEIGHT = 160
const SCORE_BLOCK_HEIGHT = SCORE_LABEL_SIZE + 6 + SCORE_VALUE_SIZE
const COLUMN_HUD = { width: SIDE_CARD_WIDTH, height: PAUSE_HIT + HUD_GAP + SIDE_CARD_HEIGHT }
const ROW_HUD = { width: TOP_CARD_WIDTH + HUD_GAP + PAUSE_HIT, height: SCORE_BLOCK_HEIGHT }
const HUD_CLEARANCE = 16
const MIN_BOARD = 200

export interface SnakeLayout {
  orientation: 'landscape' | 'portrait'
  /** `side` puts the HUD in the left margin, `top` in the top margin. */
  placement: 'side' | 'top'
  board: Rect & { cell: number }
  hud: Rect
  scoreCard: Rect
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
    const scoreCard = {
      x: hudX,
      y: hudY + PAUSE_HIT + HUD_GAP,
      width: SIDE_CARD_WIDTH,
      height: SIDE_CARD_HEIGHT,
    }
    return {
      orientation: orientationOf(viewport),
      placement,
      board,
      hud: { x: hudX, y: hudY, width: COLUMN_HUD.width, height: COLUMN_HUD.height },
      scoreCard,
      score: {
        mode: 'stacked',
        x: scoreCard.x + scoreCard.width / 2,
        labelY: scoreCard.y + 34,
        valueY: scoreCard.y + 96,
      },
      pause: { x: hudX + COLUMN_HUD.width / 2, y: hudY + PAUSE_HIT / 2 },
    }
  }

  const hudX = insets.left + Math.round((availableWidth - ROW_HUD.width) / 2)
  const hudY = insets.top + EDGE
  const scoreCard = {
    x: hudX,
    y: hudY,
    width: TOP_CARD_WIDTH,
    height: ROW_HUD.height,
  }
  return {
    orientation: orientationOf(viewport),
    placement,
    board,
    hud: { x: hudX, y: hudY, width: ROW_HUD.width, height: ROW_HUD.height },
    scoreCard,
    score: {
      mode: 'inline',
      x: scoreCard.x + scoreCard.width / 2,
      y: scoreCard.y + scoreCard.height / 2,
    },
    pause: {
      x: hudX + TOP_CARD_WIDTH + HUD_GAP + PAUSE_HIT / 2,
      y: hudY + ROW_HUD.height / 2,
    },
  }
}

export interface MenuLayout {
  centerX: number
  titleY: number
  bestY: number
  playY: number
  secondaryY: number
  controlsY: number
  hintY: number
  installHintY: number
  playWidth: number
  secondaryWidth: number
  mascot: { x: number; y: number; scale: number; visible: boolean }
}

const MENU_SPAN = 560

export function computeMenuLayout(viewport: Viewport): MenuLayout {
  const { insets, width, height } = viewport
  const availableWidth = Math.max(1, width - insets.left - insets.right)
  const availableHeight = Math.max(1, height - insets.top - insets.bottom)
  const top = Math.max(insets.top + 72, Math.round((availableHeight - MENU_SPAN) / 2) - 30)
  const landscape = width >= height

  const centerX =
    landscape && availableWidth >= 900
      ? insets.left + Math.round(availableWidth * 0.44)
      : insets.left + Math.round(availableWidth / 2)

  const mascotScale = landscape
    ? clamp(availableWidth / 1800, 0.6, 1)
    : clamp(availableWidth / 900, 0.6, 0.85)
  const mascotHalf = 180 * mascotScale
  const mascotX = width - insets.right - mascotHalf - 12
  const mascotY = landscape
    ? insets.top + Math.round(availableHeight * 0.42)
    : insets.top + availableHeight - 40 - mascotHalf
  const hintY = top + 520
  // Portrait mascots sit low; hide them when a 4:3-ish screen would make the
  // coiled body cover the help text.
  const mascotVisible = landscape
    ? availableWidth >= 900
    : mascotY - 180 * mascotScale >= hintY + 36

  return {
    centerX,
    titleY: top,
    bestY: top + 160,
    playY: top + 270,
    secondaryY: top + 396,
    controlsY: top + 476,
    hintY,
    installHintY: top + 560,
    playWidth: Math.min(480, availableWidth - 48),
    secondaryWidth: Math.min(230, Math.round((availableWidth - 72) / 2)),
    mascot: { x: mascotX, y: mascotY, scale: mascotScale, visible: mascotVisible },
  }
}

function orientationOf(viewport: Viewport): SnakeLayout['orientation'] {
  return viewport.width >= viewport.height ? 'landscape' : 'portrait'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
