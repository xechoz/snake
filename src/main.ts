import { createGame } from '@mg/core'
import { snakeI18n } from './i18n'
import { GameScene } from './scenes/GameScene'
import { HudScene } from './scenes/HudScene'
import { MenuScene } from './scenes/MenuScene'

createGame({
  id: 'snake',
  design: { base: 720 },
  backgroundColor: 0x0b1020,
  defaultLang: 'zh',
  i18n: snakeI18n,
  menuScene: 'Menu',
  scenes: [MenuScene, GameScene, HudScene],
})
