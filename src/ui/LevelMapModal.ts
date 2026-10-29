import { Button, cssColor, getServices, readViewport, type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { snakeColors } from '../colors'
import { levelsOf, WORLDS } from '../logic/levels'
import { isLevelUnlocked, starsInWorld, worldUnlocked } from '../logic/progress'
import type { SnakeSave } from '../save'
import { CloseButton } from './CloseButton'
import { drawStar } from './gardenArt'

export interface LevelMapModalOptions {
  theme: Theme
  save: SnakeSave
  onSelect: (levelId: string) => void
  onEndless: () => void
  onCollection: () => void
  onClose?: () => void
}

const CARD_MARGIN = 28
const NODE_GAP = 12
const WORLD_GAP = 20
const HEADER_HEIGHT = 30
const STARS_HEIGHT = 20

export class LevelMapModal extends Phaser.GameObjects.Container {
  private closed = false

  constructor(scene: Phaser.Scene, options: LevelMapModalOptions) {
    super(scene, 0, 0)
    scene.add.existing(this).setDepth(2000)
    const services = getServices()
    const theme = options.theme
    const viewport = readViewport(scene)
    const width = viewport.width
    const height = viewport.height

    const openedAt = scene.time.now
    const backdrop = scene.add
      .rectangle(0, 0, width, height, theme.overlay, 0.72)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
    backdrop.on('pointerup', () => {
      // The opening click lands on the new backdrop in the same input frame on
      // some viewports. Ignore that first frame so the map does not flash shut.
      if (scene.time.now - openedAt < 180) return
      this.close()
    })
    this.add(backdrop)

    const cardWidth = Math.min(width - CARD_MARGIN, 980)
    const cardHeight = Math.min(height - CARD_MARGIN, 680)
    const card = scene.add.container(width / 2, height / 2)
    this.add(card)

    const shield = scene.add.rectangle(0, 0, cardWidth, cardHeight, 0, 0).setInteractive()
    card.add(shield)

    const panel = scene.add.graphics()
    panel.fillStyle(theme.shadow, 0.18)
    panel.fillRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2 + 6,
      cardWidth,
      cardHeight,
      theme.radiusLarge,
    )
    panel.fillStyle(theme.panel, 1)
    panel.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, theme.radiusLarge)
    panel.lineStyle(2, theme.borderSoft, 1)
    panel.strokeRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      theme.radiusLarge,
    )
    card.add(panel)

    const title = scene.add
      .text(
        0,
        -cardHeight / 2 + 46,
        services.i18n.t('menu.levels'),
        textStyle(theme, 34, theme.text, true),
      )
      .setOrigin(0.5)
    card.add(title)

    const close = new CloseButton(scene, cardWidth / 2 - 40, -cardHeight / 2 + 42, theme, {
      size: 56,
      onClick: () => this.close(),
    })
    card.add(close)

    const contentWidth = cardWidth - 72
    const columns = 6
    const maxNode = 92
    const contentTop = -cardHeight / 2 + 94
    const contentBottom = cardHeight / 2 - 104
    const available = contentBottom - contentTop
    const widthNode = (contentWidth - (columns - 1) * NODE_GAP) / columns
    const heightNode =
      (available - WORLDS.length * (HEADER_HEIGHT + STARS_HEIGHT + WORLD_GAP)) / WORLDS.length
    const nodeSize = Math.max(36, Math.min(maxNode, widthNode, heightNode))

    // Two worlds fit comfortably; the height is shared so a future third or
    // fourth world only has to add a row to the same layout.
    const block = HEADER_HEIGHT + nodeSize + STARS_HEIGHT + WORLD_GAP
    const start = contentTop + Math.max(0, (available - WORLDS.length * block) / 2)

    WORLDS.forEach((world, worldIndex) => {
      const top = start + worldIndex * block
      const unlocked = worldUnlocked(options.save, world.id)
      const header = scene.add
        .text(
          -contentWidth / 2,
          top,
          services.i18n.t(world.nameKey),
          textStyle(theme, 22, unlocked ? theme.text : theme.textMuted, true),
        )
        .setOrigin(0, 0)
      card.add(header)

      const stars = starsInWorld(options.save, world.id)
      const maxStars = levelsOf(world.id).length * 3
      const starLabel = scene.add
        .text(
          contentWidth / 2,
          top,
          `${stars} / ${maxStars} ★`,
          textStyle(theme, 18, unlocked ? cssColor(theme.accentInk) : theme.textMuted, true),
        )
        .setOrigin(1, 0)
      card.add(starLabel)

      levelsOf(world.id).forEach((level, index) => {
        const row = Math.floor(index / columns)
        const column = index % columns
        const x = -contentWidth / 2 + column * (nodeSize + NODE_GAP) + nodeSize / 2
        const y = top + HEADER_HEIGHT + row * (nodeSize + STARS_HEIGHT + NODE_GAP) + nodeSize / 2
        const open = unlocked && isLevelUnlocked(options.save, level.id)
        const record = options.save.levels[level.id]
        this.addNode(card, {
          scene,
          theme,
          x,
          y,
          size: nodeSize,
          open,
          stars: record?.stars ?? 0,
          label: level.id.split('-')[1] ?? level.id,
          onSelect: () => {
            if (!open) return
            options.onSelect(level.id)
            this.close()
          },
        })
      })
    })

    const footerY = cardHeight / 2 - 48
    const footerGap = 16
    const buttonWidth = Math.min(240, (cardWidth - 120 - footerGap) / 2)
    const endless = new Button(
      scene,
      -buttonWidth / 2 - footerGap / 2,
      footerY,
      services.i18n.t('menu.endless'),
      theme,
      {
        width: buttonWidth,
        height: 64,
        variant: 'soft',
        fontSize: 22,
        icon: 'play',
        onClick: () => {
          options.onEndless()
          this.close()
        },
      },
    )
    const collection = new Button(
      scene,
      buttonWidth / 2 + footerGap / 2,
      footerY,
      services.i18n.t('level.collection'),
      theme,
      {
        width: buttonWidth,
        height: 64,
        variant: 'soft',
        fontSize: 22,
        icon: 'bag',
        onClick: () => {
          options.onCollection()
          this.close()
        },
      },
    )
    card.add([endless, collection])

    const onEsc = (): void => this.close()
    scene.input.keyboard?.on('keydown-ESC', onEsc)
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.keyboard?.off('keydown-ESC', onEsc)
      options.onClose?.()
    })

    this.setAlpha(0)
    card.setScale(0.96)
    scene.tweens.add({ targets: this, alpha: 1, duration: 150 })
    scene.tweens.add({ targets: card, scale: 1, duration: 190, ease: 'Back.Out' })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.destroy(true)
  }

  private addNode(
    card: Phaser.GameObjects.Container,
    options: {
      scene: Phaser.Scene
      theme: Theme
      x: number
      y: number
      size: number
      open: boolean
      stars: number
      label: string
      onSelect: () => void
    },
  ): void {
    const { scene, theme, x, y, size, open, stars } = options
    const node = scene.add.container(x, y)
    const graphics = scene.add.graphics()

    const radius = Math.min(22, size * 0.24)
    graphics.fillStyle(theme.shadow, 0.12)
    graphics.fillRoundedRect(-size / 2 + 1, -size / 2 + 3, size, size, radius)
    graphics.fillStyle(open ? theme.surface : theme.borderSoft, open ? 1 : 0.35)
    graphics.fillRoundedRect(-size / 2, -size / 2, size, size, radius)
    graphics.lineStyle(2, open ? theme.accentAlt : theme.borderSoft, open ? 1 : 0.6)
    graphics.strokeRoundedRect(-size / 2 + 1, -size / 2 + 1, size - 2, size - 2, radius)

    const label = scene.add
      .text(0, -2, open ? options.label : '', {
        ...textStyle(theme, Math.round(size * 0.34), theme.text, true),
      })
      .setOrigin(0.5)
    node.add([graphics, label])

    if (!open) {
      const lock = scene.add.graphics()
      lock.lineStyle(3, theme.muted, 0.8)
      lock.lineBetween(0, -2, 0, 8)
      lock.strokeCircle(0, -8, 7)
      lock.fillStyle(theme.muted, 0.8)
      lock.fillRoundedRect(-10, -2, 20, 18, 4)
      lock.lineStyle(2, theme.muted, 0.8)
      lock.strokeRoundedRect(-10, -2, 20, 18, 4)
      node.add(lock)
    }

    const starGraphics = scene.add.graphics()
    for (let index = 0; index < 3; index += 1) {
      drawStar(
        starGraphics,
        (index - 1) * 13,
        size / 2 + 11,
        6,
        2.6,
        index < stars ? snakeColors.art.garden.gold : theme.borderSoft,
        theme.ink,
        1,
      )
    }
    node.add(starGraphics)

    if (open) {
      node.setSize(size + 6, size + 6)
      node.setInteractive({ useHandCursor: true })
      node.on('pointerover', () => node.setScale(1.04))
      node.on('pointerout', () => node.setScale(1))
      node.on('pointerup', options.onSelect)
    }

    card.add(node)
  }
}
