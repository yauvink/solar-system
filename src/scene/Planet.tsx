import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  ClampToEdgeWrapping,
  DoubleSide,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { BODY_BY_ID, type PlanetId } from '../astronomy/bodies.ts'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { BodyLabel } from './BodyLabel.tsx'
import { createPlanetTexture } from './createBodyTexture.ts'

const MARS_MAP_URL = `${import.meta.env.BASE_URL}textures/mars/color.jpg`

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
  const fallback = useMemo(() => createPlanetTexture(id), [id])
  const nasaMars = useMemo(() => {
    if (id !== 'mars') return null
    const map = new TextureLoader().load(MARS_MAP_URL)
    map.wrapS = RepeatWrapping
    map.wrapT = ClampToEdgeWrapping
    map.colorSpace = SRGBColorSpace
    map.anisotropy = 8
    return map
  }, [id])
  const texture = nasaMars ?? fallback
  const segments = id === 'mars' ? 64 : 48

  useLayoutEffect(() => {
    return () => {
      fallback.dispose()
      nasaMars?.dispose()
    }
  }, [fallback, nasaMars])

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
          <meshStandardMaterial
            map={texture}
            roughness={id === 'mars' ? 0.88 : 0.62}
            metalness={id === 'mars' ? 0 : 0.02}
            emissiveMap={nasaMars ?? undefined}
            emissive={nasaMars ? '#ffffff' : '#000000'}
            emissiveIntensity={nasaMars ? 0.18 : 0}
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
