import { Body, GeoVector, HelioVector, PlanetOrbitalPeriod } from 'astronomy-engine'
import { PLANET_IDS, type PlanetId } from './bodies.ts'
import { writeScene } from './positions.ts'

const DAY_MS = 86_400_000
const SIDEREAL_MONTH_DAYS = 27.321661

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
  const engine = {
    mercury: Body.Mercury,
    venus: Body.Venus,
    earth: Body.Earth,
    mars: Body.Mars,
    jupiter: Body.Jupiter,
    saturn: Body.Saturn,
    uranus: Body.Uranus,
    neptune: Body.Neptune,
  }[id]
  const out = new Float32Array((ORBIT_SEGMENTS + 1) * 3)
  sampleClosedPath(out, date.getTime(), PlanetOrbitalPeriod(engine), (t) => {
    writeScene(scratch, HelioVector(engine, t), auInUnits)
  })
  return out
}

/** Moon path relative to Earth over one sidereal month. */
export function createMoonOrbitRelative(date: Date, auInUnits: number): Float32Array {
  const out = new Float32Array((ORBIT_SEGMENTS + 1) * 3)
  sampleClosedPath(out, date.getTime(), SIDEREAL_MONTH_DAYS, (t) => {
    writeScene(scratch, GeoVector(Body.Moon, t, false), auInUnits)
  })
  return out
}

export function createAllPlanetOrbitPaths(date: Date, auInUnits: number): Record<PlanetId, Float32Array> {
  return Object.fromEntries(
    PLANET_IDS.map((id) => [id, createPlanetOrbitPath(id, date, auInUnits)]),
  ) as Record<PlanetId, Float32Array>
}

/** Rebuild at most once per civil day so scrubbing stays cheap. */
export function orbitEpochDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS)
}
