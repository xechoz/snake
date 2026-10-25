import {
  cssColor,
  displayTextStyle,
  getServices,
  Modal,
  type ModalAction,
  onLayoutChange,
  readViewport,
  textStyle,
  type Viewport,
} from '@mg/core'
import Phaser from 'phaser'
import { canOfferSuperReward, grantSuperReward, hasPendingSuperReward } from '../ads'
import { snakeColors } from '../colors'
import { CloseButton } from '../ui/CloseButton'
import { playGameOverEffects, spawnBestCrown, spawnCrown } from '../ui/celebration'
import { fruitDecoration } from '../ui/fruitDecoration'
import {
  computeBestCrown,
  computeGameOverOverlay,
  computeSnakeLayout,
  GAME_OVER_MODAL_HEIGHT,
  GAME_OVER_MODAL_HEIGHT_ADS,
  GAME_OVER_MODAL_WIDTH,
  type GameOverOverlay,
  inlineScorePositions,
  type Rect,
  SCORE_LABEL_SIZE,
  SCORE_VALUE_SIZE,
  type SnakeLayout,
} from '../ui/layout'
import { PauseButton } from '../ui/PauseButton'
import { superOfferActions } from '../ui/superOfferActions'
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
  private closeButton?: CloseButton
  private crown?: Phaser.GameObjects.Container
  private bestCrown?: Phaser.GameObjects.Container
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
    const overlay = this.buildGameOverModal(info)
    playGameOverEffects(this, { rich: info.newBest || info.won, bursts: overlay.bursts })
    if (info.newBest) this.showCrown(overlay)
  }

  closeModal(): void {
    this.modal?.close()
    this.modal = undefined
    this.modalRequest = undefined
    this.destroyOverlay()
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
    this.destroyOverlay()
    this.modal.close()
    this.modal = undefined
    if (request.kind === 'pause') {
      this.buildPauseModal()
      return
    }
    const overlay = this.buildGameOverModal(request.info)
    if (request.info.newBest) this.showCrown(overlay)
  }

  private buildPauseModal(): void {
    const services = getServices()
    const game = this.gameScene()

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t('pause.title'),
      titleRibbon: false,
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
          icon: 'play',
          decoration: fruitDecoration,
          onClick: () => game.resumeGame(),
        },
        {
          label: services.i18n.t('pause.restart'),
          variant: 'soft',
          icon: 'restart',
          onClick: () => game.restartGame(),
        },
        {
          label: services.i18n.t('pause.menu'),
          variant: 'soft',
          icon: 'home',
          onClick: () => game.goToMenu(),
        },
      ],
    })
  }

  private buildGameOverModal(info: GameOverInfo): GameOverOverlay {
    const services = getServices()
    const game = this.gameScene()
    const canOfferSuper = canOfferSuperReward(services)
    const pendingSuper = hasPendingSuperReward(services)

    const overlay = computeGameOverOverlay(this.scale, {
      width: GAME_OVER_MODAL_WIDTH,
      height: canOfferSuper ? GAME_OVER_MODAL_HEIGHT_ADS : GAME_OVER_MODAL_HEIGHT,
      titleFontSize: canOfferSuper ? 32 : 36,
      heroFontSize: canOfferSuper ? 64 : 72,
    })

    const reasonKey =
      info.reason === 'win' ? 'over.win' : info.reason === 'self' ? 'over.self' : 'over.wall'
    const body = [
      services.i18n.t('over.body', { best: info.best }),
      services.i18n.t(reasonKey),
      ...(info.newBest ? [services.i18n.t('over.newBest')] : []),
      ...(canOfferSuper ? [services.i18n.t('ads.superHint')] : []),
      ...(pendingSuper ? [services.i18n.t('ads.superReady')] : []),
    ].join('\n')

    const restart = (): void => {
      // The ad callback may resolve after the player already closed the modal
      // or restarted; only restart while this game-over modal is still open.
      if (!this.modal?.active) return
      game.restartGame()
    }
    const actions: ModalAction[] = canOfferSuper
      ? superOfferActions({
          ads: services.ads,
          standardLabel: services.i18n.t('over.restart'),
          rewardedLabel: services.i18n.t('ads.super'),
          loadingLabel: services.i18n.t('ads.loading'),
          grant: () => grantSuperReward(services),
          restart,
        }).map((action, index) =>
          index === 0 ? { ...action, decoration: fruitDecoration } : action,
        )
      : [
          {
            label: services.i18n.t('over.restart'),
            icon: 'restart',
            decoration: fruitDecoration,
            onClick: restart,
          },
        ]

    const bodyFontSize = canOfferSuper ? 24 : 28

    this.modal = new Modal(this, services.theme, {
      title: services.i18n.t(info.won ? 'over.winTitle' : 'over.title'),
      titleRibbon: false,
      hero: String(info.score),
      body,
      width: GAME_OVER_MODAL_WIDTH,
      height: canOfferSuper ? GAME_OVER_MODAL_HEIGHT_ADS : GAME_OVER_MODAL_HEIGHT,
      titleFontSize: canOfferSuper ? 32 : 36,
      heroFontSize: canOfferSuper ? 64 : 72,
      bodyFontSize,
      actionsLayout: 'column',
      actionWidth: 480,
      actionHeight: 92,
      actionFontSize: 28,
      actions,
    })

    if (info.best > 0) this.showBestCrown(this.modal, bodyFontSize)

    this.closeButton = new CloseButton(this, overlay.close.x, overlay.close.y, services.theme, {
      size: overlay.closeSize,
      onClick: () => game.goToMenu(),
    }).setDepth(1100)

    return overlay
  }

  private showBestCrown(modal: Modal, bodyFontSize: number): void {
    const body = modal.bodyText
    if (!body) return
    const firstLine = body.getWrappedText(body.text)[0] ?? ''
    const probe = this.make.text({ text: firstLine, style: body.style }, false)
    const lineWidth = probe.width
    probe.destroy()

    this.bestCrown = spawnBestCrown(
      this,
      computeBestCrown(this.scale, body.y, lineWidth, bodyFontSize),
    )
  }

  private showCrown(overlay: GameOverOverlay): void {
    this.crown = spawnCrown(this, {
      x: overlay.crown.x,
      y: overlay.crown.y,
      size: overlay.crownSize,
      theme: getServices().theme,
    })
  }

  private destroyOverlay(): void {
    if (this.closeButton) {
      this.tweens.killTweensOf(this.closeButton)
      this.closeButton.destroy()
      this.closeButton = undefined
    }
    if (this.crown) {
      this.tweens.killTweensOf(this.crown)
      this.crown.destroy()
      this.crown = undefined
    }
    if (this.bestCrown) {
      this.tweens.killTweensOf(this.bestCrown)
      this.bestCrown.destroy()
      this.bestCrown = undefined
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
