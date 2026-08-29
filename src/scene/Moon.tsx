import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Group, type Mesh } from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { BodyLabel } from './BodyLabel.tsx'
import { createMoonTexture } from './createBodyTexture.ts'

type MoonProps = {
  store: EphemerisStore
  radius: number
}

const yUp = new Vector3(0, 1, 0)
const northDir = new Vector3()
const orient = new Quaternion()

export function Moon({ store, radius }: MoonProps) {
  const groupRef = useRef<Group>(null)
  const spinRef = useRef<Mesh>(null)
  const texture = useMemo(() => createMoonTexture(), [])

  useLayoutEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame(() => {
    const position = store.positions.moon
    const axis = store.axes.moon
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
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial map={texture} roughness={1} metalness={0} />
        </mesh>
      </group>
      <BodyLabel getPosition={() => store.positions.moon} radius={radius}>
        Moon
      </BodyLabel>
    </>
  )
}
