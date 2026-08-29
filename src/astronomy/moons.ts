import { Body, GeoVector, JupiterMoons, Vector } from 'astronomy-engine'
import {
  MOON_BY_ID,
  MOON_DEFS,
  MOONS_BY_PARENT,
  type MoonId,
  type PlanetId,
} from './bodies.ts'
import { KM_PER_AU } from './scale.ts'
import { length, toScene, writeScene, type Vec3 } from './positions.ts'

const J2000_MS = Date.UTC(2000, 0, 1, 12)
const DAY_MS = 86_400_000

function seedAngle(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0
  return (hash % 360) * (Math.PI / 180)
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function normalize(v: Vec3): Vec3 {
  const len = length(v) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

/** Keep the moon system outside the visually inflated planet. */
export function moonSystemScale(
  parent: PlanetId,
  parentRadius: number,
  auInUnits: number,
): number {
  const inner = MOONS_BY_PARENT[parent][0]
  if (!inner) return 1
  const innerUnits = (inner.aKm / KM_PER_AU) * auInUnits
  const minDist = parentRadius * 1.4
  if (innerUnits <= 1e-9) return 1
  return Math.max(1, minDist / innerUnits)
}

function keplerOffset(
  id: MoonId,
  parentNorth: Vec3,
  auInUnits: number,
  orbitScale: number,
  date: Date,
): Vec3 {
  const def = MOON_BY_ID[id]
  const days = (date.getTime() - J2000_MS) / DAY_MS
  const mean = (days / def.periodDays) * Math.PI * 2 + seedAngle(id)
  const incl = (def.inclDeg * Math.PI) / 180
  const radius = (def.aKm / KM_PER_AU) * auInUnits * orbitScale
  const c = Math.cos(mean)
  const s = Math.sin(mean)
  const ci = Math.cos(incl)
  const si = Math.sin(incl)
  const north = normalize(parentNorth)
  const ref: Vec3 = Math.abs(north[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0]
  const axisX = normalize(cross(ref, north))
  const axisZ = cross(north, axisX)
  const lx = c
  const ly = s * si
  const lz = s * ci
  return [
    (axisX[0] * lx + north[0] * ly + axisZ[0] * lz) * radius,
    (axisX[1] * lx + north[1] * ly + axisZ[1] * lz) * radius,
    (axisX[2] * lx + north[2] * ly + axisZ[2] * lz) * radius,
  ]
}

const JUPITER_MOON_KEY: Record<
  'io' | 'europa' | 'ganymede' | 'callisto',
  'io' | 'europa' | 'ganymede' | 'callisto'
> = {
  io: 'io',
  europa: 'europa',
  ganymede: 'ganymede',
  callisto: 'callisto',
}

export function moonOffset(
  id: MoonId,
  parentNorth: Vec3,
  auInUnits: number,
  orbitScale: number,
  date: Date,
): Vec3 {
  if (id === 'moon') {
    const offset = toScene(GeoVector(Body.Moon, date, false), auInUnits)
    return [offset[0] * orbitScale, offset[1] * orbitScale, offset[2] * orbitScale]
  }

  const jupiterKey = JUPITER_MOON_KEY[id as keyof typeof JUPITER_MOON_KEY]
  if (jupiterKey) {
    const info = JupiterMoons(date)
    const state = info[jupiterKey]
    const scratch: Vec3 = [0, 0, 0]
    writeScene(scratch, new Vector(state.x, state.y, state.z, state.t), auInUnits)
    return [scratch[0] * orbitScale, scratch[1] * orbitScale, scratch[2] * orbitScale]
  }

  return keplerOffset(id, parentNorth, auInUnits, orbitScale, date)
}

export function writeMoonPositions(
  out: Record<MoonId, Vec3>,
  planets: Record<PlanetId, Vec3>,
  parentNorth: Record<PlanetId, Vec3>,
  parentRadii: Record<PlanetId, number>,
  auInUnits: number,
  date: Date,
): void {
  const scales: Partial<Record<PlanetId, number>> = {}
  for (const def of MOON_DEFS) {
    const scale = (scales[def.parent] ??= moonSystemScale(
      def.parent,
      parentRadii[def.parent],
      auInUnits,
    ))
    const offset = moonOffset(def.id, parentNorth[def.parent], auInUnits, scale, date)
    const parent = planets[def.parent]
    out[def.id][0] = parent[0] + offset[0]
    out[def.id][1] = parent[1] + offset[1]
    out[def.id][2] = parent[2] + offset[2]
  }
}
