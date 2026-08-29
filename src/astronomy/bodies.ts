import { Body } from 'astronomy-engine'

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'

export type MoonId =
  | 'moon'
  | 'phobos'
  | 'deimos'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'mimas'
  | 'enceladus'
  | 'tethys'
  | 'dione'
  | 'rhea'
  | 'titan'
  | 'iapetus'
  | 'miranda'
  | 'ariel'
  | 'umbriel'
  | 'titania'
  | 'oberon'
  | 'triton'

export type BodyId = 'sun' | PlanetId | MoonId

export type SystemBodyDef = {
  id: BodyId
  label: string
  radiusKm: number
  orbitColor: string
}

export type MoonDef = SystemBodyDef & {
  id: MoonId
  parent: PlanetId
  aKm: number
  periodDays: number
  inclDeg: number
  color: [number, number, number]
  swatch: string
}

/** Mean volumetric radii, kilometers. */
export const RADIUS_KM: Record<BodyId, number> = {
  sun: 695_700,
  mercury: 2_440,
  venus: 6_052,
  earth: 6_371,
  moon: 1_737,
  mars: 3_390,
  phobos: 11.3,
  deimos: 6.2,
  jupiter: 69_911,
  io: 1_821.6,
  europa: 1_560.8,
  ganymede: 2_631.2,
  callisto: 2_410.3,
  saturn: 58_232,
  mimas: 198,
  enceladus: 252,
  tethys: 531,
  dione: 561,
  rhea: 764,
  titan: 2_575,
  iapetus: 736,
  uranus: 25_362,
  miranda: 236,
  ariel: 579,
  umbriel: 585,
  titania: 789,
  oberon: 761,
  neptune: 24_622,
  triton: 1_353,
}

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

export const PRIMARY_BODIES: readonly SystemBodyDef[] = [
  { id: 'sun', label: 'Sun', radiusKm: RADIUS_KM.sun, orbitColor: '#f0c36a' },
  { id: 'mercury', label: 'Mercury', radiusKm: RADIUS_KM.mercury, orbitColor: '#9a9084' },
  { id: 'venus', label: 'Venus', radiusKm: RADIUS_KM.venus, orbitColor: '#c4a36a' },
  { id: 'earth', label: 'Earth', radiusKm: RADIUS_KM.earth, orbitColor: '#7f9cb8' },
  { id: 'mars', label: 'Mars', radiusKm: RADIUS_KM.mars, orbitColor: '#c2785c' },
  { id: 'jupiter', label: 'Jupiter', radiusKm: RADIUS_KM.jupiter, orbitColor: '#c4a07a' },
  { id: 'saturn', label: 'Saturn', radiusKm: RADIUS_KM.saturn, orbitColor: '#d4c08a' },
  { id: 'uranus', label: 'Uranus', radiusKm: RADIUS_KM.uranus, orbitColor: '#7ec8c8' },
  { id: 'neptune', label: 'Neptune', radiusKm: RADIUS_KM.neptune, orbitColor: '#5a7ec8' },
]

