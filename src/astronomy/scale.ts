import { RADIUS_KM, type BodyId } from './bodies.ts'

/** Kilometers in one astronomical unit. */
export const KM_PER_AU = 149_597_870.7

export type ScaleSettings = {
  auInUnits: number
  bodyScale: number
}

export type BodyRadii = Record<BodyId, number>

export const DEFAULT_SCALE: ScaleSettings = {
  auInUnits: 100,
  bodyScale: 30,
}

export function auToDistanceUnits(au: number, auInUnits: number): number {
  return au * auInUnits
}

export function getBodyRadii(settings: ScaleSettings): BodyRadii {
  const kmPerUnit = KM_PER_AU / settings.auInUnits
  const toUnits = (km: number) => (km / kmPerUnit) * settings.bodyScale

  return {
    sun: toUnits(RADIUS_KM.sun),
    mercury: toUnits(RADIUS_KM.mercury),
    venus: toUnits(RADIUS_KM.venus),
    earth: toUnits(RADIUS_KM.earth),
    moon: toUnits(RADIUS_KM.moon),
    mars: toUnits(RADIUS_KM.mars),
    jupiter: toUnits(RADIUS_KM.jupiter),
    saturn: toUnits(RADIUS_KM.saturn),
    uranus: toUnits(RADIUS_KM.uranus),
    neptune: toUnits(RADIUS_KM.neptune),
  }
}

export function skyRadiusForScale(auInUnits: number): number {
  return auInUnits * 48
}

export function cameraFarForScale(auInUnits: number): number {
  return auInUnits * 200
}

export function maxDistanceForScale(auInUnits: number): number {
  return auInUnits * 42
}

