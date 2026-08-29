import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Group, type Mesh } from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { BodyLabel } from './BodyLabel.tsx'
import { createSunTexture } from './createBodyTexture.ts'

type SunProps = {
  store: EphemerisStore
  radius: number
}

const yUp = new Vector3(0, 1, 0)
const northDir = new Vector3()
const orient = new Quaternion()

export function Sun({ store, radius }: SunProps) {
  const groupRef = useRef<Group>(null)
  const spinRef = useRef<Mesh>(null)
  const texture = useMemo(() => createSunTexture(), [])

  useLayoutEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame(() => {
    const position = store.positions.sun
    const axis = store.axes.sun
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
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial map={texture} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.08, 32, 32]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.18} />
        </mesh>
        <pointLight color="#fff6e0" intensity={4.5} decay={0} castShadow={false} />
      </group>
      <BodyLabel getPosition={() => store.positions.sun} radius={radius}>
        Sun
      </BodyLabel>
    </>
  )
}