/** Major moons, inner → outer per planet. */
export const MOON_DEFS: readonly MoonDef[] = [
  {
    id: 'moon',
    label: 'Moon',
    parent: 'earth',
    radiusKm: RADIUS_KM.moon,
    aKm: 384_400,
    periodDays: 27.321661,
    inclDeg: 5.15,
    orbitColor: '#c9c3b0',
    color: [210, 205, 196],
    swatch: '#d8d2c6',
  },
  {
    id: 'phobos',
    label: 'Phobos',
    parent: 'mars',
    radiusKm: RADIUS_KM.phobos,
    aKm: 9_376,
    periodDays: 0.31891,
    inclDeg: 1.09,
    orbitColor: '#b08970',
    color: [168, 132, 110],
    swatch: '#b08970',
  },
  {
    id: 'deimos',
    label: 'Deimos',
    parent: 'mars',
    radiusKm: RADIUS_KM.deimos,
    aKm: 23_463,
    periodDays: 1.263,
    inclDeg: 1.79,
    orbitColor: '#9a8070',
    color: [150, 128, 112],
    swatch: '#9a8070',
  },
  {
    id: 'io',
    label: 'Io',
    parent: 'jupiter',
    radiusKm: RADIUS_KM.io,
    aKm: 421_700,
    periodDays: 1.769138,
    inclDeg: 0.04,
    orbitColor: '#e0c46a',
    color: [228, 186, 82],
    swatch: '#e0c46a',
  },
  {
    id: 'europa',
    label: 'Europa',
    parent: 'jupiter',
    radiusKm: RADIUS_KM.europa,
    aKm: 671_034,
    periodDays: 3.551181,
    inclDeg: 0.47,
    orbitColor: '#d8c8a8',
    color: [214, 200, 176],
    swatch: '#d8c8a8',
  },
  {
    id: 'ganymede',
    label: 'Ganymede',
    parent: 'jupiter',
    radiusKm: RADIUS_KM.ganymede,
    aKm: 1_070_412,
    periodDays: 7.154553,
    inclDeg: 0.18,
    orbitColor: '#b8a888',
    color: [168, 148, 120],
    swatch: '#b8a888',
  },
  {
    id: 'callisto',
    label: 'Callisto',
    parent: 'jupiter',
    radiusKm: RADIUS_KM.callisto,
    aKm: 1_882_709,
    periodDays: 16.689018,
    inclDeg: 0.19,
    orbitColor: '#8a7a68',
    color: [110, 98, 86],
    swatch: '#8a7a68',
  },
  {
    id: 'mimas',
    label: 'Mimas',
    parent: 'saturn',
    radiusKm: RADIUS_KM.mimas,
    aKm: 185_539,
    periodDays: 0.942422,
    inclDeg: 1.53,
    orbitColor: '#d0ccc4',
    color: [200, 196, 188],
    swatch: '#d0ccc4',
  },
  {
    id: 'enceladus',
    label: 'Enceladus',
    parent: 'saturn',
    radiusKm: RADIUS_KM.enceladus,
    aKm: 237_948,
    periodDays: 1.370218,
    inclDeg: 0.02,
    orbitColor: '#f0f2f4',
    color: [230, 234, 236],
    swatch: '#e8eef2',
  },
  {
    id: 'tethys',
    label: 'Tethys',
    parent: 'saturn',
    radiusKm: RADIUS_KM.tethys,
    aKm: 294_619,
    periodDays: 1.887802,
    inclDeg: 1.09,
    orbitColor: '#d8d4cc',
    color: [210, 206, 198],
    swatch: '#d8d4cc',
  },
  {
    id: 'dione',
    label: 'Dione',
    parent: 'saturn',
    radiusKm: RADIUS_KM.dione,
    aKm: 377_396,
    periodDays: 2.736915,
    inclDeg: 0.02,
    orbitColor: '#ccc8c0',
    color: [196, 190, 180],
    swatch: '#ccc8c0',
  },
  {
    id: 'rhea',
    label: 'Rhea',
    parent: 'saturn',
    radiusKm: RADIUS_KM.rhea,
    aKm: 527_108,
    periodDays: 4.518212,
    inclDeg: 0.33,
    orbitColor: '#c4c0b6',
    color: [186, 180, 168],
    swatch: '#c4c0b6',
  },
  {
    id: 'titan',
    label: 'Titan',
    parent: 'saturn',
    radiusKm: RADIUS_KM.titan,
    aKm: 1_221_870,
    periodDays: 15.945421,
    inclDeg: 0.35,
    orbitColor: '#d4a05a',
    color: [196, 132, 56],
    swatch: '#d4a05a',
  },
  {
    id: 'iapetus',
    label: 'Iapetus',
    parent: 'saturn',
    radiusKm: RADIUS_KM.iapetus,
    aKm: 3_560_820,
    periodDays: 79.3215,
    inclDeg: 15.47,
    orbitColor: '#a09080',
    color: [140, 120, 100],
    swatch: '#a09080',
  },
  {
    id: 'miranda',
    label: 'Miranda',
    parent: 'uranus',
    radiusKm: RADIUS_KM.miranda,
    aKm: 129_390,
    periodDays: 1.413479,
    inclDeg: 4.34,
    orbitColor: '#c8d0d4',
    color: [188, 196, 200],
    swatch: '#c8d0d4',
  },
  {
    id: 'ariel',
    label: 'Ariel',
    parent: 'uranus',
    radiusKm: RADIUS_KM.ariel,
    aKm: 191_020,
    periodDays: 2.520379,
    inclDeg: 0.04,
    orbitColor: '#c0c8cc',
    color: [180, 188, 192],
    swatch: '#c0c8cc',
  },
  {
    id: 'umbriel',
    label: 'Umbriel',
    parent: 'uranus',
    radiusKm: RADIUS_KM.umbriel,
    aKm: 266_000,
    periodDays: 4.144177,
    inclDeg: 0.13,
    orbitColor: '#8a9094',
    color: [96, 100, 104],
    swatch: '#8a9094',
  },
  {
    id: 'titania',
    label: 'Titania',
    parent: 'uranus',
    radiusKm: RADIUS_KM.titania,
    aKm: 435_910,
    periodDays: 8.705872,
    inclDeg: 0.08,
    orbitColor: '#b0b4b8',
    color: [160, 164, 168],
    swatch: '#b0b4b8',
  },
  {
    id: 'oberon',
    label: 'Oberon',
    parent: 'uranus',
    radiusKm: RADIUS_KM.oberon,
    aKm: 583_520,
    periodDays: 13.463234,
    inclDeg: 0.07,
    orbitColor: '#9aa0a4',
    color: [140, 144, 148],
    swatch: '#9aa0a4',
  },
  {
    id: 'triton',
    label: 'Triton',
    parent: 'neptune',
    radiusKm: RADIUS_KM.triton,
    aKm: 354_759,
    periodDays: 5.876854,
    inclDeg: 156.87,
    orbitColor: '#c8b8b0',
    color: [196, 176, 168],
    swatch: '#c8b8b0',
  },
]

