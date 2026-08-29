import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Group, type Mesh } from 'three'
import { MOON_BY_ID, type MoonId } from '../astronomy/bodies.ts'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { BodyLabel } from './BodyLabel.tsx'
import { createSatelliteTexture } from './createBodyTexture.ts'

type SatelliteProps = {
  id: MoonId
  store: EphemerisStore
  radius: number
}

const yUp = new Vector3(0, 1, 0)
const northDir = new Vector3()
const orient = new Quaternion()

function moonLabelRange(store: EphemerisStore, id: MoonId, radius: number): number {
  const parent = store.positions[MOON_BY_ID[id].parent]
  const moon = store.positions[id]
  const sep = Math.hypot(moon[0] - parent[0], moon[1] - parent[1], moon[2] - parent[2])
  return Math.max(sep * 3.6, radius * 22, 3.2)
}

export function Satellite({ id, store, radius }: SatelliteProps) {
  const groupRef = useRef<Group>(null)
  const spinRef = useRef<Mesh>(null)
  const texture = useMemo(() => createSatelliteTexture(id), [id])
  const segments = radius < 0.04 ? 16 : 32

  useLayoutEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame(() => {
    const position = store.positions[id]
    const axis = store.axes[id]
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2])
      northDir.set(axis.north[0], axis.north[1], axis.north[2]).normalize()
      groupRef.current.quaternion.copy(orient.setFromUnitVectors(yUp, northDir))
    }
    if (spinRef.current) {
      spinRef.current.rotation.y = (axis.spinDeg * Math.PI) / 180
    }
  })

  return (
    <>
      <group ref={groupRef} scale={radius}>
        <mesh ref={spinRef}>
          <sphereGeometry args={[1, segments, segments]} />
          <meshStandardMaterial map={texture} roughness={1} metalness={0} />
        </mesh>
      </group>
      <BodyLabel
        getPosition={() => store.positions[id]}
        radius={radius}
        showWithin={moonLabelRange(store, id, radius)}
      >
        {MOON_BY_ID[id].label}
      </BodyLabel>
    </>
  )
}
