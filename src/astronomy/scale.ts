import { RADIUS_KM, SYSTEM_BODY_IDS, type BodyId, type PlanetId } from './bodies.ts'

/** Kilometers in one astronomical unit. */
export const KM_PER_AU = 149_597_870.7

export type ScaleSettings = {
  auInUnits: number
  bodyScale: number
  skyBrightness: number
  milkyWayBrightness: number
}

export type BodyRadii = Record<BodyId, number>

export const BODY_SCALE_MIN = 1
export const BODY_SCALE_MAX = 30
export const SKY_BRIGHTNESS_MIN = 0
export const SKY_BRIGHTNESS_MAX = 100

export const DEFAULT_SCALE: ScaleSettings = {
  auInUnits: 100,
  bodyScale: 15,
  skyBrightness: 30,
  milkyWayBrightness: 10,
}

export function auToDistanceUnits(au: number, auInUnits: number): number {
  return au * auInUnits
}

export function getBodyRadii(
  settings: Pick<ScaleSettings, 'auInUnits' | 'bodyScale'>,
): BodyRadii {
  const kmPerUnit = KM_PER_AU / settings.auInUnits
  const toUnits = (km: number) => (km / kmPerUnit) * settings.bodyScale
  return Object.fromEntries(
    SYSTEM_BODY_IDS.map((id) => [id, toUnits(RADIUS_KM[id])]),
  ) as BodyRadii
}

export function planetRadiiMap(radii: BodyRadii): Record<PlanetId, number> {
  return {
    mercury: radii.mercury,
    venus: radii.venus,
    earth: radii.earth,
    mars: radii.mars,
    jupiter: radii.jupiter,
    saturn: radii.saturn,
    uranus: radii.uranus,
    neptune: radii.neptune,
  }
}

export function skyRadiusForScale(auInUnits: number): number {
  return auInUnits * 80
}

export function cameraFarForScale(auInUnits: number): number {
  return auInUnits * 200
}

export function maxDistanceForScale(auInUnits: number): number {
  return auInUnits * 42
}