export const MOON_IDS: readonly MoonId[] = MOON_DEFS.map((moon) => moon.id)

export const SYSTEM_BODY_IDS: readonly BodyId[] = [
  'sun',
  ...PLANET_IDS,
  ...MOON_IDS,
]

export const SYSTEM_BODIES: readonly SystemBodyDef[] = [
  ...PRIMARY_BODIES,
  ...MOON_DEFS,
]

export const BODY_BY_ID: Record<BodyId, SystemBodyDef> = Object.fromEntries(
  SYSTEM_BODIES.map((body) => [body.id, body]),
) as Record<BodyId, SystemBodyDef>

export const MOON_BY_ID: Record<MoonId, MoonDef> = Object.fromEntries(
  MOON_DEFS.map((moon) => [moon.id, moon]),
) as Record<MoonId, MoonDef>

export const MOONS_BY_PARENT: Record<PlanetId, MoonDef[]> = {
  mercury: [],
  venus: [],
  earth: MOON_DEFS.filter((moon) => moon.parent === 'earth'),
  mars: MOON_DEFS.filter((moon) => moon.parent === 'mars'),
  jupiter: MOON_DEFS.filter((moon) => moon.parent === 'jupiter'),
  saturn: MOON_DEFS.filter((moon) => moon.parent === 'saturn'),
  uranus: MOON_DEFS.filter((moon) => moon.parent === 'uranus'),
  neptune: MOON_DEFS.filter((moon) => moon.parent === 'neptune'),
}

export const PLANET_ENGINE: Record<PlanetId, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
}

export function isMoonId(id: string): id is MoonId {
  return id in MOON_BY_ID
}

export function isPlanetId(id: string): id is PlanetId {
  return PLANET_IDS.includes(id as PlanetId)
}