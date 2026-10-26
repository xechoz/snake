export interface RestartOptions {
  readonly commercial?: boolean
}

/**
 * A rewarded ad may close the result modal through its backdrop or an
 * underlying button before its promise resolves. The reward path must still
 * start the next run, while an ordinary restart remains tied to an open modal.
 */
export function shouldRestartGameOver(modalActive: boolean, options?: RestartOptions): boolean {
  return modalActive || options?.commercial === false
}
