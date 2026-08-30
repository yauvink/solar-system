import { SunPosition } from 'astronomy-engine'
import { ORBIT_SEGMENTS } from './orbits.ts'
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

const PERIOD_YEARS = 133.28
const PERIOD_MS = PERIOD_YEARS * 365.25 * 86_400_000
/** 12 December 1992 perihelion (JPL SBDB). */
const PERIHELION_MS = Date.UTC(1992, 11, 12)
/** One visual crawl of the drawn arc per this many years of ephemeris time. */
const DUST_LAP_YEARS = 48
const DUST_LAP_MS = DUST_LAP_YEARS * 365.25 * 86_400_000

export const PERSEID_PATH_SAMPLES = 220
export const PERSEID_DUST_COUNT = 3200
const PATH_NU_MIN = -2.79
const PATH_NU_MAX = 2.79

export type PerseidDustKit = {
  pathEcl: Float32Array
  u: Float32Array
  offsetEcl: Float32Array
  crossingEcl: Vec3
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

export function toSceneFromEcliptic(x: number, y: number, z: number, auInUnits: number): Vec3 {
  return [auToDistanceUnits(x, auInUnits), auToDistanceUnits(z, auInUnits), auToDistanceUnits(-y, auInUnits)]
}

function keplerE(M: number, e: number): number {
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 16; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-11) break
  }
  return E
}

function trueAnomalyFromDate(date: Date): number {
  const turns = (date.getTime() - PERIHELION_MS) / PERIOD_MS
  let M = (turns - Math.floor(turns)) * Math.PI * 2
  if (M > Math.PI) M -= Math.PI * 2
  const E = keplerE(M, SWIFT_TUTTLE.e)
  const sinH = Math.sin(E / 2)
  const cosH = Math.cos(E / 2)
  return 2 * Math.atan2(Math.sqrt(1 + SWIFT_TUTTLE.e) * sinH, Math.sqrt(1 - SWIFT_TUTTLE.e) * cosH)
}

export function positionOfSwiftTuttle(date: Date, auInUnits: number): Vec3 {
  const [x, y, z] = eclipticFromTrueAnomaly(trueAnomalyFromDate(date))
  return toSceneFromEcliptic(x, y, z, auInUnits)
}

function hash(i: number): number {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return n - Math.floor(n)
}

function writePathEcliptic(out: Float32Array): void {
  for (let i = 0; i < PERSEID_PATH_SAMPLES; i++) {
    const nu = PATH_NU_MIN + ((PATH_NU_MAX - PATH_NU_MIN) * i) / (PERSEID_PATH_SAMPLES - 1)
    const [x, y, z] = eclipticFromTrueAnomaly(nu)
    const i3 = i * 3
    out[i3] = x
    out[i3 + 1] = y
    out[i3 + 2] = z
  }
}

function samplePathEcl(path: Float32Array, u: number, out: [number, number, number]): void {
  const n = path.length / 3
  const t = ((u % 1) + 1) % 1
  const f = t * (n - 1)
  const i = Math.min(n - 2, Math.floor(f))
  const s = f - i
  const a = i * 3
  const b = a + 3
  out[0] = path[a] + (path[b] - path[a]) * s
  out[1] = path[a + 1] + (path[b + 1] - path[a + 1]) * s
  out[2] = path[a + 2] + (path[b + 2] - path[a + 2]) * s
}

function pathFrame(
  path: Float32Array,
  u: number,
): { t: [number, number, number]; b: [number, number, number]; n: [number, number, number] } {
  const ecl: [number, number, number] = [0, 0, 0]
  const ahead: [number, number, number] = [0, 0, 0]
  samplePathEcl(path, u, ecl)
  samplePathEcl(path, u + 0.004, ahead)
  let tx = ahead[0] - ecl[0]
  let ty = ahead[1] - ecl[1]
  let tz = ahead[2] - ecl[2]
  const tLen = Math.hypot(tx, ty, tz) || 1
  tx /= tLen
  ty /= tLen
  tz /= tLen
  let bx = -ty
  let by = tx
  let bz = 0
  let bLen = Math.hypot(bx, by, bz)
  if (bLen < 1e-6) {
    bx = 0
    by = -tz
    bz = ty
    bLen = Math.hypot(bx, by, bz) || 1
  }
  bx /= bLen
  by /= bLen
  bz /= bLen
  const nx = ty * bz - tz * by
  const ny = tz * bx - tx * bz
  const nz = tx * by - ty * bx
  return { t: [tx, ty, tz], b: [bx, by, bz], n: [nx, ny, nz] }
}

