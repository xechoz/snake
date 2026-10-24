import type { Theme } from '@mg/core'

const ink = 0x332b45
const muted = 0x65627a
const accent = 0x38bdf8
const accentAlt = 0x35c77e
const white = 0xffffff

function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

const snakeTheme = {
  bg: 0xbfeaff,
  bgAlt: 0xe8faef,
  board: 0xfff9ec,
  boardAlt: 0xeaf9e8,
  ink,
  accent,
  accentHover: 0x7dd3fc,
  accentAlt,
  accentWarm: 0xfff1b8,
  accentInk: '#0b7fae',
  accentText: cssColor(ink),
  text: cssColor(ink),
  textMuted: cssColor(muted),
  muted,
  panel: 0xfff9ec,
  panelStroke: ink,
  surface: white,
  surfaceAlt: 0xfff3d9,
  danger: 0xe8504a,
  dangerHover: 0xf26b64,
  onDanger: 0xfff9ec,
  highlight: white,
  overlay: 0x2a2038,
  shadow: ink,
  radius: 18,
  radiusLarge: 28,
} satisfies Partial<Theme>

export interface SnakeArtColors {
  sky: number
  snakeHead: number
  snakeTail: number
  fruit: readonly number[]
  leaf: number
  eyeWhite: number
  shine: number
  cloud: number
  confetti: readonly number[]
}

const snakeArt: SnakeArtColors = {
  sky: 0x5bc8f5,
  snakeHead: 0x7be8a6,
  snakeTail: 0x1e9e60,
  fruit: [0xff5c8a, 0xef5a6f, 0x8b7cf6],
  leaf: accentAlt,
  eyeWhite: white,
  shine: white,
  cloud: white,
  confetti: [accent, accentAlt, 0xfff1b8, white, 0xff5c8a],
}

export const snakeColors = {
  theme: snakeTheme,
  art: snakeArt,
}
