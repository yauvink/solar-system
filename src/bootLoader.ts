type LoaderState = {
  percent: number
  label: string
}

let shown = 0
let target = 0
let labelShown = 'Preparing the scene'
let rafId = 0
let lastTs = 0
let prepareBorn = 0

function paint(percent: number, label: string): void {
  const copy = document.getElementById('space-loader-copy')
  const value = document.getElementById('space-loader-percent')
  if (copy && copy.textContent !== label) copy.textContent = label
  const text = `${percent}%`
  if (value && value.textContent !== text) value.textContent = text
  const root = document.getElementById('space-loader')
  if (root) root.setAttribute('aria-label', `${label}, ${percent} percent`)
}

function easeToward(current: number, dest: number, dt: number): number {
  const speed = dest >= current ? 38 : 70
  const step = speed * dt
  if (Math.abs(dest - current) <= step) return dest
  return current + Math.sign(dest - current) * step
}

function frame(now: number): void {
  const dt = lastTs ? Math.min(0.05, (now - lastTs) / 1000) : 0.016
  lastTs = now

  let dest = target
  if (dest <= 0) {
    if (!prepareBorn) prepareBorn = now
    const t = Math.min(1, (now - prepareBorn) / 3200)
    dest = 3 + (1 - (1 - t) * (1 - t)) * 36
  } else {
    prepareBorn = 0
    dest = Math.max(dest, shown)
  }

  shown = easeToward(shown, dest, dt)
  paint(Math.round(shown), labelShown)

  if (shown < 99.5 || dest < 100) {
    rafId = requestAnimationFrame(frame)
  } else {
    shown = 100
    paint(100, labelShown)
    rafId = 0
  }
}

function kickTicker(): void {
  if (rafId) return
  lastTs = 0
  rafId = requestAnimationFrame(frame)
}

/** Start fake percent climb before textures report any progress. */
export function startBootLoader(): void {
  writeBootLoader(0, 'Preparing the scene')
}

const LABELS: Array<[string, string]> = [
  ['milkyway', 'Milky Way'],
  ['hiptyc', 'Star map'],
  ['starmap', 'Star map'],
  ['black-hole', 'Galactic core'],
  ['bluemarble', 'Earth'],
  ['earthatnight', 'Earth at night'],
  ['clouds', 'Clouds'],
  ['mercury', 'Mercury'],
  ['venus', 'Venus'],
  ['mars', 'Mars'],
  ['jupiter', 'Jupiter'],
  ['saturn', 'Saturn'],
  ['uranus', 'Uranus'],
  ['neptune', 'Neptune'],
  ['moon/color', 'Moon'],
  ['moon/displacement', 'Moon terrain'],
  ['moon/', 'Moon'],
]

function labelForUrl(url: string): string | null {
  const path = url.toLowerCase()
  for (const [needle, label] of LABELS) {
    if (path.includes(needle)) return label
  }
  return null
}

export function loaderStatus(progress: number, item: string, loaded: number, total: number, active: boolean): LoaderState {
  const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : Math.round(progress)
  if (!active && total > 0 && loaded >= total) {
    return { percent: 100, label: 'Starting the view' }
  }
  const current = item ? labelForUrl(item) : null
  if (current) return { percent, label: `Loading ${current}` }
  if (total > 0) return { percent, label: `Loading maps · ${loaded} of ${total}` }
  return { percent: 0, label: 'Preparing the scene' }
}

export function writeBootLoader(percent: number, label: string): void {
  target = percent
  labelShown = label
  kickTicker()
}
