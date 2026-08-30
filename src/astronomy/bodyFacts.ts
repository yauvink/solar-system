import type { FocusId } from '../scene/CameraRig.tsx'

export type FactRow = {
  label: string
  value: string
}

export type BodyFacts = {
  title: string
  kind: string
  rows: readonly FactRow[]
}

/**
 * Physical values from NASA NSSDCA Planetary Fact Sheets (D. R. Williams)
 * and NASA Science planet/moon pages. Temperatures for the eight planets
 * match NASA Science “Solar System Temperatures” (Planetary Fact Sheet).
 */
export const BODY_FACTS: Record<FocusId, BodyFacts> = {
  reset: {
    title: 'Solar system',
    kind: 'Our planetary system',
    rows: [
      { label: 'Age', value: '4.6 billion years' },
      { label: 'Planets', value: '8 (IAU, 2006)' },
      { label: '1 AU', value: '149,597,871 km' },
      { label: 'Mass share', value: 'Sun holds 99.8%' },
    ],
  },
  sun: {
    title: 'Sun',
    kind: 'G2V star',
    rows: [
      { label: 'Rotation', value: '25.4 days at equator' },
      { label: 'Day length', value: '25.4 Earth days (eq.)' },
      { label: 'Temperature', value: '5,772 K photosphere' },
      { label: 'Composition', value: '71% H, 27% He by mass' },
    ],
  },
  mercury: {
    title: 'Mercury',
    kind: 'Terrestrial planet',
    rows: [
      { label: 'Rotation', value: '58.6 Earth days' },
      { label: 'Solar day', value: '176 Earth days' },
      { label: 'Mean temp.', value: '167 °C' },
      { label: 'Atmosphere', value: 'Thin exosphere (Na, O, He)' },
    ],
  },
  venus: {
    title: 'Venus',
    kind: 'Terrestrial planet',
    rows: [
      { label: 'Rotation', value: '243 Earth days, retrograde' },
      { label: 'Solar day', value: '117 Earth days' },
      { label: 'Mean temp.', value: '464 °C' },
      { label: 'Atmosphere', value: '96.5% CO₂, 3.5% N₂' },
    ],
  },
  earth: {
    title: 'Earth',
    kind: 'Terrestrial planet',
    rows: [
      { label: 'Rotation', value: '23.93 hours' },
      { label: 'Solar day', value: '24.00 hours' },
      { label: 'Mean temp.', value: '15 °C' },
      { label: 'Atmosphere', value: '78% N₂, 21% O₂' },
    ],
  },
  yulia: {
    title: 'Юля',
    kind: 'A world of my own',
    rows: [
      { label: 'Named for', value: 'Моя сестра Юля — лучшая сестра' },
      { label: 'Heart', value: 'Нежная, светлая, любимая' },
      { label: 'Orbit', value: 'Around Venus, always nearby' },
      { label: 'Sky', value: 'Rose gardens under a lilac dusk' },
    ],
  },
  moon: {
    title: 'Moon',
    kind: 'Satellite of Earth',
    rows: [
      { label: 'Rotation', value: '27.3 days, synchronous' },
      { label: 'Solar day', value: '29.5 Earth days' },
      { label: 'Mean temp.', value: '−23 °C' },
      { label: 'Surface', value: 'Anorthosite and mare basalt' },
    ],
  },
  mars: {
    title: 'Mars',
    kind: 'Terrestrial planet',
    rows: [
      { label: 'Rotation', value: '24.6 hours' },
      { label: 'Solar day', value: '24.7 hours' },
      { label: 'Mean temp.', value: '−65 °C' },
      { label: 'Atmosphere', value: '95% CO₂, 3% N₂, 2% Ar' },
    ],
  },
  phobos: {
    title: 'Phobos',
    kind: 'Satellite of Mars',
    rows: [
      { label: 'Rotation', value: '7.66 hours, synchronous' },
      { label: 'Orbit period', value: '7.66 hours' },
      { label: 'Mean radius', value: '11.3 km' },
      { label: 'Composition', value: 'Dark carbonaceous rubble' },
    ],
  },
  deimos: {
    title: 'Deimos',
    kind: 'Satellite of Mars',
    rows: [
      { label: 'Rotation', value: '30.3 hours, synchronous' },
      { label: 'Orbit period', value: '1.26 Earth days' },
      { label: 'Mean radius', value: '6.2 km' },
      { label: 'Composition', value: 'Dark carbonaceous rubble' },
    ],
  },
  jupiter: {
    title: 'Jupiter',
    kind: 'Gas giant',
    rows: [
      { label: 'Rotation', value: '9.93 hours' },
      { label: 'Day length', value: '9.93 hours' },
      { label: 'Mean temp.', value: '−110 °C at 1 bar' },
      { label: 'Atmosphere', value: '90% H₂, 10% He' },
    ],
  },
  io: {
    title: 'Io',
    kind: 'Satellite of Jupiter',
    rows: [
      { label: 'Rotation', value: '1.77 days, synchronous' },
      { label: 'Orbit period', value: '1.77 Earth days' },
      { label: 'Mean temp.', value: 'about −160 °C' },
      { label: 'Composition', value: 'Silicate rock, sulfur surface' },
    ],
  },
  europa: {
    title: 'Europa',
    kind: 'Satellite of Jupiter',
    rows: [
      { label: 'Rotation', value: '3.55 days, synchronous' },
      { label: 'Orbit period', value: '3.55 Earth days' },
      { label: 'Mean temp.', value: 'about −170 °C' },
      { label: 'Composition', value: 'Ice crust over a salt ocean' },
    ],
  },
  ganymede: {
    title: 'Ganymede',
    kind: 'Satellite of Jupiter',
    rows: [
      { label: 'Rotation', value: '7.15 days, synchronous' },
      { label: 'Orbit period', value: '7.15 Earth days' },
      { label: 'Mean temp.', value: 'about −160 °C' },
      { label: 'Composition', value: 'Ice and rock; own magnetic field' },
    ],
  },
  callisto: {
    title: 'Callisto',
    kind: 'Satellite of Jupiter',
    rows: [
      { label: 'Rotation', value: '16.7 days, synchronous' },
      { label: 'Orbit period', value: '16.7 Earth days' },
      { label: 'Mean temp.', value: 'about −140 °C' },
      { label: 'Composition', value: 'Ice and rock, heavily cratered' },
    ],
  },
  saturn: {
    title: 'Saturn',
    kind: 'Gas giant',
    rows: [
      { label: 'Rotation', value: '10.7 hours' },
      { label: 'Day length', value: '10.7 hours' },
      { label: 'Mean temp.', value: '−140 °C at 1 bar' },
      { label: 'Atmosphere', value: '96% H₂, 3% He' },
    ],
  },
  mimas: {
    title: 'Mimas',
    kind: 'Satellite of Saturn',
    rows: [
      { label: 'Rotation', value: '22.6 hours, synchronous' },
      { label: 'Orbit period', value: '0.94 Earth days' },
      { label: 'Mean temp.', value: 'about −210 °C' },
      { label: 'Composition', value: 'Mostly water ice' },
    ],
  },
  enceladus: {
    title: 'Enceladus',
    kind: 'Satellite of Saturn',
    rows: [
      { label: 'Rotation', value: '32.9 hours, synchronous' },
      { label: 'Orbit period', value: '1.37 Earth days' },
      { label: 'Mean temp.', value: 'about −200 °C' },
      { label: 'Composition', value: 'Water ice; south-pole ocean' },
    ],
  },
  tethys: {
    title: 'Tethys',
    kind: 'Satellite of Saturn',
    rows: [
      { label: 'Rotation', value: '1.89 days, synchronous' },
      { label: 'Orbit period', value: '1.89 Earth days' },
      { label: 'Mean temp.', value: 'about −190 °C' },
      { label: 'Composition', value: 'Nearly pure water ice' },
    ],
  },
  dione: {
    title: 'Dione',
    kind: 'Satellite of Saturn',
    rows: [
      { label: 'Rotation', value: '2.74 days, synchronous' },
      { label: 'Orbit period', value: '2.74 Earth days' },
      { label: 'Mean temp.', value: 'about −185 °C' },
      { label: 'Composition', value: 'Water ice and rock' },
    ],
  },
  rhea: {
    title: 'Rhea',
    kind: 'Satellite of Saturn',
    rows: [
      { label: 'Rotation', value: '4.52 days, synchronous' },
      { label: 'Orbit period', value: '4.52 Earth days' },
      { label: 'Mean temp.', value: 'about −200 °C' },
      { label: 'Composition', value: 'Water ice with a rocky core' },
    ],
  },
  titan: {
    title: 'Titan',
    kind: 'Satellite of Saturn',
    rows: [
      { label: 'Rotation', value: '15.9 days, synchronous' },
      { label: 'Solar day', value: '15.9 Earth days' },
      { label: 'Mean temp.', value: '−179 °C' },
      { label: 'Atmosphere', value: '95% N₂, ~5% CH₄' },
    ],
  },
  iapetus: {
    title: 'Iapetus',
    kind: 'Satellite of Saturn',
    rows: [
      { label: 'Rotation', value: '79.3 days, synchronous' },
      { label: 'Orbit period', value: '79.3 Earth days' },
      { label: 'Mean temp.', value: 'about −140 °C' },
      { label: 'Surface', value: 'Two-tone ice and dark dust' },
    ],
  },
  uranus: {
    title: 'Uranus',
    kind: 'Ice giant',
    rows: [
      { label: 'Rotation', value: '17.2 hours, retrograde' },
      { label: 'Day length', value: '17.2 hours' },
      { label: 'Mean temp.', value: '−195 °C at 1 bar' },
      { label: 'Atmosphere', value: '83% H₂, 15% He, 2% CH₄' },
    ],
  },
  miranda: {
    title: 'Miranda',
    kind: 'Satellite of Uranus',
    rows: [
      { label: 'Rotation', value: '1.41 days, synchronous' },
      { label: 'Orbit period', value: '1.41 Earth days' },
      { label: 'Mean temp.', value: 'about −210 °C' },
      { label: 'Composition', value: 'Ice and rock, extreme cliffs' },
    ],
  },
  ariel: {
    title: 'Ariel',
    kind: 'Satellite of Uranus',
    rows: [
      { label: 'Rotation', value: '2.52 days, synchronous' },
      { label: 'Orbit period', value: '2.52 Earth days' },
      { label: 'Mean temp.', value: 'about −210 °C' },
      { label: 'Composition', value: 'Water ice and rock' },
    ],
  },
  umbriel: {
    title: 'Umbriel',
    kind: 'Satellite of Uranus',
    rows: [
      { label: 'Rotation', value: '4.14 days, synchronous' },
      { label: 'Orbit period', value: '4.14 Earth days' },
      { label: 'Mean temp.', value: 'about −200 °C' },
      { label: 'Composition', value: 'Dark ice and rock' },
    ],
  },
  titania: {
    title: 'Titania',
    kind: 'Satellite of Uranus',
    rows: [
      { label: 'Rotation', value: '8.71 days, synchronous' },
      { label: 'Orbit period', value: '8.71 Earth days' },
      { label: 'Mean temp.', value: 'about −200 °C' },
      { label: 'Composition', value: 'Water ice and rock' },
    ],
  },
  oberon: {
    title: 'Oberon',
    kind: 'Satellite of Uranus',
    rows: [
      { label: 'Rotation', value: '13.5 days, synchronous' },
      { label: 'Orbit period', value: '13.5 Earth days' },
      { label: 'Mean temp.', value: 'about −200 °C' },
      { label: 'Composition', value: 'Water ice and rock' },
    ],
  },
  neptune: {
    title: 'Neptune',
    kind: 'Ice giant',
    rows: [
      { label: 'Rotation', value: '16.1 hours' },
      { label: 'Day length', value: '16.1 hours' },
      { label: 'Mean temp.', value: '−200 °C at 1 bar' },
      { label: 'Atmosphere', value: '80% H₂, 19% He, 1.5% CH₄' },
    ],
  },
  triton: {
    title: 'Triton',
    kind: 'Satellite of Neptune',
    rows: [
      { label: 'Rotation', value: '5.88 days, retrograde' },
      { label: 'Orbit period', value: '5.88 Earth days' },
      { label: 'Mean temp.', value: '−235 °C' },
      { label: 'Surface', value: 'Nitrogen ice; geysers' },
    ],
  },
}

export function getBodyFacts(focus: FocusId): BodyFacts {
  return BODY_FACTS[focus]
}
