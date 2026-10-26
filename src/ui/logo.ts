import { cssColor, getServices, getTextResolution, mixColor } from '@mg/core'
import type Phaser from 'phaser'
import { type SnakeLogoColors, skinGradient, snakeColors } from '../colors'
import type { SkinPalette } from '../skins'
import { drawBlockSnakeBody, drawSnakeHead, type Point, type SnakeBlock } from './snakeArt'

const FONT_SIZE = 104
const STROKE = 9
const DEPTH_OFFSET = 7
const SHADOW_OFFSET = { x: 8, y: 14 }
const CHAR_GAP = 9
const HEAD_RADIUS = 22
const RIBBON_CELL = 22
const RIBBON_OUTLINE = 3.2
const RIBBON_TAIL_PAD = 6
const RIBBON_HEAD_PAD = 32
const RIBBON_HEAD_OFFSET = 10
const RIBBON_BASELINE = 0.62

/** The title lockup, with its own fixed palette instead of the UI theme. */
export interface SnakeLogo {
  container: Phaser.GameObjects.Container
  width: number
  height: number
  playEntrance: () => void
}

interface Glyph {
  container: Phaser.GameObjects.Container
  width: number
  height: number
}

export function createSnakeLogo(scene: Phaser.Scene, skin: SkinPalette | null = null): SnakeLogo {
  const services = getServices()
  const font = services.theme.font
  const logo = skin ? logoForSkin(skin) : snakeColors.logo
  const title = displayTitle(services.i18n.t('game.title'))
  const glyphs = title.map((character) => createGlyph(scene, character, font, logo))
  const totalWidth =
    glyphs.reduce((sum, glyph) => sum + glyph.width, 0) + CHAR_GAP * (glyphs.length - 1)
  const glyphHeight = Math.max(...glyphs.map((glyph) => glyph.height), FONT_SIZE)

  const wordmark = scene.add.container(0, 0)
  let cursor = -totalWidth / 2
  glyphs.forEach((glyph, index) => {
    const { wave, angle } = glyphTransform(index, glyphs.length)
    glyph.container.setPosition(cursor + glyph.width / 2, wave)
    glyph.container.setAngle(angle)
    wordmark.add(glyph.container)
    cursor += glyph.width + CHAR_GAP
  })

  const ribbonY = glyphHeight * RIBBON_BASELINE
  const halo = scene.add.graphics()
  const haloWidth = totalWidth + 96
  const haloHeight = glyphHeight + 76
  for (let index = 0; index < 5; index += 1) {
    const shrink = 1 - index * 0.13
    halo.fillStyle(logo.shadow, 0.07)
    halo.fillEllipse(0, 4, haloWidth * shrink, haloHeight * shrink)
  }

  const { blocks, cell, headX, headY, headDirection, extent } = createRibbon(
    totalWidth,
    ribbonY,
    logo,
    skin,
  )
  const ribbon = scene.add.graphics()
  drawBlockSnakeBody(ribbon, blocks, cell, logo.outline, RIBBON_OUTLINE)

  const head = scene.add.graphics()
  const drawHead = (): void => {
    const now = scene.time.now
    const blink = now % 3800 < 130
    const flickPhase = now % 3100
    const tongue = flickPhase < 300 ? Math.sin((flickPhase / 300) * Math.PI) : 0
    head.clear()
    drawSnakeHead(head, headX, headY, headDirection, HEAD_RADIUS, logo.eye, logo.ribbonHead, 4, {
      blink,
      tongue,
    })
  }
  drawHead()
  const headTimer = scene.time.addEvent({ delay: 90, loop: true, callback: drawHead })
  scene.events.once('shutdown', () => headTimer.remove())

  const fruit = scene.add.graphics()
  drawLogoFruit(fruit, logo)
  const fruitX = -totalWidth / 2 - 28
  const fruitY = ribbonY - 4
  const fruitGroup = scene.add.container(fruitX, fruitY, [fruit])
  const snakeGroup = scene.add.container(0, 0, [ribbon, head])

  const left = Math.min(-totalWidth / 2 - 26, fruitX - 30, extent.left)
  const right = Math.max(totalWidth / 2 + 20, headX + HEAD_RADIUS + 8, extent.right)
  const width = right - left
  const top = Math.min(-glyphHeight / 2 - 8, fruitY - 32, extent.top)
  const bottom = Math.max(glyphHeight / 2, headY + HEAD_RADIUS + 8, fruitY + 30, extent.bottom)
  const height = bottom - top + 8

  const bob = scene.add.container(0, 0, [halo, wordmark, snakeGroup, fruitGroup])
  const content = scene.add.container(-(left + right) / 2, -(top + bottom) / 2, [bob])
  const container = scene.add.container(0, 0, [content])

  scene.tweens.add({
    targets: bob,
    y: -4,
    duration: 1700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
    delay: 900,
  })
  scene.tweens.add({
    targets: fruitGroup,
    scale: 1.08,
    duration: 1300,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
    delay: 900,
  })

  const playEntrance = (): void => {
    glyphs.forEach((glyph, index) => {
      const restY = glyph.container.y
      glyph.container
        .setAlpha(0)
        .setScale(0.72)
        .setY(restY + 26)
      scene.tweens.add({
        targets: glyph.container,
        alpha: 1,
        scale: 1,
        y: restY,
        duration: 420,
        delay: 60 * index,
        ease: 'Back.out',
      })
    })
    snakeGroup.x = -36
    snakeGroup.setAlpha(0)
    scene.tweens.add({
      targets: snakeGroup,
      alpha: 1,
      duration: 520,
      delay: 220,
      ease: 'Cubic.out',
    })
    scene.tweens.add({
      targets: snakeGroup,
      x: 0,
      duration: 520,
      delay: 220,
      ease: 'Cubic.out',
    })
    fruitGroup.setAlpha(0).setScale(0.2)
    scene.tweens.add({
      targets: fruitGroup,
      alpha: 1,
      scale: 1,
      duration: 380,
      delay: 520,
      ease: 'Back.out',
    })
  }

  return { container, width, height, playEntrance }
}

