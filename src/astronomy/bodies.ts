import { Body } from 'astronomy-engine'

export type BodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'

export type PlanetId = Exclude<BodyId, 'sun' | 'moon'>

export type SystemBodyDef = {
  id: BodyId
  label: string
  engine: Body
  radiusKm: number
  orbitColor: string
}

/** Mean volumetric radii, kilometers. */
export const RADIUS_KM: Record<BodyId, number> = {
  sun: 695_700,
  mercury: 2_440,
  venus: 6_052,
  earth: 6_371,
  moon: 1_737,
  mars: 3_390,
  jupiter: 69_911,
  saturn: 58_232,
  uranus: 25_362,
  neptune: 24_622,
}

export const SYSTEM_BODY_IDS: readonly BodyId[] = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]

export const PLANET_IDS: readonly PlanetId[] = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]

export const SYSTEM_BODIES: readonly SystemBodyDef[] = [
  { id: 'sun', label: 'Sun', engine: Body.Sun, radiusKm: RADIUS_KM.sun, orbitColor: '#f0c36a' },
  { id: 'mercury', label: 'Mercury', engine: Body.Mercury, radiusKm: RADIUS_KM.mercury, orbitColor: '#9a9084' },
  { id: 'venus', label: 'Venus', engine: Body.Venus, radiusKm: RADIUS_KM.venus, orbitColor: '#c4a36a' },
  { id: 'earth', label: 'Earth', engine: Body.Earth, radiusKm: RADIUS_KM.earth, orbitColor: '#7f9cb8' },
  { id: 'moon', label: 'Moon', engine: Body.Moon, radiusKm: RADIUS_KM.moon, orbitColor: '#c9c3b0' },
  { id: 'mars', label: 'Mars', engine: Body.Mars, radiusKm: RADIUS_KM.mars, orbitColor: '#c2785c' },
  { id: 'jupiter', label: 'Jupiter', engine: Body.Jupiter, radiusKm: RADIUS_KM.jupiter, orbitColor: '#c4a07a' },
  { id: 'saturn', label: 'Saturn', engine: Body.Saturn, radiusKm: RADIUS_KM.saturn, orbitColor: '#d4c08a' },
  { id: 'uranus', label: 'Uranus', engine: Body.Uranus, radiusKm: RADIUS_KM.uranus, orbitColor: '#7ec8c8' },
  { id: 'neptune', label: 'Neptune', engine: Body.Neptune, radiusKm: RADIUS_KM.neptune, orbitColor: '#5a7ec8' },
]

export const BODY_BY_ID: Record<BodyId, SystemBodyDef> = Object.fromEntries(
  SYSTEM_BODIES.map((body) => [body.id, body]),
) as Record<BodyId, SystemBodyDef>
