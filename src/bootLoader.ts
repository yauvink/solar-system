type LoaderState = {
  percent: number
  label: string
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
  const copy = document.getElementById('space-loader-copy')
  const value = document.getElementById('space-loader-percent')
  if (copy && copy.textContent !== label) copy.textContent = label
  const text = `${percent}%`
  if (value && value.textContent !== text) value.textContent = text
  const root = document.getElementById('space-loader')
  if (root) root.setAttribute('aria-label', `${label}, ${percent} percent`)
}
