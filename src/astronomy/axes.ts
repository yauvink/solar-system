import {
  Body,
  MakeTime,
  RotateVector,
  RotationAxis,
  Rotation_GAL_EQJ,
  Vector,
} from 'astronomy-engine'
import {
  MOON_DEFS,
  PLANET_ENGINE,
  PLANET_IDS,
  SYSTEM_BODY_IDS,
  type BodyId,
  type PlanetId,
} from './bodies.ts'
import { dot, ECLIPTIC_NORTH, writeSceneDir, type Vec3, vec3 } from './positions.ts'

export type BodyAxis = {
  north: Vec3
  tiltDeg: number
  spinDeg: number
}

export type GalacticFrame = {
  center: Vec3
  motion: Vec3
  north: Vec3
  motionTiltDeg: number
}

export function createBodyAxis(): BodyAxis {
  return { north: vec3(0, 1, 0), tiltDeg: 0, spinDeg: 0 }
}

export function createAxesMap(): Record<BodyId, BodyAxis> {
  return Object.fromEntries(SYSTEM_BODY_IDS.map((id) => [id, createBodyAxis()])) as Record<
    BodyId,
    BodyAxis
  >
}

export function createGalacticFrame(): GalacticFrame {
  return {
    center: vec3(1, 0, 0),
    motion: vec3(0, 0, 1),
    north: vec3(0, 1, 0),
    motionTiltDeg: 0,
  }
}

function tiltToEclipticDeg(north: Vec3): number {
  const clamped = Math.min(1, Math.max(-1, dot(north, ECLIPTIC_NORTH)))
  return (Math.acos(clamped) * 180) / Math.PI
}

function tiltToEclipticPlaneDeg(direction: Vec3): number {
  return (Math.asin(Math.min(1, Math.max(-1, direction[1]))) * 180) / Math.PI
}

export function writeBodyAxis(out: BodyAxis, body: Body, date: Date): void {
  const axis = RotationAxis(body, date)
  writeSceneDir(out.north, axis.north)
  out.tiltDeg = tiltToEclipticDeg(out.north)
  out.spinDeg = axis.spin
}

export function writePlanetAxes(out: Record<BodyId, BodyAxis>, date: Date): void {
  writeBodyAxis(out.sun, Body.Sun, date)
  for (const id of PLANET_IDS) {
    writeBodyAxis(out[id], PLANET_ENGINE[id], date)
  }
}

export function writeMoonAxes(out: Record<BodyId, BodyAxis>, date: Date): void {
  writeBodyAxis(out.moon, Body.Moon, date)
  const days = date.getTime() / 86_400_000
  for (const moon of MOON_DEFS) {
    if (moon.id === 'moon') continue
    const parent = out[moon.parent]
    out[moon.id].north[0] = parent.north[0]
    out[moon.id].north[1] = parent.north[1]
    out[moon.id].north[2] = parent.north[2]
    out[moon.id].tiltDeg = parent.tiltDeg
    out[moon.id].spinDeg = ((days / moon.periodDays) * 360) % 360
  }
}

export function planetNorthMap(axes: Record<BodyId, BodyAxis>): Record<PlanetId, Vec3> {
  return Object.fromEntries(PLANET_IDS.map((id) => [id, axes[id].north])) as Record<PlanetId, Vec3>
}

export function writeGalacticFrame(out: GalacticFrame): void {
  const time = MakeTime(new Date())
  const galToEqj = Rotation_GAL_EQJ()
  writeSceneDir(out.center, RotateVector(galToEqj, new Vector(1, 0, 0, time)))
  writeSceneDir(out.motion, RotateVector(galToEqj, new Vector(0, 1, 0, time)))
  writeSceneDir(out.north, RotateVector(galToEqj, new Vector(0, 0, 1, time)))
  out.motionTiltDeg = tiltToEclipticPlaneDeg(out.motion)
}
