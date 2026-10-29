import { getServices } from '@mg/core'
import type Phaser from 'phaser'

let track: Phaser.Sound.BaseSound | null = null
let host: Phaser.Scene | null = null

/** Starts the shared garden loop once; scenes only need to point at the host. */
export function startMusic(scene: Phaser.Scene): void {
  host = scene
  if (!scene.cache.audio.exists('music')) return
  if (!track) {
    track = scene.sound.add('music', { loop: true, volume: 0.2 })
    const play = (): void => {
      if (track && !track.isPlaying && enabled()) track.play()
    }
    if (scene.sound.locked) scene.sound.once('unlocked', play)
    else play()
  }
  syncMusic()
}

/** Called on sound toggles, pause resumptions and ad transitions. */
export function syncMusic(): void {
  if (!track) return
  if (enabled()) {
    if (!track.isPlaying) {
      if (track.isPaused) track.resume()
      else track.play()
    }
    return
  }
  if (track.isPlaying) track.pause()
}

function enabled(): boolean {
  const services = getServices()
  if (!services.settings.value.sound) return false
  if (!host) return true
  return !(services.platform.hostMuted?.() ?? false)
}
