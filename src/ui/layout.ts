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

export const MENU_DEMO_WIDTH = 312
export const MENU_DEMO_HEIGHT = 220
export const MENU_DEMO_ASPECT = MENU_DEMO_WIDTH / MENU_DEMO_HEIGHT
export const MENU_SETTINGS_SIZE = 88
export const MENU_PLAY_HEIGHT = 100
export const MENU_LOGO_HEIGHT = 178

export interface MenuDemoLayout {
  x: number
  y: number
  width: number
  height: number
  scale: number
  angle: number
  visible: boolean
}

export interface MenuLayout {
  mode: 'split' | 'single'
  centerX: number
  logoY: number
  logoMaxWidth: number
  bestY: number
  playY: number
  settingsY: number
  settingsSize: number
  demo: MenuDemoLayout
  hintY: number
  installHintY: number
  playWidth: number
}

const SPLIT_MIN_WIDTH = 900
const LOGO_BEST_GAP = 16
const BEST_HEIGHT = 40
const BEST_PLAY_GAP = 24
const PLAY_SETTINGS_GAP = 20
const SETTINGS_HINT_GAP = 20
const HINT_HEIGHT = 30

/**
 * The menu keeps one clear column of actions. Wide screens add a self-playing
 * demo board on the right; tall screens dock it below the controls. The demo is
 * dropped when it would crowd a small viewport.
 */
export function computeMenuLayout(viewport: Viewport, logoHeight = MENU_LOGO_HEIGHT): MenuLayout {
  const { insets, width, height } = viewport
  const availableWidth = Math.max(1, width - insets.left - insets.right)
  const availableHeight = Math.max(1, height - insets.top - insets.bottom)
  const split = availableWidth >= SPLIT_MIN_WIDTH && width >= height

  const contentHeight =
    logoHeight +
    LOGO_BEST_GAP +
    BEST_HEIGHT +
    BEST_PLAY_GAP +
    MENU_PLAY_HEIGHT +
    PLAY_SETTINGS_GAP +
    MENU_SETTINGS_SIZE +
    SETTINGS_HINT_GAP +
    HINT_HEIGHT

  if (split) {
    const centerX = insets.left + Math.round(availableWidth * 0.34)
    const demoWidth = clamp(availableWidth * 0.28, 260, 400)
    const demoScale = demoWidth / MENU_DEMO_WIDTH
    const demoHeight = MENU_DEMO_HEIGHT * demoScale
    const top = insets.top + Math.max(56, Math.round((availableHeight - contentHeight) * 0.42))
    const logoY = top + logoHeight / 2
    const bestY = top + logoHeight + LOGO_BEST_GAP + BEST_HEIGHT / 2
    const playY = bestY + BEST_HEIGHT / 2 + BEST_PLAY_GAP + MENU_PLAY_HEIGHT / 2
    const settingsY = playY + MENU_PLAY_HEIGHT / 2 + PLAY_SETTINGS_GAP + MENU_SETTINGS_SIZE / 2
    const hintY = settingsY + MENU_SETTINGS_SIZE / 2 + SETTINGS_HINT_GAP + HINT_HEIGHT / 2

    return {
      mode: 'split',
      centerX,
      logoY,
      logoMaxWidth: Math.min(560, Math.round(availableWidth * 0.55)),
      bestY,
      playY,
      settingsY,
      settingsSize: MENU_SETTINGS_SIZE,
      demo: {
        x: insets.left + availableWidth - 56 - demoWidth / 2,
        y: insets.top + availableHeight / 2,
        width: demoWidth,
        height: demoHeight,
        scale: demoScale,
        angle: -2,
        visible: true,
      },
      hintY,
      installHintY: hintY + 36,
      playWidth: Math.min(480, availableWidth - 48),
    }
  }

  const centerX = insets.left + Math.round(availableWidth / 2)
  const top = insets.top + clamp(Math.round(availableHeight * 0.08), 56, 160)
  const logoY = top + logoHeight / 2
  const bestY = top + logoHeight + LOGO_BEST_GAP + BEST_HEIGHT / 2
  const playY = bestY + BEST_HEIGHT / 2 + BEST_PLAY_GAP + MENU_PLAY_HEIGHT / 2
  const settingsY = playY + MENU_PLAY_HEIGHT / 2 + PLAY_SETTINGS_GAP + MENU_SETTINGS_SIZE / 2
  const hintY = settingsY + MENU_SETTINGS_SIZE / 2 + SETTINGS_HINT_GAP + HINT_HEIGHT / 2
  const installHintY = hintY + 34
  const contentBottom = hintY + HINT_HEIGHT / 2
  const dockTop = installHintY + 32
  const remaining = insets.top + availableHeight - dockTop
  const maxDemoWidth = Math.min(520, availableWidth - 48, (remaining - 48) * MENU_DEMO_ASPECT)
  const demoVisible = remaining >= 240 && maxDemoWidth >= 240
  const demoWidth = demoVisible ? maxDemoWidth : 0
  const demoHeight = demoVisible ? demoWidth / MENU_DEMO_ASPECT : 0

  return {
    mode: 'single',
    centerX,
    logoY,
    logoMaxWidth: availableWidth - 48,
    bestY,
    playY,
    settingsY,
    settingsSize: MENU_SETTINGS_SIZE,
    demo: {
      x: centerX,
      y: demoVisible ? dockTop + remaining / 2 : contentBottom,
      width: demoWidth,
      height: demoHeight,
      scale: demoVisible ? demoWidth / MENU_DEMO_WIDTH : 0,
      angle: 0,
      visible: demoVisible,
    },
    hintY,
    installHintY,
    playWidth: Math.min(480, availableWidth - 48),
  }
}

function orientationOf(viewport: Viewport): SnakeLayout['orientation'] {
  return viewport.width >= viewport.height ? 'landscape' : 'portrait'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
