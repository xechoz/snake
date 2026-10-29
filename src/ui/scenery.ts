import type { Viewport } from '@mg/core'

/**
 * Placement for the orchard backdrop. All scenery lives outside the `quiet`
 * rectangles so trees, fences and bushes never sit under the logo, the CTA,
 * the demo board or the playfield.
 *
 * The plan is a pure function of the viewport and the quiet zones: redrawing a
 * layout produces the same orchard, which keeps the scenery stable while the
 * rest of the UI moves around it.
 */

export interface SceneryRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type SceneryDensity = 'menu' | 'game'

/** Tree proportions shared with the drawing layer. */
export const TREE_TRUNK = 86
export const TREE_CANOPY_Y = 118
export const TREE_CANOPY_R = 68

export interface TreeSpot {
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly flip: boolean
  readonly tone: number
  readonly fruits: readonly number[]
}

export interface BushSpot {
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly flip: boolean
  readonly berries: boolean
}

export interface FlowerSpot {
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly tone: number
}

export interface TuftSpot {
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly angle: number
}

export interface BirdSpot {
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly flip: boolean
}

export interface RowTreeSpot {
  readonly x: number
  readonly y: number
  readonly scale: number
}

export interface FencePost {
  readonly x: number
  readonly y: number
}

