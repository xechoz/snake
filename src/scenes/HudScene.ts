import {
  cssColor,
  displayTextStyle,
  getServices,
  Modal,
  type ModalAction,
  onLayoutChange,
  readViewport,
  rewardOfferActions,
  textStyle,
  type Viewport,
} from '@mg/core'
import Phaser from 'phaser'
import {
  canOfferSuperReward,
  grantSuperReward,
  hasPendingSuperReward,
  SUPER_PLACEMENT,
} from '../ads'
import { snakeColors } from '../colors'
import {
  computeSnakeLayout,
  inlineScorePositions,
  type Rect,
  SCORE_LABEL_SIZE,
  SCORE_VALUE_SIZE,
  type SnakeLayout,
} from '../ui/layout'
import { PauseButton } from '../ui/PauseButton'
import type { GameScene } from './GameScene'

export interface GameOverInfo {
  score: number
  best: number
  newBest: boolean
  won: boolean
  reason: 'wall' | 'self' | 'win'
}

type ModalRequest = { kind: 'pause' } | { kind: 'over'; info: GameOverInfo }

export class HudScene extends Phaser.Scene {
  private layout!: SnakeLayout
  private scoreCloud!: Phaser.GameObjects.Graphics
  private scoreLabel!: Phaser.GameObjects.Text
  private scoreValue!: Phaser.GameObjects.Text
  private feastBar!: Phaser.GameObjects.Graphics
  private lastFeastKey = ''
  private pauseButton!: PauseButton
  private modal?: Modal
  private modalRequest?: ModalRequest
  private lastScore = -1

  constructor() {
    super('Hud')
  }

  create(): void {
    const services = getServices()
    const theme = services.theme
    const stats = this.gameScene().currentStats()
    this.layout = computeSnakeLayout(readViewport(this))

    this.scoreCloud = this.add.graphics()
    this.scoreLabel = this.add
      .text(0, 0, services.i18n.t('hud.score'), textStyle(theme, SCORE_LABEL_SIZE, theme.textMuted))
      .setOrigin(0.5)
    this.scoreValue = this.add
      .text(
        0,
        0,
        String(stats.score),
        displayTextStyle(theme, SCORE_VALUE_SIZE, cssColor(theme.accentInk), true, 0, 4),
      )
      .setOrigin(0.5)

    this.feastBar = this.add.graphics()

    this.pauseButton = new PauseButton(this, this.layout.pause.x, this.layout.pause.y, theme, {
      size: 64,
      onClick: () => this.gameScene().pauseGame(),
    })

    this.applyLayout()
    this.updateFeast(stats.feast)
    onLayoutChange(this, (viewport) => this.handleLayout(viewport))
    this.lastScore = stats.score
  }

  update(): void {
    const stats = this.gameScene().currentStats()
    this.updateFeast(stats.feast)
    if (stats.score === this.lastScore) return
    this.lastScore = stats.score
    this.scoreValue.setText(String(stats.score))
    this.positionScore()
    this.tweens.killTweensOf(this.scoreValue)
    this.scoreValue.setScale(1)
    this.tweens.add({
      targets: this.scoreValue,
      scale: 1.08,
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    })
  }

  showPause(): void {
    if (this.modal?.active) return
    this.modalRequest = { kind: 'pause' }
    this.buildPauseModal()
  }

  showGameOver(info: GameOverInfo): void {
    if (this.modal?.active) return
    this.modalRequest = { kind: 'over', info }
    this.buildGameOverModal(info)
    if (info.newBest || info.won) this.celebrate()
  }

  closeModal(): void {
    this.modal?.close()
    this.modal = undefined
    this.modalRequest = undefined
  }

  private handleLayout(viewport: Viewport): void {
    const next = computeSnakeLayout(viewport)
    if (layoutsEqual(next, this.layout)) return
    this.layout = next
    this.applyLayout()
    this.rebuildModal()
  }

