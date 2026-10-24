import type { Theme } from '@mg/core'

const ink = 0x332b45
const white = 0xffffff
const muted = 0x6b6178
const accent = 0x6e45e8
const accentAlt = 0x2fb673
const accentWarm = 0xffc94d
const cream = 0xfff9ec

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
  accentHover: 0x5a33ce,
  accentAlt,
  accentWarm,
  accentInk: '#4e2cb8',
  onAccent: cream,
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

export interface SnakeArtColors {
  snakeHead: number
  snakeTail: number
  fruit: readonly number[]
  leaf: number
  eyeWhite: number
  shine: number
  cloud: number
  tongue: number
  blush: number
  confetti: readonly number[]
}

const snakeArt: SnakeArtColors = {
  snakeHead: 0x7be8a6,
  snakeTail: 0x1e9e60,
  fruit: [0xff5c8a, 0xff7a59, 0xffb020],
  leaf: accentAlt,
  eyeWhite: white,
  shine: white,
  cloud: white,
  tongue: 0xff5c8a,
  blush: 0xff8fa8,
  confetti: [accent, accentAlt, accentWarm, white, 0xff5c8a],
}

export const snakeColors = {
  theme: snakeTheme,
  art: snakeArt,
}
