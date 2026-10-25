import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { snakeColors } from './colors'

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

function luminance(color: number): number {
  const channels = [16, 8, 0].map((shift) => {
    const value = ((color >> shift) & 0xff) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
}

function contrast(a: number, b: number): number {
  const lighter = Math.max(luminance(a), luminance(b))
  const darker = Math.min(luminance(a), luminance(b))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('snake colors', () => {
  it('keeps the browser branding in sync with the game palette', () => {
    const html = read('../index.html')
    const manifest = JSON.parse(read('../public/manifest.webmanifest')) as Record<string, string>
    const gameManifest = JSON.parse(read('../game.manifest.json')) as { themeColor: string }

    expect(html).toContain(`content="${hex(snakeColors.theme.bg)}"`)
    expect(manifest.background_color).toBe(hex(snakeColors.theme.bg))
    expect(manifest.theme_color).toBe(hex(snakeColors.theme.bg))
    expect(gameManifest.themeColor).toBe(hex(snakeColors.theme.accent))
  })

  it('keeps the favicon art in sync with the game palette', () => {
    const favicon = read('../public/favicon.svg').toLowerCase()

    expect(favicon).toContain(hex(snakeColors.theme.accent))
    expect(favicon).toContain(hex(snakeColors.theme.onAccent))
    expect(favicon).toContain(hex(snakeColors.theme.ink))
    expect(favicon).toContain(hex(snakeColors.art.snakeHead))
    expect(favicon).toContain(hex(snakeColors.art.leaf))
    expect(favicon).toContain(hex(snakeColors.art.fruits.apple.body))
  })

  it('keeps fruit and effect palettes distinct', () => {
    const fruitBodies = Object.values(snakeColors.art.fruits).map((fruit) => fruit.body)
    expect(new Set(fruitBodies).size).toBe(fruitBodies.length)

    expect(snakeColors.art.effects.slow).not.toBe(snakeColors.art.effects.fast)
    for (const fruit of Object.values(snakeColors.art.fruits)) {
      expect(contrast(fruit.light, fruit.dark)).toBeGreaterThanOrEqual(2)
    }
    expect(
      contrast(snakeColors.art.superFruit.light, snakeColors.art.superFruit.dark),
    ).toBeGreaterThanOrEqual(2)
  })

  it('keeps scenery foliage out of the edible palette', () => {
    const fruitColors = Object.values(snakeColors.art.fruits).flatMap((fruit) => [
      fruit.light,
      fruit.body,
      fruit.dark,
    ])
    const foliage = Object.values(snakeColors.art.foliage)

    for (const color of foliage) expect(fruitColors).not.toContain(color)
    expect(new Set(foliage).size).toBe(foliage.length)
  })

  it('keeps text readable in every supported role', () => {
    const { theme } = snakeColors

    expect(contrast(theme.accentInk, theme.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme.accentInk, theme.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme.onAccent, theme.accentHover)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme.onDanger, theme.danger)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme.muted, theme.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme.muted, theme.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('darkens the accent on hover instead of washing it out', () => {
    expect(luminance(snakeColors.theme.accentHover)).toBeLessThan(
      luminance(snakeColors.theme.accent),
    )
  })

  it('keeps the title logo readable and independent from theme colours', () => {
    const logo = snakeColors.logo

    expect(contrast(logo.face, logo.outline)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(logo.outline, logo.shadow)).toBeGreaterThanOrEqual(3)
    expect(contrast(logo.ribbonHead, logo.outline)).toBeGreaterThanOrEqual(3)
    // The fruit is decorative and always carries a dark outline.
    expect(contrast(logo.fruit, logo.outline)).toBeGreaterThanOrEqual(2.5)
    // The lockup keeps the playable snake's blue gradient.
    expect(logo.ribbonHead).toBe(snakeColors.art.snakeHead)
    expect(logo.ribbonTail).toBe(snakeColors.art.snakeTail)

    const source = read('./ui/logo.ts')
    const themeRefs = source.match(/theme\.[a-zA-Z]+/g) ?? []
    expect(themeRefs.every((ref) => ref === 'theme.font')).toBe(true)
  })
})
