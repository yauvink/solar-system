import { Vector3 } from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import type { Vec3 } from '../astronomy/positions.ts'

/** Opening shot captured from orbit controls, stored relative to Earth. */
const CAPTURED = {
  position: [93.297, 0.315, 41.644],
  target: [92.185, 0.002, 41.23],
} as const

const START_OFFSET: Vec3 = [
  CAPTURED.position[0] - CAPTURED.target[0],
  CAPTURED.position[1] - CAPTURED.target[1],
  CAPTURED.position[2] - CAPTURED.target[2],
]

export function writeStartPose(
  store: EphemerisStore,
  cameraOut: Vector3,
  targetOut: Vector3,
): void {
  const earth = store.positions.earth
  targetOut.set(earth[0], earth[1], earth[2])
  cameraOut.set(
    earth[0] + START_OFFSET[0],
    earth[1] + START_OFFSET[1],
    earth[2] + START_OFFSET[2],
  )
}