function logoForSkin(skin: SkinPalette): SnakeLogoColors {
  const fruits = snakeColors.art.fruits
  return {
    ...snakeColors.logo,
    shadow: fruits[skin[2]].light,
    fruit: fruits[skin[1]].body,
    ribbonHead: fruits[skin[2]].light,
    ribbonTail: fruits[skin[0]].dark,
  }
}

function displayTitle(title: string): string[] {
  const latin = /^[\x20-\x7e]+$/.test(title)
  return [...(latin ? title.toUpperCase() : title)]
}

function createGlyph(
  scene: Phaser.Scene,
  character: string,
  font: string,
  logo: SnakeLogoColors,
): Glyph {
  const style = (
    color: number,
    strokeThickness: number,
  ): Phaser.Types.GameObjects.Text.TextStyle => ({
    fontFamily: font,
    fontSize: `${FONT_SIZE}px`,
    fontStyle: 'bold',
    color: cssColor(color),
    stroke: cssColor(logo.outline),
    strokeThickness,
    resolution: getTextResolution(),
  })

  const face = scene.add.text(0, 0, character, style(logo.face, STROKE)).setOrigin(0.5)
  const depth = scene.add
    .text(0, 0, character, style(logo.depth, STROKE))
    .setOrigin(0.5)
    .setPosition(0, DEPTH_OFFSET)
  const shadow = scene.add
    .text(0, 0, character, style(logo.shadow, STROKE + 2))
    .setOrigin(0.5)
    .setPosition(SHADOW_OFFSET.x, SHADOW_OFFSET.y)

  const container = scene.add.container(0, 0, [shadow, depth, face])
  return { container, width: face.width, height: face.height }
}

function glyphTransform(index: number, count: number): { wave: number; angle: number } {
  const t = count <= 1 ? 0.5 : index / (count - 1)
  const wave = Math.sin(t * Math.PI) * -7 + (index % 2 === 0 ? 1.5 : -1.5)
  const angle = (index % 2 === 0 ? -2.2 : 2.2) * (count > 4 ? 0.7 : 1)
  return { wave, angle }
}

interface RibbonExtent {
  left: number
  right: number
  top: number
  bottom: number
}

