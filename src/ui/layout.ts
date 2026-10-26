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

export const GAME_OVER_MODAL_WIDTH = 640
export const GAME_OVER_MODAL_HEIGHT = 490

const MODAL_SCREEN_MARGIN = 48
const CLOSE_INSET = 44
const CLOSE_SIZE = 56
const CROWN_GAP = 16
const BURST_MARGIN = 24
const BURST_SIDE_ROOM = 96

export interface GameOverOverlaySpec {
  readonly width: number
  readonly height: number
  readonly titleFontSize: number
  readonly heroFontSize: number
}

export interface GameOverOverlay {
  readonly card: Rect
  readonly close: Point
  readonly closeSize: number
  readonly crown: Point
  readonly crownSize: number
  /** Burst origins: top-left, top-right, bottom-left, bottom-right of the card. */
  readonly bursts: readonly [Point, Point, Point, Point]
}

/**
 * Mirrors `Modal`'s clamping so scene-level decorations (the close button,
 * crown and fireworks) land on the card instead of guessing its bounds.
 * Decoration points stay outside the card, or above/below it on narrow screens.
 */
export function computeGameOverOverlay(
  screen: { readonly width: number; readonly height: number },
  spec: GameOverOverlaySpec,
): GameOverOverlay {
  const width = Math.min(spec.width, screen.width - MODAL_SCREEN_MARGIN)
  const height = Math.min(spec.height, screen.height - MODAL_SCREEN_MARGIN)
  const card = {
    x: (screen.width - width) / 2,
    y: (screen.height - height) / 2,
    width,
    height,
  }
  const crownSize = Math.round(spec.heroFontSize * 0.9)
  const crown = {
    x: card.x + card.width / 2,
    y: Math.max(crownSize / 2 + CROWN_GAP, card.y - CROWN_GAP),
  }
  const close = {
    x: card.x + card.width - CLOSE_INSET,
    y: card.y + CLOSE_INSET,
  }

  return {
    card,
    close,
    closeSize: CLOSE_SIZE,
    crown,
    crownSize,
    bursts: computeBurstPoints(screen, card),
  }
}

function computeBurstPoints(
  screen: { readonly width: number; readonly height: number },
  card: Rect,
): readonly [Point, Point, Point, Point] {
  const sideRoom = Math.min(card.x, screen.width - (card.x + card.width))
  if (sideRoom >= BURST_SIDE_ROOM) {
    return [
      { x: card.x / 2, y: card.y + card.height * 0.22 },
      { x: screen.width - card.x / 2, y: card.y + card.height * 0.32 },
      { x: card.x / 2, y: card.y + card.height * 0.72 },
      { x: screen.width - card.x / 2, y: card.y + card.height * 0.82 },
    ]
  }

  const top = Math.max(BURST_MARGIN, card.y / 2)
  const below = screen.height - (card.y + card.height)
  const bottom = Math.min(
    screen.height - BURST_MARGIN,
    card.y + card.height + Math.max(BURST_MARGIN, below / 2),
  )
  return [
    { x: card.x + card.width * 0.18, y: top },
    { x: card.x + card.width * 0.82, y: top },
    { x: card.x + card.width * 0.24, y: bottom },
    { x: card.x + card.width * 0.76, y: bottom },
  ]
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
export const MENU_SETTINGS_SIZE = 64
export const MENU_SETTINGS_TOUCH_SIZE = 84
export const MENU_SETTINGS_HIT = 96
export const MENU_PLAY_HEIGHT = 108
export const MENU_LOGO_HEIGHT = 178
export const MENU_HINT_HEIGHT = 34
export const MENU_INSTALL_HINT_HEIGHT = 56

/** Quiet band in the middle of the CTA reserved for the play icon and label. */
export const MENU_PLAY_CHARM_CLEARANCE = 62

export interface PlayCharmSpot {
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly angle: number
}

/**
 * A scattered handful of fruit resting on the play button. Coordinates are
 * relative to the button centre, so a layout change keeps the arrangement
 * attached. Spots stay clear of the centred icon/label band.
 */
export function playCharmSpots(width: number, height: number): readonly PlayCharmSpot[] {
  const edge = width / 2
  const top = height / 2
  return [
    { x: -edge + 34, y: -top * 0.37, radius: 22, angle: -16 },
    { x: -edge + 116, y: -top * 0.7, radius: 18, angle: 13 },
    { x: edge - 40, y: -top * 0.44, radius: 21, angle: 17 },
    { x: edge - 118, y: -top * 0.74, radius: 16, angle: -11 },
    { x: -edge + 148, y: top * 0.59, radius: 16, angle: 21 },
    { x: edge - 150, y: top * 0.56, radius: 17, angle: -19 },
  ].filter((spot) => Math.abs(spot.x) - spot.radius >= MENU_PLAY_CHARM_CLEARANCE)
}

/** Half-width of the centred icon and label band on a modal action button. */
export const ACTION_LABEL_BAND = 160

/** Glow radius of the super fruit, as a multiple of its body radius. */
export const SUPER_FRUIT_HALO = 2.4

/** How far the crown reaches above the super fruit body, in radii. */
export const SUPER_FRUIT_CROWN = 1.55

export interface SuperFruitSpot {
  readonly x: number
  readonly y: number
  readonly radius: number
}

/**
 * A single super fruit resting on the right end of the rewarded action. The
 * radius follows the button height so the crown stays on the face, and the
 * spot sits outside the centred label band so long labels never collide.
 */
export function superFruitSpot(width: number, height: number): SuperFruitSpot {
  const radius = Math.min(18, Math.max(12, height * 0.24))
  return {
    x: width / 2 - radius - 16,
    y: 0,
    radius,
  }
}

export interface MenuSettingsLayout {
  readonly sound: Point
  readonly language: Point
  readonly size: number
}

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
  settings: MenuSettingsLayout
  demo: MenuDemoLayout
  hintY: number
  installHintY: number
  playWidth: number
}