  private applyLayout(): void {
    this.drawScoreCloud()
    this.positionScore()
    this.pauseButton.setPosition(this.layout.pause.x, this.layout.pause.y)
    this.feastBar.clear()
    this.lastFeastKey = ''
    this.updateFeast(this.gameScene().currentStats().feast)
  }

  private updateFeast(feast: { remainingMs: number; totalMs: number } | null): void {
    if (!feast) {
      if (this.lastFeastKey !== '') {
        this.feastBar.clear()
        this.lastFeastKey = ''
      }
      return
    }

    const ratio = Math.max(0, Math.min(1, feast.remainingMs / feast.totalMs))
    const key = `${Math.ceil(feast.remainingMs / 100)}:${Math.round(ratio * 100)}`
    if (key === this.lastFeastKey) return
    this.lastFeastKey = key
    this.drawFeastBar(ratio)
  }

  private drawFeastBar(ratio: number): void {
    const { scoreCard } = this.layout
    const padding = 20
    const height = 6
    const width = scoreCard.width - padding * 2
    const x = scoreCard.x + padding
    const y = scoreCard.y + scoreCard.height - 16
    const theme = getServices().theme

    this.feastBar.clear()
    this.feastBar.fillStyle(theme.borderSoft, 0.4)
    this.feastBar.fillRoundedRect(x, y, width, height, height / 2)
    this.feastBar.fillStyle(snakeColors.art.superFruit.body, 1)
    this.feastBar.fillRoundedRect(x, y, Math.max(height, width * ratio), height, height / 2)
  }

  private drawScoreCloud(): void {
    const theme = getServices().theme
    const bounds = this.layout.scoreCard

    this.scoreCloud.clear()
    // The soft lift keeps the cloud a UI surface instead of backdrop scenery.
    fillCloudShape(this.scoreCloud, bounds, 6, theme.shadow, 0.08)
    fillCloudShape(this.scoreCloud, bounds, 0, theme.surface, 0.95)
  }

  private positionScore(): void {
    const { score } = this.layout

    if (score.mode === 'stacked') {
      this.scoreLabel.setOrigin(0.5).setPosition(score.x, score.labelY)
      this.scoreValue.setOrigin(0.5).setPosition(score.x, score.valueY)
      return
    }

    const { labelX, valueX } = inlineScorePositions(
      score.x,
      this.scoreLabel.width,
      this.scoreValue.width,
    )
    this.scoreLabel.setOrigin(0.5).setPosition(labelX, score.y)
    this.scoreValue.setOrigin(0.5).setPosition(valueX, score.y)
  }

  private rebuildModal(): void {
    const request = this.modalRequest
    if (!request || !this.modal?.active) return
    this.modal.close()
    this.modal = undefined
    if (request.kind === 'pause') this.buildPauseModal()
    else this.buildGameOverModal(request.info)
  }

