import { Body, GeoVector, HelioVector, RotateVector, Rotation_EQJ_ECL, type Vector } from 'astronomy-engine'
import { PLANET_IDS, type BodyId, type PlanetId } from './bodies.ts'
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
  return {
    sun: vec3(),
    mercury: vec3(),
    venus: vec3(),
    earth: vec3(),
    moon: vec3(),
    mars: vec3(),
    jupiter: vec3(),
    saturn: vec3(),
    uranus: vec3(),
    neptune: vec3(),
    moonOrbitRadius: 0,
  }
}

const PLANET_ENGINE: Record<PlanetId, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
}

export function writeBodyPositions(out: BodyPositions, date: Date, auInUnits: number): void {
  out.sun[0] = 0
  out.sun[1] = 0
  out.sun[2] = 0

  for (const id of PLANET_IDS) {
    writeScene(out[id], HelioVector(PLANET_ENGINE[id], date), auInUnits)
  }

  const moonOffset = toScene(GeoVector(Body.Moon, date, false), auInUnits)
  out.moon[0] = out.earth[0] + moonOffset[0]
  out.moon[1] = out.earth[1] + moonOffset[1]
  out.moon[2] = out.earth[2] + moonOffset[2]
  out.moonOrbitRadius = length(sub(out.moon, out.earth))
}


