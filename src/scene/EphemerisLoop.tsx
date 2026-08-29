import { useFrame } from '@react-three/fiber'
import { stepEphemeris, type EphemerisStore } from '../astronomy/ephemerisStore.ts'

type EphemerisLoopProps = {
  store: EphemerisStore
}

export function EphemerisLoop({ store }: EphemerisLoopProps) {
  useFrame((_, delta) => {
    stepEphemeris(store, Math.min(delta, 0.1))
  })
  return null
}
