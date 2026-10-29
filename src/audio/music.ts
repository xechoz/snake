import { getServices } from '@mg/core'
import type Phaser from 'phaser'
import { snakeSave } from '../save'

/** Volume at a 100% setting. The settings slider scales this down. */
const MUSIC_BASE_VOLUME = 0.5

interface MusicTrack extends Phaser.Sound.BaseSound {
  setVolume(value: number): void
}

let track: MusicTrack | null = null
let host: Phaser.Scene | null = null

/** Starts the shared garden loop once; scenes only need to point at the host. */
export function startMusic(scene: Phaser.Scene): void {
  host = scene
  if (!scene.cache.audio.exists('music')) return
  const volume = storedVolume()
  if (!track) {
    track = scene.sound.add('music', {
      loop: true,
      volume: MUSIC_BASE_VOLUME * volume,
    }) as MusicTrack
    const play = (): void => {
      if (track && !track.isPlaying && enabled()) track.play()
    }
    if (scene.sound.locked) scene.sound.once('unlocked', play)
    else play()
  }
  setMusicVolume(volume)
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

/** Live volume preview while the settings slider is dragged. */
export function setMusicVolume(value: number): void {
  if (!track) return
  track.setVolume(MUSIC_BASE_VOLUME * Math.min(1, Math.max(0, value)))
}

function storedVolume(): number {
  return snakeSave(getServices()).read().settings.musicVolume
}

function enabled(): boolean {
  const services = getServices()
  if (!services.settings.value.sound) return false
  if (!host) return true
  return !(services.platform.hostMuted?.() ?? false)
}
