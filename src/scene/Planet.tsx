import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Quaternion, Vector3, type Group, type Mesh } from 'three'
import { BODY_BY_ID, type PlanetId } from '../astronomy/bodies.ts'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { BodyLabel } from './BodyLabel.tsx'
import { createPlanetTexture } from './createBodyTexture.ts'

type PlanetProps = {
  id: PlanetId
  store: EphemerisStore
  radius: number
}

const yUp = new Vector3(0, 1, 0)
const northDir = new Vector3()
const orient = new Quaternion()

export function Planet({ id, store, radius }: PlanetProps) {
  const groupRef = useRef<Group>(null)
  const spinRef = useRef<Mesh>(null)
  const texture = useMemo(() => createPlanetTexture(id), [id])

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
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.62}
            metalness={0.02}
            emissiveMap={id === 'earth' ? texture : undefined}
            emissive={id === 'earth' ? '#ffffff' : '#000000'}
            emissiveIntensity={id === 'earth' ? 0.18 : 0}
          />
        </mesh>
        {id === 'saturn' ? (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.35, 2.25, 64]} />
            <meshStandardMaterial
              color="#d8c48a"
              transparent
              opacity={0.72}
              side={DoubleSide}
              roughness={0.85}
              metalness={0.05}
            />
          </mesh>
        ) : null}
      </group>
      <BodyLabel getPosition={() => store.positions[id]} radius={radius}>
        {BODY_BY_ID[id].label}
      </BodyLabel>
    </>
  )
}
