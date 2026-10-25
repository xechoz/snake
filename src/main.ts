import { createGame } from '@mg/core'
import { snakeColors } from './colors'
import { snakeI18n } from './i18n'
import { GameScene } from './scenes/GameScene'
import { HudScene } from './scenes/HudScene'
import { MenuScene } from './scenes/MenuScene'
import { drawBackdrop } from './ui/backdrop'
import { createSnakeLogo } from './ui/logo'

createGame({
  id: 'snake',
  design: { base: 720 },
  theme: snakeColors.theme,
  defaultLang: 'zh',
  i18n: snakeI18n,
  menuScene: 'Menu',
  backdrop: drawBackdrop,
  titleLogo: (scene) => createSnakeLogo(scene),
  scenes: [MenuScene, GameScene, HudScene],
})