const SPLIT_MIN_WIDTH = 900
const LOGO_BEST_GAP = 16
const BEST_HEIGHT = 40
const BEST_PLAY_GAP = 34
const PLAY_HINT_GAP = 28
const SETTINGS_EDGE = 24
const SETTINGS_TOP = 20
const SETTINGS_GAP = 12
const SETTINGS_TOUCH_GAP = 16
const HEADER_CLEARANCE = 12
const INSTALL_HINT_GAP = 12
const DEMO_GAP = 24
const DEMO_MIN_WIDTH = 240
const DEMO_MIN_HEIGHT = 180
const DEMO_MAX_WIDTH = 560
const BOTTOM_BAND_MIN = 150
const BOTTOM_BAND_MAX = 310
const BOTTOM_BAND_RATIO = 0.19
const BOTTOM_BAND_FLOOR = 24

/**
 * The menu keeps one clear column of actions and pushes the secondary controls
 * (sound, language) into the top-right corner. Wide screens add a self-playing
 * demo board on the right. Portrait screens reserve the lower fifth of the
 * screen for the CTA and its hints instead of pinning the button to the bottom
 * edge, and float the demo between the best line and the CTA. The demo is
 * dropped when it would crowd a small viewport.
 */
export function computeMenuLayout(
  viewport: Viewport,
  logoHeight = MENU_LOGO_HEIGHT,
  touch = false,
  showInstallHint = false,
): MenuLayout {
  const { insets, width, height } = viewport
  const availableWidth = Math.max(1, width - insets.left - insets.right)
  const availableHeight = Math.max(1, height - insets.top - insets.bottom)
  const split = availableWidth >= SPLIT_MIN_WIDTH && width >= height
  const settingsSize = touch ? MENU_SETTINGS_TOUCH_SIZE : MENU_SETTINGS_SIZE
  const settings = computeSettingsLayout(
    width,
    insets,
    settingsSize,
    touch ? SETTINGS_TOUCH_GAP : SETTINGS_GAP,
  )
  const settingsClearance = SETTINGS_TOP + settingsSize + HEADER_CLEARANCE

  const contentHeight =
    logoHeight +
    LOGO_BEST_GAP +
    BEST_HEIGHT +
    BEST_PLAY_GAP +
    MENU_PLAY_HEIGHT +
    PLAY_HINT_GAP +
    MENU_HINT_HEIGHT

  if (split) {
    const centerX = insets.left + Math.round(availableWidth * 0.34)
    const demoWidth = clamp(availableWidth * 0.28, 260, 400)
    const demoScale = demoWidth / MENU_DEMO_WIDTH
    const demoHeight = MENU_DEMO_HEIGHT * demoScale
    const top =
      insets.top +
      Math.max(56, Math.round((availableHeight - contentHeight) * 0.42), settingsClearance)
    const logoY = top + logoHeight / 2
    const bestY = top + logoHeight + LOGO_BEST_GAP + BEST_HEIGHT / 2
    const playY = bestY + BEST_HEIGHT / 2 + BEST_PLAY_GAP + MENU_PLAY_HEIGHT / 2
    const hintY = playY + MENU_PLAY_HEIGHT / 2 + PLAY_HINT_GAP + MENU_HINT_HEIGHT / 2

    return {
      mode: 'split',
      centerX,
      logoY,
      logoMaxWidth: Math.min(560, Math.round(availableWidth * 0.55)),
      bestY,
      playY,
      settings,
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
      installHintY: hintY + MENU_HINT_HEIGHT / 2 + INSTALL_HINT_GAP + MENU_INSTALL_HINT_HEIGHT / 2,
      playWidth: Math.min(480, availableWidth - 48),
    }
  }

  const centerX = insets.left + Math.round(availableWidth / 2)
  const top =
    insets.top + Math.max(clamp(Math.round(availableHeight * 0.08), 56, 160), settingsClearance)
  const logoY = top + logoHeight / 2
  const bestY = top + logoHeight + LOGO_BEST_GAP + BEST_HEIGHT / 2

  // Leave a readable footer band under the CTA instead of docking the button to
  // the screen edge. The hints live inside that band, below the primary action,
  // so a two-line install note never crowds the button or the controls hint.
  const installFooter = showInstallHint ? INSTALL_HINT_GAP + MENU_INSTALL_HINT_HEIGHT : 0
  const footerHeight = PLAY_HINT_GAP + MENU_HINT_HEIGHT + installFooter
  const bottomBand = Math.max(
    clamp(Math.round(availableHeight * BOTTOM_BAND_RATIO), BOTTOM_BAND_MIN, BOTTOM_BAND_MAX),
    footerHeight + BOTTOM_BAND_FLOOR,
  )
  const playBottom = insets.top + availableHeight - bottomBand
  const playY = playBottom - MENU_PLAY_HEIGHT / 2
  const hintY = playBottom + PLAY_HINT_GAP + MENU_HINT_HEIGHT / 2
  const installHintY =
    hintY + MENU_HINT_HEIGHT / 2 + INSTALL_HINT_GAP + MENU_INSTALL_HINT_HEIGHT / 2

  const demoTop = bestY + BEST_HEIGHT / 2 + DEMO_GAP
  const demoBottom = playY - MENU_PLAY_HEIGHT / 2 - DEMO_GAP
  const demoSpace = Math.max(0, demoBottom - demoTop)
  const demoMaxWidth = Math.min(DEMO_MAX_WIDTH, availableWidth - 96)
  const demoHeight = Math.max(
    0,
    Math.min(demoMaxWidth / MENU_DEMO_ASPECT, demoSpace - DEMO_GAP * 2),
  )
  const demoWidth = demoHeight * MENU_DEMO_ASPECT
  const demoVisible = demoHeight >= DEMO_MIN_HEIGHT && demoWidth >= DEMO_MIN_WIDTH
  const demoY = demoTop + demoSpace / 2

  return {
    mode: 'single',
    centerX,
    logoY,
    logoMaxWidth: availableWidth - 48,
    bestY,
    playY,
    settings,
    demo: {
      x: centerX,
      y: demoVisible ? demoY : demoBottom,
      width: demoVisible ? demoWidth : 0,
      height: demoVisible ? demoHeight : 0,
      scale: demoVisible ? demoWidth / MENU_DEMO_WIDTH : 0,
      angle: 0,
      visible: demoVisible,
    },
    hintY,
    installHintY,
    playWidth: Math.min(480, availableWidth - 48),
  }
}

function computeSettingsLayout(
  width: number,
  insets: Viewport['insets'],
  size: number,
  gap: number,
): MenuSettingsLayout {
  const languageX = width - insets.right - SETTINGS_EDGE - size / 2
  const soundX = languageX - size - gap
  const y = insets.top + SETTINGS_TOP + size / 2
  return {
    sound: { x: soundX, y },
    language: { x: languageX, y },
    size,
  }
}

function orientationOf(viewport: Viewport): SnakeLayout['orientation'] {
  return viewport.width >= viewport.height ? 'landscape' : 'portrait'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
