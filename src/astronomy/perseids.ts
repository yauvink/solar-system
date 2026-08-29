import { SunPosition } from 'astronomy-engine'
import { auToDistanceUnits } from './scale.ts'
import type { Vec3 } from './positions.ts'

/** Peak of the Perseids: solar longitude 140.0° (IMO). */
export const PERSEID_PEAK_SOLAR_LON = 140
export const PERSEID_WINDOW_START_LON = 138.2
export const PERSEID_WINDOW_END_LON = 141.8

/**
 * 109P/Swift–Tuttle, JPL SBDB elements near the 1992 perihelion
 * (q, e, i, Ω, ω). The tube is inertial in heliocentric ecliptic J2000 —
 * the same frame as planet positions after EQJ→ECL, then (x, z, −y) for the scene.
 * Earth meets the descending node (ν ≈ 27°, r ≈ 1 AU) around solar longitude 140°.
 */
const SWIFT_TUTTLE = {
  q: 0.9595,
  e: 0.9632,
  i: (113.45 * Math.PI) / 180,
  node: (139.37 * Math.PI) / 180,
  peri: (153.0 * Math.PI) / 180,
}

function wrapLon(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function lonDelta(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180
}

export function solarLongitude(date: Date): number {
  return wrapLon(SunPosition(date).elon)
}

export function isPerseidCrossing(date: Date): boolean {
  const lon = solarLongitude(date)
  return lonDelta(lon, PERSEID_WINDOW_START_LON) >= 0 && lonDelta(lon, PERSEID_WINDOW_END_LON) <= 0
}

export function perseidWindow(year: number): { start: Date; peak: Date; end: Date } {
  const start = new Date(year, 6, 20)
  const end = new Date(year, 7, 26)
  let peak = new Date(year, 7, 12, 12)
  let startHit: Date | null = null
  let endHit: Date | null = null
  let bestPeak = 180

  for (let t = start.getTime(); t <= end.getTime(); t += 3 * 3_600_000) {
    const date = new Date(t)
    const lon = solarLongitude(date)
    const peakErr = Math.abs(lonDelta(lon, PERSEID_PEAK_SOLAR_LON))
    if (peakErr < bestPeak) {
      bestPeak = peakErr
      peak = date
    }
    if (!startHit && lonDelta(lon, PERSEID_WINDOW_START_LON) >= 0) {
      startHit = date
    }
    if (startHit && !endHit && lonDelta(lon, PERSEID_WINDOW_END_LON) > 0) {
      endHit = date
    }
  }

  return {
    start: startHit ?? new Date(year, 7, 11),
    peak,
    end: endHit ?? new Date(year, 7, 13, 18),
  }
}

function eclipticFromTrueAnomaly(nu: number): [number, number, number] {
  const { q, e, i, node, peri } = SWIFT_TUTTLE
  const p = q * (1 + e)
  const r = p / (1 + e * Math.cos(nu))
  const xOrb = r * Math.cos(nu)
  const yOrb = r * Math.sin(nu)
  const cosw = Math.cos(peri)
  const sinw = Math.sin(peri)
  const cosi = Math.cos(i)
  const sini = Math.sin(i)
  const cosO = Math.cos(node)
  const sinO = Math.sin(node)
  const x1 = xOrb * cosw - yOrb * sinw
  const y1 = xOrb * sinw + yOrb * cosw
  const x2 = x1
  const y2 = y1 * cosi
  const z2 = y1 * sini
  return [x2 * cosO - y2 * sinO, x2 * sinO + y2 * cosO, z2]
}

function toSceneFromEcliptic(x: number, y: number, z: number, auInUnits: number): Vec3 {
  return [auToDistanceUnits(x, auInUnits), auToDistanceUnits(z, auInUnits), auToDistanceUnits(-y, auInUnits)]
}

function hash(i: number): number {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return n - Math.floor(n)
}

export function createPerseidCloud(auInUnits: number): {
  positions: Float32Array
  crossingCenter: Vec3
} {
  const points: number[] = []
  let crossingX = 0
  let crossingY = 0
  let crossingZ = 0
  let crossingCount = 0

  const samples = 1600
  for (let i = 0; i < samples; i++) {
    const nu = -2.55 + (5.1 * i) / (samples - 1)
    const [ex, ey, ez] = eclipticFromTrueAnomaly(nu)
    const r = Math.hypot(ex, ey, ez)
    if (r < 0.55 || r > 12) continue

    const dense = Math.abs(nu) < 2.52
    const spreadAu = dense ? 0.085 : 0.04
    const count = dense ? 28 : 12
    const center = toSceneFromEcliptic(ex, ey, ez, auInUnits)
    if (r > 0.88 && r < 1.18) {
      crossingX += center[0]
      crossingY += center[1]
      crossingZ += center[2]
      crossingCount += 1
    }

    const tangent = eclipticFromTrueAnomaly(nu + 0.01)
    const tx = tangent[0] - ex
    const ty = tangent[1] - ey
    const tz = tangent[2] - ez
    const tLen = Math.hypot(tx, ty, tz) || 1
    let bx = -ty / tLen
    let by = tx / tLen
    let bz = 0
    let bLen = Math.hypot(bx, by, bz)
    if (bLen < 1e-6) {
      bx = 0
      by = -tz / tLen
      bz = ty / tLen
      bLen = Math.hypot(bx, by, bz)
    }
    bx /= bLen
    by /= bLen
    bz /= bLen
    const nx = (ty * bz - tz * by) / tLen
    const ny = (tz * bx - tx * bz) / tLen
    const nz = (tx * by - ty * bx) / tLen

    for (let k = 0; k < count; k++) {
      const seed = i * 31 + k * 17
      const radius = spreadAu * Math.sqrt(hash(seed))
      const angle = hash(seed + 3) * Math.PI * 2
      const ox = (bx * Math.cos(angle) + nx * Math.sin(angle)) * radius
      const oy = (by * Math.cos(angle) + ny * Math.sin(angle)) * radius
      const oz = (bz * Math.cos(angle) + nz * Math.sin(angle)) * radius
      const p = toSceneFromEcliptic(ex + ox, ey + oy, ez + oz, auInUnits)
      points.push(p[0], p[1], p[2])
    }
  }

  return {
    positions: new Float32Array(points),
    crossingCenter:
      crossingCount > 0
        ? [crossingX / crossingCount, crossingY / crossingCount, crossingZ / crossingCount]
        : [0, 0, 0],
  }
}

export function formatPerseidRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}
