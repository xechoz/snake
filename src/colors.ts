import type { Theme } from '@mg/core'
import type { EffectKind, FruitKind, PowerUpKind } from './logic/types'

const ink = 0x332b45
const white = 0xffffff
const muted = 0x6b6178
const accentAlt = 0x2fb673
const accentWarm = 0xffc94d
const cream = 0xfff9ec

const accent = 0xffe08a
const accentHover = 0xf7d26d
const accentInk = 0x8a5a00

function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

const snakeTheme = {
  bg: 0xe3f2fa,
  bgAlt: 0xfff4e2,
  board: cream,
  boardAlt: 0xeaf9e8,
  ink,
  accent,
  accentHover,
  accentAlt,
  accentWarm,
  accentInk,
  onAccent: accentInk,
  text: cssColor(ink),
  textMuted: cssColor(muted),
  muted,
  panel: cream,
  borderSoft: 0xd2d0d6,
  surface: white,
  surfaceAlt: 0xffead5,
  danger: 0xce2f40,
  dangerHover: 0xb82736,
  onDanger: cream,
  highlight: white,
  overlay: 0x2a2038,
  shadow: ink,
  // Button clamps this to half its height, so every control renders as a capsule.
  radius: 64,
  radiusLarge: 44,
} satisfies Partial<Theme>

export interface FruitArtColors {
  readonly light: number
  readonly body: number
  readonly dark: number
  readonly leaf: number
}

export interface PowerUpArtColors {
  readonly light: number
  readonly body: number
  readonly dark: number
  readonly accent: number
}

export interface SnakeArtColors {
  ink: number
  snakeHead: number
  snakeTail: number
  fruits: Record<FruitKind, FruitArtColors>
  powerUps: Record<PowerUpKind, PowerUpArtColors>
  effects: Record<EffectKind, number>
  leaf: number
  eyeWhite: number
  shine: number
  cloud: number
  tongue: number
  blush: number
  confetti: readonly number[]
}

const snakeArt: SnakeArtColors = {
  ink,
  snakeHead: 0x7dd3fc,
  snakeTail: 0x0369a1,
  fruits: {
    apple: { light: 0xffa8c0, body: 0xff5c8a, dark: 0xc42b58, leaf: accentAlt },
    orange: { light: 0xffc47a, body: 0xff8a2b, dark: 0xc25a0a, leaf: accentAlt },
    lemon: { light: 0xffef8f, body: 0xffd93d, dark: 0xc4a000, leaf: accentAlt },
    grape: { light: 0xd0b4ff, body: 0x9b6cf0, dark: 0x6636b8, leaf: accentAlt },
    berry: { light: 0x9ad8ff, body: 0x3f9fe8, dark: 0x1f5fa8, leaf: accentAlt },
    melon: { light: 0x9fe8b3, body: 0x3fbf6b, dark: 0x1f7f45, leaf: accentAlt },
  },
  powerUps: {
    ice: { light: 0xe8fbff, body: 0x9be8d8, dark: 0x3aa6b8, accent: 0xffa8c0 },
    chili: { light: 0xffb08a, body: 0xf2483f, dark: 0xb21f2a, accent: 0x3fae5a },
  },
  effects: {
    slow: 0x6ec8ff,
    fast: 0xff8a3d,
  },
  leaf: accentAlt,
  eyeWhite: white,
  shine: white,
  cloud: white,
  tongue: 0xff5c8a,
  blush: 0xff8fa8,
  confetti: [accent, accentAlt, accentWarm, white, 0xff5c8a],
}

/**
 * The title logo is a brand asset, not UI chrome: its colours never follow the
 * current theme. Keep them here so a theme re-skin cannot wash out the wordmark.
 */
export interface SnakeLogoColors {
  face: number
  outline: number
  depth: number
  shadow: number
  fruit: number
  leaf: number
  eye: number
  shine: number
  ribbonHead: number
  ribbonTail: number
}

const snakeLogo: SnakeLogoColors = {
  face: cream,
  outline: 0x0c4a6e,
  depth: 0x0b3b57,
  shadow: 0x7dd3fc,
  fruit: 0xff5c8a,
  leaf: accentAlt,
  eye: ink,
  shine: white,
  // The wordmark lockup follows the playable snake's blue palette.
  ribbonHead: 0x7dd3fc,
  ribbonTail: 0x0369a1,
}

export const snakeColors = {
  theme: snakeTheme,
  art: snakeArt,
  logo: snakeLogo,
}