export function createPerseidOrbitPath(auInUnits: number): Float32Array {
  const count = ORBIT_SEGMENTS + 1
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const nu = PATH_NU_MIN + ((PATH_NU_MAX - PATH_NU_MIN) * i) / (count - 1)
    const [x, y, z] = eclipticFromTrueAnomaly(nu)
    const scene = toSceneFromEcliptic(x, y, z, auInUnits)
    const i3 = i * 3
    out[i3] = scene[0]
    out[i3 + 1] = scene[1]
    out[i3 + 2] = scene[2]
  }
  return out
}

function descendingNodeEcliptic(): Vec3 {
  return eclipticFromTrueAnomaly(Math.PI - SWIFT_TUTTLE.peri)
}

export function createPerseidDustKit(): PerseidDustKit {
  const pathEcl = new Float32Array(PERSEID_PATH_SAMPLES * 3)
  writePathEcliptic(pathEcl)
  const crossingEcl = descendingNodeEcliptic()

  const u = new Float32Array(PERSEID_DUST_COUNT)
  const offsetEcl = new Float32Array(PERSEID_DUST_COUNT * 3)
  const ecl: [number, number, number] = [0, 0, 0]
  const nodeU = (Math.PI - SWIFT_TUTTLE.peri - PATH_NU_MIN) / (PATH_NU_MAX - PATH_NU_MIN)
  for (let k = 0; k < PERSEID_DUST_COUNT; k++) {
    const nearEarth = hash(k * 3) < 0.38
    const base = nearEarth ? nodeU - 0.07 + hash(k * 5) * 0.14 : hash(k * 7)
    u[k] = base
    samplePathEcl(pathEcl, base, ecl)
    const r = Math.hypot(ecl[0], ecl[1], ecl[2])
    const spread = r > 0.75 && r < 1.4 ? 0.09 : 0.045
    const frame = pathFrame(pathEcl, base)
    const radius = spread * Math.sqrt(hash(k * 11 + 2))
    const angle = hash(k * 13 + 4) * Math.PI * 2
    const cb = Math.cos(angle) * radius
    const cn = Math.sin(angle) * radius
    const i3 = k * 3
    offsetEcl[i3] = frame.b[0] * cb + frame.n[0] * cn
    offsetEcl[i3 + 1] = frame.b[1] * cb + frame.n[1] * cn
    offsetEcl[i3 + 2] = frame.b[2] * cb + frame.n[2] * cn
  }

  return {
    pathEcl,
    u,
    offsetEcl,
    crossingEcl,
  }
}

const dustScratch: [number, number, number] = [0, 0, 0]

export function writePerseidDustScene(
  out: Float32Array,
  kit: PerseidDustKit,
  dateMs: number,
  auInUnits: number,
): void {
  const shift = dateMs / DUST_LAP_MS
  for (let k = 0; k < kit.u.length; k++) {
    samplePathEcl(kit.pathEcl, kit.u[k] + shift, dustScratch)
    const i3 = k * 3
    const scene = toSceneFromEcliptic(
      dustScratch[0] + kit.offsetEcl[i3],
      dustScratch[1] + kit.offsetEcl[i3 + 1],
      dustScratch[2] + kit.offsetEcl[i3 + 2],
      auInUnits,
    )
    out[i3] = scene[0]
    out[i3 + 1] = scene[1]
    out[i3 + 2] = scene[2]
  }
}

export function perseidCrossingCenter(auInUnits: number): Vec3 {
  const kit = crossingKitCache()
  return toSceneFromEcliptic(kit.crossingEcl[0], kit.crossingEcl[1], kit.crossingEcl[2], auInUnits)
}

let cachedKit: PerseidDustKit | null = null
function crossingKitCache(): PerseidDustKit {
  if (!cachedKit) cachedKit = createPerseidDustKit()
  return cachedKit
}

export function formatPerseidRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}
