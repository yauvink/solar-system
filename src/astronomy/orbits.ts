import { HelioVector, PlanetOrbitalPeriod } from 'astronomy-engine'
import {
  MOON_DEFS,
  MOON_IDS,
  PLANET_ENGINE,
  PLANET_IDS,
  type MoonId,
  type PlanetId,
} from './bodies.ts'
import { moonOffset, moonSystemScale } from './moons.ts'
import { writeScene, type Vec3 } from './positions.ts'

const DAY_MS = 86_400_000

export const ORBIT_SEGMENTS = 160

const scratch: [number, number, number] = [0, 0, 0]

function sampleClosedPath(
  out: Float32Array,
  startMs: number,
  periodDays: number,
  sample: (date: Date) => void,
): void {
  const span = periodDays * DAY_MS
  for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
    const date = new Date(startMs + (i / ORBIT_SEGMENTS) * span)
    sample(date)
    const i3 = i * 3
    out[i3] = scratch[0]
    out[i3 + 1] = scratch[1]
    out[i3 + 2] = scratch[2]
  }
}

/** Heliocentric path over one sidereal period — the real oval, not a circle. */
export function createPlanetOrbitPath(id: PlanetId, date: Date, auInUnits: number): Float32Array {
  const engine = PLANET_ENGINE[id]
  const out = new Float32Array((ORBIT_SEGMENTS + 1) * 3)
  sampleClosedPath(out, date.getTime(), PlanetOrbitalPeriod(engine), (t) => {
    writeScene(scratch, HelioVector(engine, t), auInUnits)
  })
  return out
}

export function createMoonOrbitRelative(
  id: MoonId,
  date: Date,
  auInUnits: number,
  parentNorth: Vec3,
  orbitScale: number,
): Float32Array {
  const def = MOON_DEFS.find((moon) => moon.id === id)
  if (!def) return new Float32Array((ORBIT_SEGMENTS + 1) * 3)
  const out = new Float32Array((ORBIT_SEGMENTS + 1) * 3)
  sampleClosedPath(out, date.getTime(), def.periodDays, (t) => {
    const offset = moonOffset(id, parentNorth, auInUnits, orbitScale, t)
    scratch[0] = offset[0]
    scratch[1] = offset[1]
    scratch[2] = offset[2]
  })
  return out
}

export function createAllPlanetOrbitPaths(
  date: Date,
  auInUnits: number,
): Record<PlanetId, Float32Array> {
  return Object.fromEntries(
    PLANET_IDS.map((id) => [id, createPlanetOrbitPath(id, date, auInUnits)]),
  ) as Record<PlanetId, Float32Array>
}

export function createAllMoonOrbitPaths(
  date: Date,
  auInUnits: number,
  parentNorth: Record<PlanetId, Vec3>,
  parentRadii: Record<PlanetId, number>,
): Record<MoonId, Float32Array> {
  const scales: Partial<Record<PlanetId, number>> = {}
  return Object.fromEntries(
    MOON_IDS.map((id) => {
      const parent = MOON_DEFS.find((moon) => moon.id === id)!.parent
      const scale = (scales[parent] ??= moonSystemScale(parent, parentRadii[parent], auInUnits))
      return [id, createMoonOrbitRelative(id, date, auInUnits, parentNorth[parent], scale)]
    }),
  ) as Record<MoonId, Float32Array>
}

/** Rebuild at most once per civil day so scrubbing stays cheap. */
export function orbitEpochDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS)
}
