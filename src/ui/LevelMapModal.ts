import {
  Button,
  cssColor,
  getServices,
  mixColor,
  readViewport,
  type Theme,
  textStyle,
} from '@mg/core'
import Phaser from 'phaser'
import { snakeColors } from '../colors'
import { levelsOf, WORLDS } from '../logic/levels'
import { isLevelUnlocked, nextLevelId, starsInWorld, worldUnlocked } from '../logic/progress'
import type { SnakeSave } from '../save'
import { CloseButton } from './CloseButton'
import { drawBud, drawFlower, drawStar } from './gardenArt'
import type { Point, Rect } from './layout'
import {
  computeLevelMapLayout,
  type LevelMapLayout,
  type LevelMapNode,
  type LevelMapWorld,
} from './levelMapLayout'

export interface LevelMapModalOptions {
  theme: Theme
  save: SnakeSave
  onSelect: (levelId: string) => void
  onCollection: () => void
  onClose?: () => void
}

const BACKDROP_CLOSE_GUARD = 180

export class LevelMapModal extends Phaser.GameObjects.Container {
  private closed = false

  constructor(scene: Phaser.Scene, options: LevelMapModalOptions) {
    super(scene, 0, 0)
    scene.add.existing(this).setDepth(2000)
    const services = getServices()
    const theme = options.theme
    const viewport = readViewport(scene)
    const save = options.save
    const currentId = nextLevelId(save)
    const allComplete = (save.levels[currentId]?.stars ?? 0) > 0

    const layout = computeLevelMapLayout({
      viewport,
      worlds: WORLDS.map((world) => {
        const levels = levelsOf(world.id)
        return {
          id: world.id,
          nameKey: world.nameKey,
          stars: starsInWorld(save, world.id),
          maxStars: levels.length * 3,
          unlocked: worldUnlocked(save, world.id),
          gateStars: world.starGate,
          levels: levels.map((level) => {
            const record = save.levels[level.id]
            const stars = record?.stars ?? 0
            return {
              id: level.id,
              label: level.id.split('-')[1] ?? level.id,
              open: isLevelUnlocked(save, level.id),
              stars,
              current: !allComplete && level.id === currentId && stars === 0,
            }
          }),
        }
      }),
    })

    const openedAt = scene.time.now
    const backdrop = scene.add
      .rectangle(0, 0, viewport.width, viewport.height, theme.overlay, 0.72)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
    backdrop.on('pointerup', () => {
      if (scene.time.now - openedAt < BACKDROP_CLOSE_GUARD) return
      this.close()
    })
    this.add(backdrop)

    const card = scene.add.container(
      layout.card.x + layout.card.width / 2,
      layout.card.y + layout.card.height / 2,
    )
    this.add(card)

    const shield = scene.add
      .rectangle(0, 0, layout.card.width, layout.card.height, 0, 0)
      .setInteractive()
    card.add(shield)

    const centerX = layout.card.x + layout.card.width / 2
    const centerY = layout.card.y + layout.card.height / 2
    const local = (point: Point): Point => ({ x: point.x - centerX, y: point.y - centerY })
    const localRect = (rect: Rect): Rect => ({
      x: rect.x - centerX,
      y: rect.y - centerY,
      width: rect.width,
      height: rect.height,
    })

    this.drawPanel(card, layout, theme)
    this.drawWorldBands(card, layout, theme, localRect)
    this.drawTrails(card, layout, theme, local)
    this.drawWorldHeaders(card, layout, theme, local)

    const hint = scene.add
      .text(0, -layout.card.height / 2 + 72, '', {
        ...textStyle(theme, 15, theme.textMuted),
        backgroundColor: cssColor(theme.panel),
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setWordWrapWidth(layout.content.width - 48)
      .setVisible(false)
    card.add(hint)

    layout.worlds.forEach((world, worldIndex) => {
      const nextWorld = layout.worlds[worldIndex + 1]
      if (world.gate) this.drawGate(card, world, nextWorld, theme, localRect)
      world.nodes.forEach((node, index) => {
        this.addNode(card, {
          scene,
          theme,
          node,
          world,
          index,
          local: local({ x: node.x, y: node.y }),
          hint,
          onSelect: options.onSelect,
          close: () => this.close(),
        })
      })
      if (world.gate && nextWorld) this.drawGateLabel(card, world, nextWorld, theme, localRect)
    })

    const title = scene.add
      .text(
        0,
        -layout.card.height / 2 + 38,
        services.i18n.t('level.map'),
        textStyle(theme, 32, theme.text, true),
      )
      .setOrigin(0.5)
    card.add(title)

    const close = new CloseButton(
      scene,
      layout.card.width / 2 - 40,
      -layout.card.height / 2 + 40,
      theme,
      {
        size: 56,
        onClick: () => this.close(),
      },
    )
    card.add(close)

    const footerY = layout.footer.y - centerY
    const collection = new Button(scene, 0, footerY, services.i18n.t('level.collection'), theme, {
      width: layout.footer.buttonWidth,
      height: 60,
      variant: 'soft',
      fontSize: 21,
      icon: 'bag',
      onClick: () => {
        options.onCollection()
        this.close()
      },
    })
    card.add(collection)

    const onEsc = (): void => this.close()
    scene.input.keyboard?.on('keydown-ESC', onEsc)
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.keyboard?.off('keydown-ESC', onEsc)
      options.onClose?.()
    })

    this.setAlpha(0)
    card.setScale(0.97)
    scene.tweens.add({ targets: this, alpha: 1, duration: 150 })
    scene.tweens.add({ targets: card, scale: 1, duration: 190, ease: 'Back.Out' })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.destroy(true)
  }

