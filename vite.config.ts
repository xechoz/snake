import { defineConfig } from 'vite'
import { gameConfig } from '../../tooling/vite.game.ts'

export default defineConfig(gameConfig({ port: 5173 }))