export interface BranchSpot {
  /** Corner anchor; the branch grows away from it and off screen. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly flip: boolean
}

export interface Perch {
  readonly x: number
  readonly y: number
  readonly radius: number
}

export interface OrchardPlan {
  readonly scale: number
  readonly trees: readonly TreeSpot[]
  readonly rowTrees: readonly RowTreeSpot[]
  readonly bushes: readonly BushSpot[]
  readonly flowers: readonly FlowerSpot[]
  readonly tufts: readonly TuftSpot[]
  readonly birds: readonly BirdSpot[]
  readonly fence: { readonly posts: readonly FencePost[]; readonly step: number } | null
  readonly branch: BranchSpot | null
  readonly perches: readonly Perch[]
}

const MAX_SCALE = 1.35
const MIN_SCALE = 0.6

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Stable pseudo-random in [0, 1); avoids Math.random for reproducible scenery. */
function hash(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function expand(rect: SceneryRect, padding: number): SceneryRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

function overlaps(a: SceneryRect, b: SceneryRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function circleHitsRect(x: number, y: number, radius: number, rect: SceneryRect): boolean {
  const closestX = clamp(x, rect.x, rect.x + rect.width)
  const closestY = clamp(y, rect.y, rect.y + rect.height)
  const dx = x - closestX
  const dy = y - closestY
  return dx * dx + dy * dy < radius * radius
}

interface Counts {
  readonly trees: number
  readonly rows: number
  readonly bushes: number
  readonly flowers: number
  readonly tufts: number
  readonly birds: number
}

const COUNTS: Record<SceneryDensity, Counts> = {
  menu: { trees: 3, rows: 1, bushes: 5, flowers: 15, tufts: 26, birds: 3 },
  game: { trees: 2, rows: 1, bushes: 3, flowers: 8, tufts: 14, birds: 2 },
}

/**
 * Builds the scenery for a viewport. `quiet` rectangles are already in design
 * space; the plan keeps every solid object (tree canopy, bush, fence post) at
 * least eight units clear of them.
 */
export function planOrchard(
  viewport: Viewport,
  quiet: readonly SceneryRect[] = [],
  density: SceneryDensity = 'menu',
): OrchardPlan {
  const { width, height, insets } = viewport
  const left = insets.left
  const right = width - insets.right
  const top = insets.top
  const bottom = height - insets.bottom
  const scale = clamp(Math.min(width, height) / 720, MIN_SCALE, MAX_SCALE)
  const counts = scaleCounts(COUNTS[density], scale, density)
  const zones = quiet.map((rect) => expand(rect, 8))

  const blocked = (x: number, y: number, radius: number, padding = 0): boolean =>
    zones.some((rect) => circleHitsRect(x, y, radius, expand(rect, padding)))

  const trees = placeTrees({
    left,
    right,
    top,
    bottom,
    scale,
    count: counts.trees,
    blocked,
  })
  const bushes = placeBushes({ left, right, top, bottom, scale, count: counts.bushes, blocked })
  const flowers = placeFlowers({
    left,
    right,
    top,
    bottom,
    scale,
    count: counts.flowers,
    blocked,
  })
  const tufts = placeTufts({ left, right, top, bottom, scale, count: counts.tufts, blocked })
  const birds = placeBirds({ left, right, top, bottom, scale, count: counts.birds })
  const rowTrees = placeRows({ left, right, bottom, scale, count: counts.rows })
  const fence = placeFence({ left, right, bottom, scale, quiet: zones })
  const branch = placeBranch({ left, right, top, bottom, scale, quiet: zones })

  const perches: Perch[] = []
  for (const tree of trees.slice(0, 2)) {
    const canopyTop = tree.y - (TREE_CANOPY_Y + TREE_CANOPY_R) * tree.scale
    const perch: Perch = {
      x: tree.x + 24 * tree.scale,
      y: canopyTop - 26 * tree.scale,
      radius: 22 * tree.scale,
    }
    if (!blocked(perch.x, perch.y, perch.radius)) perches.push(perch)
  }
  for (const flower of flowers.slice(0, 2)) {
    const perch: Perch = {
      x: flower.x,
      y: flower.y - 34 * flower.scale,
      radius: 20 * flower.scale,
    }
    if (!blocked(perch.x, perch.y, perch.radius)) perches.push(perch)
  }
  for (const bush of bushes.slice(0, 2)) {
    const perch: Perch = {
      x: bush.x,
      y: bush.y - 110 * bush.scale,
      radius: 24 * bush.scale,
    }
    if (!blocked(perch.x, perch.y, perch.radius)) perches.push(perch)
  }

  return { scale, trees, rowTrees, bushes, flowers, tufts, birds, fence, branch, perches }
}

function scaleCounts(counts: Counts, scale: number, density: SceneryDensity): Counts {
  const factor = clamp(scale, 0.65, 1.25) * (density === 'game' ? 0.8 : 1)
  return {
    trees: Math.max(1, Math.round(counts.trees * factor)),
    rows: counts.rows,
    bushes: Math.max(1, Math.round(counts.bushes * factor)),
    flowers: Math.max(3, Math.round(counts.flowers * factor)),
    tufts: Math.max(6, Math.round(counts.tufts * factor)),
    birds: Math.max(0, Math.round(counts.birds * factor)),
  }
}

interface Frame {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly scale: number
}

interface TreeArgs extends Frame {
  readonly count: number
  readonly blocked: (x: number, y: number, radius: number, padding?: number) => boolean
}

function placeTrees(args: TreeArgs): TreeSpot[] {
  const { left, right, top, bottom, scale, count, blocked } = args
  const candidates = [
    { x: left + 6 * scale, y: bottom + 16 * scale, scale: 1.16, flip: false },
    { x: right - 6 * scale, y: bottom + 16 * scale, scale: 1.16, flip: true },
    { x: left + 58 * scale, y: bottom - 16 * scale, scale: 0.84, flip: false },
    { x: right - 58 * scale, y: bottom - 16 * scale, scale: 0.84, flip: true },
    { x: left + 24 * scale, y: bottom - 118 * scale, scale: 0.9, flip: false },
    { x: right - 24 * scale, y: bottom - 118 * scale, scale: 0.9, flip: true },
    { x: left + 26 * scale, y: top + 236 * scale, scale: 0.72, flip: false },
    { x: right - 26 * scale, y: top + 236 * scale, scale: 0.72, flip: true },
  ]

  const trees: TreeSpot[] = []
  for (const [index, candidate] of candidates.entries()) {
    if (trees.length >= count) break
    const radius = TREE_CANOPY_R * candidate.scale
    const canopyY = candidate.y - TREE_CANOPY_Y * candidate.scale
    if (canopyY - radius < top + 2) continue
    if (candidate.x + radius < left + 10 || candidate.x - radius > right - 10) continue
    if (blocked(candidate.x, canopyY, radius, 10)) continue
    if (trees.some((tree) => Math.hypot(tree.x - candidate.x, tree.y - candidate.y) < 90 * scale))
      continue

    trees.push({
      ...candidate,
      tone: hash(index, 1),
      fruits: Array.from({ length: 4 + Math.floor(hash(index, 2) * 3) }, (_, fruit) =>
        Math.floor(hash(index * 7 + fruit, 3) * 14),
      ),
    })
  }
  return trees
}

interface BushArgs extends Frame {
  readonly count: number
  readonly blocked: (x: number, y: number, radius: number, padding?: number) => boolean
}

function placeBushes(args: BushArgs): BushSpot[] {
  const { left, right, top, bottom, scale, count, blocked } = args
  const width = right - left
  const candidates = [
    { x: left + 54 * scale, y: bottom - 4 * scale, scale: 0.9 },
    { x: right - 54 * scale, y: bottom - 4 * scale, scale: 0.9 },
    { x: left + width * 0.26, y: bottom - 10 * scale, scale: 0.7 },
    { x: left + width * 0.74, y: bottom - 10 * scale, scale: 0.7 },
    { x: left + 22 * scale, y: bottom - 178 * scale, scale: 0.62 },
    { x: right - 22 * scale, y: bottom - 178 * scale, scale: 0.62 },
    { x: left + width * 0.5, y: bottom - 6 * scale, scale: 0.58 },
    { x: left + width * 0.5, y: top + 150 * scale, scale: 0.56 },
  ]

  const bushes: BushSpot[] = []
  for (const [index, candidate] of candidates.entries()) {
    if (bushes.length >= count) break
    const radius = 58 * candidate.scale
    if (candidate.x + radius < left + 4 || candidate.x - radius > right - 4) continue
    if (candidate.y - radius < top + 2) continue
    if (blocked(candidate.x, candidate.y - 24 * candidate.scale, radius, 8)) continue
    if (bushes.some((bush) => Math.hypot(bush.x - candidate.x, bush.y - candidate.y) < 54 * scale))
      continue

    bushes.push({
      ...candidate,
      flip: index % 2 === 1,
      berries: hash(index, 4) > 0.35,
    })
  }
  return bushes
}

interface ScatterArgs extends Frame {
  readonly count: number
  readonly blocked: (x: number, y: number, radius: number, padding?: number) => boolean
}

function placeFlowers(args: ScatterArgs): FlowerSpot[] {
  const { left, right, top, bottom, scale, count, blocked } = args
  const flowers: FlowerSpot[] = []
  const span = Math.max(1, bottom - top)
  const band = Math.min(170 * scale, span * 0.32)
  const sideTop = bottom - Math.min(300 * scale, span * 0.5)

  for (let index = 0; index < count * 4 && flowers.length < count; index += 1) {
    const side = hash(index, 9) > 0.55
    const x = side
      ? hash(index, 10) > 0.5
        ? left + 8 + hash(index, 11) * 74 * scale
        : right - 8 - hash(index, 11) * 74 * scale
      : left + hash(index, 10) * (right - left)
    const y = side
      ? sideTop + hash(index, 12) * Math.max(1, bottom - sideTop - 10 * scale)
      : bottom - 8 * scale - hash(index, 12) * band
    if (blocked(x, y, 16 * scale, 2)) continue
    if (flowers.some((flower) => Math.hypot(flower.x - x, flower.y - y) < 30 * scale)) continue
    flowers.push({ x, y, scale: 0.7 + hash(index, 13) * 0.55, tone: hash(index, 14) })
  }
  return flowers
}

function placeTufts(args: ScatterArgs): TuftSpot[] {
  const { left, right, top, bottom, scale, count, blocked } = args
  const tufts: TuftSpot[] = []
  const span = Math.max(1, bottom - top)
  const band = Math.min(190 * scale, span * 0.36)
  const sideTop = bottom - Math.min(300 * scale, span * 0.5)

  for (let index = 0; index < count * 4 && tufts.length < count; index += 1) {
    const side = hash(index, 20) > 0.62
    const x = side
      ? hash(index, 21) > 0.5
        ? left + 6 + hash(index, 22) * 60 * scale
        : right - 6 - hash(index, 22) * 60 * scale
      : left + hash(index, 21) * (right - left)
    const y = side
      ? sideTop + hash(index, 23) * Math.max(1, bottom - sideTop - 8 * scale)
      : bottom - 6 * scale - hash(index, 23) * band
    if (blocked(x, y, 12 * scale, 0)) continue
    tufts.push({
      x,
      y,
      scale: 0.7 + hash(index, 24) * 0.6,
      angle: (hash(index, 25) - 0.5) * 0.7,
    })
  }
  return tufts
}

function placeBirds(args: Frame & { readonly count: number }): BirdSpot[] {
  const { left, right, top, bottom, scale, count } = args
  const birds: BirdSpot[] = []
  const span = Math.max(1, right - left)
  for (let index = 0; index < count; index += 1) {
    birds.push({
      x: left + span * (0.16 + index * 0.27) + (hash(index, 30) - 0.5) * 40 * scale,
      y: top + 54 * scale + hash(index, 31) * Math.min(120, (bottom - top) * 0.16),
      scale: 0.7 + hash(index, 32) * 0.5,
      flip: hash(index, 33) > 0.5,
    })
  }
  return birds
}

function placeRows(args: {
  readonly left: number
  readonly right: number
  readonly bottom: number
  readonly scale: number
  readonly count: number
}): RowTreeSpot[] {
  const { left, right, bottom, scale, count } = args
  const step = 58 * scale
  const rows: RowTreeSpot[] = []
  for (let row = 0; row < count; row += 1) {
    const y = bottom - (64 + row * 16) * scale
    for (let x = left + step * 0.4; x < right; x += step) {
      rows.push({
        x,
        y,
        scale: 0.62 + hash(Math.round(x), 40 + row) * 0.3,
      })
    }
  }
  return rows
}

interface FenceArgs {
  readonly left: number
  readonly right: number
  readonly bottom: number
  readonly scale: number
  readonly quiet: readonly SceneryRect[]
}

function placeFence(args: FenceArgs): OrchardPlan['fence'] {
  const { left, right, bottom, scale, quiet } = args
  const step = 54 * scale
  const height = 36 * scale
  const y = bottom - 8 * scale
  const posts: FencePost[] = []

  for (let x = left + step * 0.5; x < right; x += step) {
    const post: SceneryRect = {
      x: x - step * 0.42,
      y: y - height,
      width: step * 0.84,
      height,
    }
    if (quiet.some((rect) => overlaps(post, expand(rect, 4)))) continue
    posts.push({ x, y })
  }

  return posts.length >= 2 ? { posts, step } : null
}

interface BranchArgs {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly scale: number
  readonly quiet: readonly SceneryRect[]
}

function placeBranch(args: BranchArgs): BranchSpot | null {
  const { left, right, top, bottom, scale, quiet } = args
  const width = 250 * scale
  const height = 122 * scale
  if (top + height > bottom - 120 * scale) return null

  const candidates: BranchSpot[] = [
    { x: left - 12 * scale, y: top - 16 * scale, width, height, flip: false },
    { x: right + 12 * scale, y: top - 16 * scale, width, height, flip: true },
  ]

  for (const candidate of candidates) {
    const box: SceneryRect = {
      x: candidate.flip ? candidate.x - width : candidate.x,
      y: candidate.y,
      width,
      height,
    }
    if (quiet.some((rect) => overlaps(box, expand(rect, 10)))) continue
    return candidate
  }
  return null
}
