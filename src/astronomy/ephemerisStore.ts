import type { BodyId } from './bodies.ts'
import {
  createAxesMap,
  createGalacticFrame,
  planetNorthMap,
  writeGalacticFrame,
  writeMoonAxes,
  writePlanetAxes,
  type BodyAxis,
  type GalacticFrame,
} from './axes.ts'
import { createBodyPositions, writeBodyPositions, type BodyPositions } from './positions.ts'
import { getBodyRadii, planetRadiiMap, type ScaleSettings } from './scale.ts'

export const SCRUB_FINE_DAYS_PER_SEC = 0.5
export const SCRUB_SLOW_DAYS_PER_SEC = 7
export const SCRUB_FAST_DAYS_PER_SEC = 60
export const DAY_MS = 86_400_000
export const HUD_FLUSH_MS = 100
export const LIVE_REFRESH_MS = 45_000

export type EphemerisStore = {
  dateMs: number
  speedDaysPerSec: number
  live: boolean
  auInUnits: number
  bodyScale: number
  positions: BodyPositions
  axes: Record<BodyId, BodyAxis>
  galactic: GalacticFrame
  revision: number
}

export function createEphemerisStore(scale: ScaleSettings): EphemerisStore {
  const dateMs = Date.now()
  const store: EphemerisStore = {
    dateMs,
    speedDaysPerSec: 0,
    live: true,
    auInUnits: scale.auInUnits,
    bodyScale: scale.bodyScale,
    positions: createBodyPositions(),
    axes: createAxesMap(),
    galactic: createGalacticFrame(),
    revision: 0,
  }
  recomputeEphemeris(store)
  return store
}

export function recomputeEphemeris(store: EphemerisStore): void {
  const date = new Date(store.dateMs)
  writePlanetAxes(store.axes, date)
  const radii = getBodyRadii({ auInUnits: store.auInUnits, bodyScale: store.bodyScale })
  writeBodyPositions(
    store.positions,
    date,
    store.auInUnits,
    planetRadiiMap(radii),
    planetNorthMap(store.axes),
  )
  writeMoonAxes(store.axes, date)
  writeGalacticFrame(store.galactic)
  store.revision += 1
}

export function stepEphemeris(store: EphemerisStore, deltaSec: number): void {
  if (store.speedDaysPerSec === 0) return
  store.live = false
  store.dateMs += store.speedDaysPerSec * deltaSec * DAY_MS
  recomputeEphemeris(store)
}