  private buildPauseModal(): void {
    const services = getServices()
    const game = this.gameScene()

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t('pause.title'),
      body: services.i18n.t('pause.body'),
      width: 640,
      height: 500,
      titleFontSize: 36,
      bodyFontSize: 30,
      actionsLayout: 'column',
      actionWidth: 480,
      actionHeight: 92,
      actionFontSize: 30,
      actions: [
        {
          label: services.i18n.t('pause.resume'),
          onClick: () => game.resumeGame(),
        },
        {
          label: services.i18n.t('pause.restart'),
          variant: 'soft',
          onClick: () => game.restartGame(),
        },
        {
          label: services.i18n.t('pause.menu'),
          variant: 'soft',
          onClick: () => game.goToMenu(),
        },
      ],
    })
  }

  private buildGameOverModal(info: GameOverInfo): void {
    const services = getServices()
    const game = this.gameScene()
    const canOfferSuper = canOfferSuperReward(services)
    const pendingSuper = hasPendingSuperReward(services)

    const reasonKey =
      info.reason === 'win' ? 'over.win' : info.reason === 'self' ? 'over.self' : 'over.wall'
    const body = [
      services.i18n.t('over.body', { best: info.best }),
      services.i18n.t(reasonKey),
      ...(info.newBest ? [services.i18n.t('over.newBest')] : []),
      ...(canOfferSuper ? [services.i18n.t('ads.superHint')] : []),
      ...(pendingSuper ? [services.i18n.t('ads.superReady')] : []),
    ].join('\n')

    const standard: ModalAction = {
      label: services.i18n.t('over.restart'),
      onClick: () => game.restartGame(),
    }
    const menu: ModalAction = {
      label: services.i18n.t('over.menu'),
      variant: 'soft',
      height: canOfferSuper ? 76 : 92,
      onClick: () => game.goToMenu(),
    }
    const actions: ModalAction[] = canOfferSuper
      ? [
          ...rewardOfferActions({
            ads: services.ads,
            standard: {
              label: services.i18n.t('over.restart'),
              onClick: () => game.restartGame(),
            },
            rewarded: {
              label: services.i18n.t('ads.super'),
              placement: SUPER_PLACEMENT,
              loadingLabel: services.i18n.t('ads.loading'),
              onReward: () => {
                grantSuperReward(services)
                this.rebuildModal()
              },
            },
            rewardedHeight: 76,
          }),
          menu,
        ]
      : [standard, menu]

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t(info.won ? 'over.winTitle' : 'over.title'),
      titleRibbon: false,
      hero: String(info.score),
      body,
      width: 640,
      height: canOfferSuper ? 672 : 560,
      titleFontSize: canOfferSuper ? 32 : 36,
      heroFontSize: canOfferSuper ? 64 : 72,
      bodyFontSize: canOfferSuper ? 24 : 28,
      actionsLayout: 'column',
      actionWidth: 480,
      actionHeight: 92,
      actionFontSize: 28,
      actions,
    })
  }

  private celebrate(): void {
    const theme = getServices().theme
    const colors = snakeColors.art.confetti
    const width = this.scale.width
    for (let index = 0; index < 42; index += 1) {
      const piece = this.add
        .rectangle(
          Phaser.Math.Between(20, width - 20),
          Phaser.Math.Between(-80, -10),
          Phaser.Math.Between(7, 13),
          Phaser.Math.Between(10, 18),
          colors[index % colors.length] ?? theme.accent,
        )
        .setDepth(1100)
        .setAngle(Phaser.Math.Between(0, 360))
      this.tweens.add({
        targets: piece,
        y: this.scale.height + 40,
        angle: piece.angle + Phaser.Math.Between(180, 540),
        alpha: { from: 1, to: 0.2 },
        duration: Phaser.Math.Between(1400, 2600),
        delay: Phaser.Math.Between(0, 420),
        ease: 'Quad.in',
        onComplete: () => piece.destroy(),
      })
    }
  }

  private gameScene(): GameScene {
    return this.scene.get('Game') as GameScene
  }
}

function fillCloudShape(
  graphics: Phaser.GameObjects.Graphics,
  bounds: Rect,
  offsetY: number,
  color: number,
  alpha: number,
): void {
  const { x, y, width, height } = bounds
  const top = y + offsetY

  graphics.fillStyle(color, alpha)
  graphics.fillRoundedRect(
    x + width * 0.03,
    top + height * 0.36,
    width * 0.94,
    height * 0.56,
    height * 0.28,
  )
  graphics.fillCircle(x + width * 0.2, top + height * 0.44, height * 0.25)
  graphics.fillCircle(x + width * 0.42, top + height * 0.32, height * 0.3)
  graphics.fillCircle(x + width * 0.64, top + height * 0.34, height * 0.29)
  graphics.fillCircle(x + width * 0.82, top + height * 0.46, height * 0.22)
}

function layoutsEqual(a: SnakeLayout, b: SnakeLayout): boolean {
  return (
    a.board.x === b.board.x &&
    a.board.y === b.board.y &&
    a.board.width === b.board.width &&
    a.hud.x === b.hud.x &&
    a.hud.y === b.hud.y &&
    a.hud.width === b.hud.width &&
    a.hud.height === b.hud.height
  )
}
