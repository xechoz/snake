import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { snakeColors } from './colors'

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
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

    expect(favicon).toContain(hex(snakeColors.theme.bg))
    expect(favicon).toContain(hex(snakeColors.theme.ink))
    expect(favicon).toContain(hex(snakeColors.art.snakeHead))
    expect(favicon).toContain(hex(snakeColors.art.leaf))
    expect(favicon).toContain(hex(snakeColors.art.fruit[0] ?? 0))
  })
})