  private drawPanel(
    card: Phaser.GameObjects.Container,
    layout: LevelMapLayout,
    theme: Theme,
  ): void {
    const panel = card.scene.add.graphics()
    const width = layout.card.width
    const height = layout.card.height
    panel.fillStyle(theme.shadow, 0.18)
    panel.fillRoundedRect(-width / 2 + 2, -height / 2 + 6, width, height, theme.radiusLarge)
    panel.fillStyle(theme.panel, 1)
    panel.fillRoundedRect(-width / 2, -height / 2, width, height, theme.radiusLarge)
    panel.lineStyle(2, theme.borderSoft, 1)
    panel.strokeRoundedRect(-width / 2, -height / 2, width, height, theme.radiusLarge)
    panel.lineStyle(1, theme.borderSoft, 0.45)
    panel.lineBetween(-width / 2 + 24, height / 2 - 74, width / 2 - 24, height / 2 - 74)
    card.add(panel)
  }

  private drawWorldBands(
    card: Phaser.GameObjects.Container,
    layout: LevelMapLayout,
    theme: Theme,
    localRect: (rect: Rect) => Rect,
  ): void {
    const garden = snakeColors.art.garden
    const graphics = card.scene.add.graphics()
    for (const [index, world] of layout.worlds.entries()) {
      const rect = localRect(world.bounds)
      const tint =
        world.id === 'bog'
          ? mixColor(theme.surface, garden.waterLight, 0.42)
          : mixColor(theme.surface, garden.hedgeLight, 0.32)
      graphics.fillStyle(tint, 0.55)
      graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 22)
      graphics.lineStyle(1.5, theme.borderSoft, 0.45)
      graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 22)

