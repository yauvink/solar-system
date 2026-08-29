import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { length } from '../astronomy/positions.ts'
import { ScreenBillboardText } from './BodyLabel.tsx'
import { createMilkyWayTexture } from './createBodyTexture.ts'

type MilkyWayProps = {
  store: EphemerisStore
  radius: number
  showAxes: boolean
  showDegrees: boolean
}

const xAxis = new Vector3()
const yAxis = new Vector3()
const zAxis = new Vector3()
const basis = new Matrix4()
const yUp = new Vector3(0, 1, 0)
const motionDir = new Vector3()
const coneOrient = new Quaternion()

export function MilkyWay({
  store,
  radius,
  showAxes,
  showDegrees,
}: MilkyWayProps) {
  const skyRef = useRef<Group>(null)
  const haloRef = useRef<Mesh>(null)
  const coneRef = useRef<Mesh>(null)
  const labelRef = useRef<Group>(null)
  const texture = useMemo(() => createMilkyWayTexture(), [])
  const coreOffset = radius * 0.96
  const coreSize = Math.max(8, radius * 0.004)

  const arrowGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    return geo
  }, [])

  const arrowMaterial = useMemo(
    () => new LineBasicMaterial({ color: '#f0c36a', transparent: true, opacity: 0.9 }),
    [],
  )
  const arrow = useMemo(() => {
    const object = new Line(arrowGeometry, arrowMaterial)
    object.frustumCulled = false
    return object
  }, [arrowGeometry, arrowMaterial])

  useLayoutEffect(() => {
    return () => {
      texture.dispose()
      arrowGeometry.dispose()
      arrowMaterial.dispose()
    }
  }, [arrowGeometry, arrowMaterial, texture])

  useFrame((state) => {
    const galactic = store.galactic
    xAxis.set(galactic.center[0], galactic.center[1], galactic.center[2])
    yAxis.set(galactic.north[0], galactic.north[1], galactic.north[2])
    zAxis.set(-galactic.motion[0], -galactic.motion[1], -galactic.motion[2])
    if (skyRef.current) {
      basis.makeBasis(xAxis, yAxis, zAxis)
      skyRef.current.quaternion.setFromRotationMatrix(basis)
    }
    if (haloRef.current) {
      const halo = haloRef.current.material
      if (halo instanceof MeshBasicMaterial) {
        halo.opacity = 0.16 + Math.sin(state.clock.elapsedTime * 0.28) * 0.05
      }
    }

    if (!showAxes) return

    motionDir.set(galactic.motion[0], galactic.motion[1], galactic.motion[2])
    const reach = Math.max(length(store.positions.neptune) * 1.18, radius * 0.35)
    const attr = arrowGeometry.getAttribute('position') as BufferAttribute
    const array = attr.array as Float32Array
    array[0] = 0
    array[1] = 0
    array[2] = 0
    array[3] = motionDir.x * reach
    array[4] = motionDir.y * reach
    array[5] = motionDir.z * reach
    attr.needsUpdate = true
    arrowGeometry.computeBoundingSphere()

    if (coneRef.current) {
      coneRef.current.position.copy(motionDir).multiplyScalar(reach)
      coneRef.current.quaternion.copy(coneOrient.setFromUnitVectors(yUp, motionDir))
      const coneScale = Math.max(reach * 0.025, 0.4)
      coneRef.current.scale.set(coneScale, coneScale * 1.6, coneScale)
    }
    if (labelRef.current) {
      labelRef.current.position.copy(motionDir).multiplyScalar(reach * 0.72)
    }
  })

  const tilt = store.galactic.motionTiltDeg.toFixed(1)

  return (
    <>
      <group ref={skyRef}>
        <mesh scale={[-1, 1, 1]}>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshBasicMaterial
            map={texture}
            side={BackSide}
            transparent
            depthWrite={false}
            opacity={0.7}
          />
        </mesh>
        <group position={[coreOffset, 0, 0]} scale={coreSize}>
          <mesh>
            <sphereGeometry args={[1.6, 32, 32]} />
            <meshBasicMaterial
              color="#4a1230"
              transparent
              opacity={0.45}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh ref={haloRef}>
            <sphereGeometry args={[3.6, 32, 32]} />
            <meshBasicMaterial
              color="#2a0c28"
              transparent
              opacity={0.16}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[6.4, 32, 32]} />
            <meshBasicMaterial
              color="#140818"
              transparent
              opacity={0.08}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
      </group>
      {showAxes ? (
        <>
          <primitive object={arrow} />
          <mesh ref={coneRef}>
            <coneGeometry args={[0.45, 1.2, 12]} />
            <meshBasicMaterial color="#f0c36a" />
          </mesh>
          {showDegrees ? (
            <group ref={labelRef}>
              <ScreenBillboardText color="#f0c36a">
                {`Milky Way motion · ${tilt}°`}
              </ScreenBillboardText>
            </group>
          ) : null}
        </>
      ) : null}
    </>
  )
}
