import { createGame } from '@mg/core'
import { snakeColors } from './colors'
import { snakeI18n } from './i18n'
import { GameScene } from './scenes/GameScene'
import { HudScene } from './scenes/HudScene'
import { MenuScene } from './scenes/MenuScene'
import { drawBackdrop } from './ui/backdrop'
import { createSnakeLogo } from './ui/logo'

const eatSamples = [
  new URL('./assets/audio/eat-1.wav', import.meta.url).href,
  new URL('./assets/audio/eat-2.wav', import.meta.url).href,
]

createGame({
  id: 'snake',
  design: { base: 720 },
  theme: snakeColors.theme,
  defaultLang: 'zh',
  i18n: snakeI18n,
  menuScene: 'Menu',
  backdrop: drawBackdrop,
  titleLogo: (scene) => createSnakeLogo(scene),
  audioSamples: { eat: eatSamples },
  scenes: [MenuScene, GameScene, HudScene],
})
