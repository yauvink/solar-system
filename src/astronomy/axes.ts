import {
  MakeTime,
  RotateVector,
  RotationAxis,
  Rotation_GAL_EQJ,
  Vector,
  type Body,
} from 'astronomy-engine'
import { SYSTEM_BODIES, type BodyId } from './bodies.ts'
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
  return {
    sun: createBodyAxis(),
    mercury: createBodyAxis(),
    venus: createBodyAxis(),
    earth: createBodyAxis(),
    moon: createBodyAxis(),
    mars: createBodyAxis(),
    jupiter: createBodyAxis(),
    saturn: createBodyAxis(),
    uranus: createBodyAxis(),
    neptune: createBodyAxis(),
  }
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

export function writeAllBodyAxes(out: Record<BodyId, BodyAxis>, date: Date): void {
  for (const def of SYSTEM_BODIES) {
    writeBodyAxis(out[def.id], def.engine, date)
  }
}

export function writeGalacticFrame(out: GalacticFrame): void {
  const time = MakeTime(new Date())
  const galToEqj = Rotation_GAL_EQJ()
  writeSceneDir(out.center, RotateVector(galToEqj, new Vector(1, 0, 0, time)))
  writeSceneDir(out.motion, RotateVector(galToEqj, new Vector(0, 1, 0, time)))
  writeSceneDir(out.north, RotateVector(galToEqj, new Vector(0, 0, 1, time)))
  out.motionTiltDeg = tiltToEclipticPlaneDeg(out.motion)
}