      // A few deterministic tufts or ripples keep each band from reading as a
      // plain rounded rectangle without adding an image asset.
      const marks = 7
      for (let mark = 0; mark < marks; mark += 1) {
        const x = rect.x + 24 + ((mark * 97 + index * 41) % Math.max(1, rect.width - 48))
        const y = rect.y + 42 + ((mark * 53 + index * 29) % Math.max(1, rect.height - 58))
        if (world.id === 'bog') {
          graphics.lineStyle(2, garden.water, 0.18)
          graphics.lineBetween(x, y, x + 22, y)
          graphics.lineBetween(x + 7, y + 5, x + 17, y + 5)
        } else {
          graphics.fillStyle(garden.hedgeLight, 0.35)
          graphics.fillCircle(x, y, 3.5)
          graphics.fillStyle(garden.hedge, 0.25)
          graphics.fillCircle(x + 5, y + 2, 2.5)
        }
      }
    }
    card.add(graphics)
  }

  private drawTrails(
    card: Phaser.GameObjects.Container,
    layout: LevelMapLayout,
    theme: Theme,
    local: (point: Point) => Point,
  ): void {
    const graphics = card.scene.add.graphics()
    layout.worlds.forEach((world, worldIndex) => {
      world.nodes.forEach((node, index) => {
        const next = world.nodes[index + 1]
        if (!next) return
        const color = next.open || next.stars > 0 ? theme.accentAlt : theme.borderSoft
        drawTrail(
          graphics,
          local({ x: node.x, y: node.y }),
          local({ x: next.x, y: next.y }),
          node.size,
          next.size,
          color,
          0.8,
        )
      })

      const nextWorld = layout.worlds[worldIndex + 1]
      if (world.gate && nextWorld) {
        const last = world.nodes[world.nodes.length - 1]
        const first = nextWorld.nodes[0]
        if (last && first) {
          const gate = {
            x: world.gate.x + world.gate.width / 2,
            y: world.gate.y + world.gate.height / 2,
          }
          const color = nextWorld.unlocked ? theme.accentAlt : theme.borderSoft
          drawTrail(
            graphics,
            local({ x: last.x, y: last.y }),
            local(gate),
            last.size,
            0,
            color,
            0.5,
          )
          drawTrail(
            graphics,
            local(gate),
            local({ x: first.x, y: first.y }),
            0,
            first.size,
            color,
            0.5,
          )
        }
      }
    })
    card.add(graphics)
  }

  private drawWorldHeaders(
    card: Phaser.GameObjects.Container,
    layout: LevelMapLayout,
    theme: Theme,
    local: (point: Point) => Point,
  ): void {
    const services = getServices()
    for (const world of layout.worlds) {
      const header = local(world.header)
      const stars = local(world.starsLabel)
      const title = card.scene.add
        .text(
          header.x,
          header.y,
          services.i18n.t(world.nameKey),
          textStyle(theme, 22, world.unlocked ? theme.text : theme.textMuted, true),
        )
        .setOrigin(0, 0)
      const starLabel = card.scene.add
        .text(
          stars.x,
          stars.y,
          `${world.stars} / ${world.maxStars} ★`,
          textStyle(theme, 17, world.unlocked ? cssColor(theme.accentInk) : theme.textMuted, true),
        )
        .setOrigin(1, 0)
      card.add([title, starLabel])
    }
  }

  private drawGate(
    card: Phaser.GameObjects.Container,
    world: LevelMapWorld,
    nextWorld: LevelMapWorld | undefined,
    theme: Theme,
    localRect: (rect: Rect) => Rect,
  ): void {
    if (!world.gate) return
    const rect = localRect(world.gate)
    const color = nextWorld?.unlocked ? theme.accentAlt : theme.muted
    const graphics = card.scene.add.graphics()
    graphics.fillStyle(theme.panel, 0.9)
    graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 16)
    graphics.lineStyle(2, color, 0.65)
    graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 16)
    const centerY = rect.y + rect.height / 2
    graphics.lineStyle(3, color, 0.75)
    graphics.lineBetween(rect.x + 10, centerY, rect.x + rect.width - 10, centerY)
    for (let post = 0; post < 7; post += 1) {
      const x = rect.x + 24 + (post * (rect.width - 48)) / 6
      graphics.lineStyle(2, color, 0.55)
      graphics.lineBetween(x, centerY - 11, x, centerY + 11)
    }
    card.add(graphics)
  }

  private drawGateLabel(
    card: Phaser.GameObjects.Container,
    world: LevelMapWorld,
    nextWorld: LevelMapWorld,
    theme: Theme,
    localRect: (rect: Rect) => Rect,
  ): void {
    if (!world.gate) return
    const services = getServices()
    const rect = localRect(world.gate)
    const width = Math.min(280, rect.width * 0.48)
    const x = rect.x + rect.width / 2
    const y = rect.y + rect.height / 2
    const color = nextWorld.unlocked ? cssColor(theme.accentInk) : theme.textMuted
    const labelText = nextWorld.unlocked
      ? `★ ${nextWorld.gateStars}`
      : services.i18n.t('level.mapGate', { stars: nextWorld.gateStars })
    const label = card.scene.add
      .text(x, y, labelText, textStyle(theme, 15, color, true))
      .setOrigin(0.5)
    const badge = card.scene.add.graphics()
    badge.fillStyle(theme.panel, 1)
    badge.fillRoundedRect(x - width / 2, y - 16, width, 32, 16)
    badge.lineStyle(1.5, nextWorld.unlocked ? theme.accentAlt : theme.borderSoft, 0.8)
    badge.strokeRoundedRect(x - width / 2, y - 16, width, 32, 16)
    card.add([badge, label])
  }

  private addNode(
    card: Phaser.GameObjects.Container,
    options: {
      scene: Phaser.Scene
      theme: Theme
      node: LevelMapNode
      world: LevelMapWorld
      index: number
      local: Point
      hint: Phaser.GameObjects.Text
      onSelect: (levelId: string) => void
      close: () => void
    },
  ): void {
    const { scene, theme, node, world, index, local, hint } = options
    const services = getServices()
    const garden = snakeColors.art.garden
    const container = scene.add.container(local.x, local.y)
    const radius = node.size / 2
    const active = node.open || node.stars > 0
    const color =
      snakeColors.art.confetti[
        (index + (world.id === 'bog' ? 2 : 0)) % snakeColors.art.confetti.length
      ] ?? garden.petal

    const graphics = scene.add.graphics()
    graphics.fillStyle(theme.shadow, 0.16)
    graphics.fillCircle(0, 3, radius + 1)
    graphics.fillStyle(active ? garden.soil : theme.borderSoft, active ? 1 : 0.42)
    graphics.fillCircle(0, 0, radius)
    graphics.lineStyle(
      2.5,
      node.stars > 0 ? garden.hedge : active ? garden.soilEdge : theme.muted,
      active ? 0.9 : 0.55,
    )
    graphics.strokeCircle(0, 0, radius)

    if (node.stars > 0) {
      drawFlower(graphics, 0, 0, radius * 0.52, color, scene.time.now, theme)
    } else if (active) {
      drawBud(graphics, 0, 0, radius * 0.42, color, scene.time.now, theme)
    } else {
      graphics.lineStyle(3, theme.muted, 0.8)
      graphics.strokeCircle(0, -radius * 0.16, radius * 0.22)
      graphics.fillStyle(theme.muted, 0.8)
      graphics.fillRoundedRect(-radius * 0.3, -radius * 0.03, radius * 0.6, radius * 0.4, 4)
      graphics.lineStyle(2, theme.muted, 0.8)
      graphics.strokeRoundedRect(-radius * 0.3, -radius * 0.03, radius * 0.6, radius * 0.4, 4)
    }

    if (node.current) {
      graphics.lineStyle(4, theme.accent, 0.9)
      graphics.strokeCircle(0, 0, radius + 6)
    }

    const label = scene.add
      .text(
        0,
        radius + 12,
        node.label,
        textStyle(
          theme,
          Math.max(13, Math.round(node.size * 0.17)),
          active ? theme.text : theme.textMuted,
          true,
        ),
      )
      .setOrigin(0.5)
    const stars = scene.add.graphics()
    for (let star = 0; star < 3; star += 1) {
      drawStar(
        stars,
        (star - 1) * 14,
        radius + 32,
        6,
        2.6,
        star < node.stars ? garden.gold : theme.borderSoft,
        theme.ink,
        1,
      )
    }
    container.add([graphics, label, stars])

    container.setSize(node.size + 12, node.size + 52)
    container.setInteractive({ useHandCursor: active })
    container.on('pointerup', () => {
      if (!active) {
        const previous = world.nodes[index - 1]
        hint
          .setText(
            world.unlocked
              ? previous
                ? services.i18n.t('level.mapLocked', { level: previous.id })
                : services.i18n.t('level.locked')
              : services.i18n.t('level.mapGate', { stars: world.gateStars }),
          )
          .setVisible(true)
        return
      }
      options.onSelect(node.id)
      options.close()
    })
    if (active) {
      container.on('pointerover', () => container.setScale(1.04))
      container.on('pointerout', () => container.setScale(1))
    }
    card.add(container)
  }
}

/** Dotted trail between two map nodes, stopping at each node's rim. */
function drawTrail(
  graphics: Phaser.GameObjects.Graphics,
  from: Point,
  to: Point,
  fromRadius: number,
  toRadius: number,
  color: number,
  alpha: number,
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const start = fromRadius + 4
  const end = length - toRadius - 4
  if (length <= start || end <= start) return
  const ux = dx / length
  const uy = dy / length
  graphics.lineStyle(8, color, alpha * 0.12)
  graphics.lineBetween(
    from.x + ux * start,
    from.y + uy * start,
    from.x + ux * end,
    from.y + uy * end,
  )
  for (let distance = start; distance <= end; distance += 14) {
    graphics.fillStyle(color, alpha)
    graphics.fillCircle(from.x + ux * distance, from.y + uy * distance, 3.2)
  }
}