interface RibbonLayout {
  blocks: SnakeBlock[]
  cell: number
  headX: number
  headY: number
  headDirection: Point
  extent: RibbonExtent
}

/**
 * The logo underline is a cell-aligned snake like the one on the board: equal
 * rounded tiles, orthogonal steps only, built from the tail towards the head.
 */
function createRibbon(
  totalWidth: number,
  ribbonY: number,
  logo: SnakeLogoColors,
  skin: SkinPalette | null,
): RibbonLayout {
  const startX = -totalWidth / 2 - RIBBON_TAIL_PAD
  const endX = totalWidth / 2 + RIBBON_HEAD_PAD
  const span = endX - startX
  const columns = Math.max(6, Math.round(span / RIBBON_CELL))
  const cell = span / columns
  const turns = [
    { column: Math.round(columns * 0.28), row: 1 },
    { column: Math.round(columns * 0.48), row: 0 },
    { column: Math.round(columns * 0.68), row: 1 },
    { column: Math.round(columns * 0.88), row: 0 },
  ]

  const cells: Point[] = [{ x: startX, y: ribbonY }]
  let row = 0
  let turnIndex = 0
  for (let column = 1; column <= columns; column += 1) {
    cells.push({ x: startX + column * cell, y: ribbonY + row * cell })
    const turn = turns[turnIndex]
    if (turn && column === turn.column) {
      row = turn.row
      cells.push({ x: startX + column * cell, y: ribbonY + row * cell })
      turnIndex += 1
    }
  }

  const last = cells.length - 1
  const blocks: SnakeBlock[] = cells
    .map((point, index) => ({
      x: point.x,
      y: point.y,
      color: skin
        ? skinGradient(skin, index / last)
        : mixColor(logo.ribbonTail, logo.ribbonHead, index / last),
    }))
    .reverse()

  const tip = cells[last]
  const previous = cells[last - 1]
  const dx = tip && previous ? tip.x - previous.x : 1
  const dy = tip && previous ? tip.y - previous.y : 0
  const length = Math.hypot(dx, dy) || 1
  const headDirection = { x: dx / length, y: dy / length }
  const headX = (tip?.x ?? endX) + headDirection.x * RIBBON_HEAD_OFFSET
  const headY = (tip?.y ?? ribbonY) + headDirection.y * RIBBON_HEAD_OFFSET

  const half = cell / 2 + RIBBON_OUTLINE
  const xs = cells.map((point) => point.x)
  const ys = cells.map((point) => point.y)
  const extent: RibbonExtent = {
    left: Math.min(...xs) - half,
    right: Math.max(...xs) + half,
    top: Math.min(...ys) - half,
    bottom: Math.max(...ys) + half,
  }

  return { blocks, cell, headX, headY, headDirection, extent }
}

function drawLogoFruit(graphics: Phaser.GameObjects.Graphics, logo: SnakeLogoColors): void {
  const radius = 18
  graphics.fillStyle(logo.fruit, 0.18)
  graphics.fillCircle(0, 0, radius * 1.7)
  graphics.fillStyle(logo.outline, 1)
  graphics.fillCircle(0, 0, radius + 3)
  graphics.fillStyle(logo.fruit, 1)
  graphics.fillCircle(0, 0, radius)

  graphics.fillStyle(logo.shine, 0.6)
  graphics.fillCircle(-radius * 0.3, -radius * 0.34, radius * 0.26)
  graphics.fillStyle(logo.shine, 0.85)
  graphics.fillCircle(radius * 0.34, -radius * 0.42, radius * 0.09)

  graphics.fillStyle(logo.outline, 1)
  graphics.fillEllipse(radius * 0.42, -radius - 4, radius * 0.62 + 3, radius * 0.32 + 3)
  graphics.fillStyle(logo.leaf, 1)
  graphics.fillEllipse(radius * 0.42, -radius - 4, radius * 0.62, radius * 0.32)
  graphics.lineStyle(Math.max(2, radius * 0.16), logo.outline, 1)
  graphics.lineBetween(0, -radius - 1, 0, -radius - radius * 0.34)
}
