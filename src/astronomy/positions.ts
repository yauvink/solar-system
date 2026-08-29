import { HelioVector, RotateVector, Rotation_EQJ_ECL, type Vector } from 'astronomy-engine'
import {
  MOON_IDS,
  PLANET_ENGINE,
  PLANET_IDS,
  SYSTEM_BODY_IDS,
  type BodyId,
  type MoonId,
  type PlanetId,
} from './bodies.ts'
import { writeMoonPositions } from './moons.ts'
import { auToDistanceUnits } from './scale.ts'

export type Vec3 = [number, number, number]

export type BodyPositions = Record<BodyId, Vec3> & {
  moonOrbitRadius: number
}

const eqjToEcl = Rotation_EQJ_ECL()

export const ECLIPTIC_NORTH: Vec3 = [0, 1, 0]

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return [x, y, z]
}

export function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/**
 * EQJ → ecliptic, then Y-up for Three.js (ecliptic plane = XZ).
 */
export function toScene(vector: Vector, auInUnits: number): Vec3 {
  const ecl = RotateVector(eqjToEcl, vector)
  return [
    auToDistanceUnits(ecl.x, auInUnits),
    auToDistanceUnits(ecl.z, auInUnits),
    auToDistanceUnits(-ecl.y, auInUnits),
  ]
}

export function writeScene(out: Vec3, vector: Vector, auInUnits: number): void {
  const ecl = RotateVector(eqjToEcl, vector)
  out[0] = auToDistanceUnits(ecl.x, auInUnits)
  out[1] = auToDistanceUnits(ecl.z, auInUnits)
  out[2] = auToDistanceUnits(-ecl.y, auInUnits)
}

export function writeSceneDir(out: Vec3, vector: Vector): void {
  const ecl = RotateVector(eqjToEcl, vector)
  const x = ecl.x
  const y = ecl.z
  const z = -ecl.y
  const len = Math.hypot(x, y, z)
  if (len < 1e-12) {
    out[0] = 0
    out[1] = 1
    out[2] = 0
    return
  }
  out[0] = x / len
  out[1] = y / len
  out[2] = z / len
}

export function createBodyPositions(): BodyPositions {
  const positions = Object.fromEntries(SYSTEM_BODY_IDS.map((id) => [id, vec3()])) as Record<
    BodyId,
    Vec3
  >
  return { ...positions, moonOrbitRadius: 0 }
}

export function writeBodyPositions(
  out: BodyPositions,
  date: Date,
  auInUnits: number,
  parentRadii: Record<PlanetId, number>,
  parentNorth: Record<PlanetId, Vec3>,
): void {
  out.sun[0] = 0
  out.sun[1] = 0
  out.sun[2] = 0

  for (const id of PLANET_IDS) {
    writeScene(out[id], HelioVector(PLANET_ENGINE[id], date), auInUnits)
  }

  const planets = Object.fromEntries(PLANET_IDS.map((id) => [id, out[id]])) as Record<PlanetId, Vec3>
  const moons = Object.fromEntries(MOON_IDS.map((id) => [id, out[id]])) as Record<MoonId, Vec3>
  writeMoonPositions(moons, planets, parentNorth, parentRadii, auInUnits, date)

  out.moonOrbitRadius = length(sub(out.moon, out.earth))
}
