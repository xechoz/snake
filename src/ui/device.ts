export function hasTouchInput(): boolean {
  return window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0
}
