import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  LinearFilter,
  Line,
  LineBasicMaterial,
  Matrix4,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Sprite,
  type Texture,
} from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { length } from '../astronomy/positions.ts'
import { ScreenBillboardText } from './BodyLabel.tsx'

type MilkyWayProps = {
  store: EphemerisStore
  radius: number
  showAxes: boolean
  showDegrees: boolean
  starBrightness: number
  milkyWayBrightness: number
}

const xAxis = new Vector3()
const yAxis = new Vector3()
const zAxis = new Vector3()
const basis = new Matrix4()
const motionDir = new Vector3()

const STARMAP_URL = `${import.meta.env.BASE_URL}textures/milky-way/hiptyc_2020_8k_gal_converted.webp`
const MILKYWAY_URL = `${import.meta.env.BASE_URL}textures/milky-way/milkyway_2020_8k_gal_converted.webp`
const BLACK_HOLE_URL = `${import.meta.env.BASE_URL}textures/milky-way/black-hole.png`
const BLACK_HOLE_ASPECT = 558 / 274

function loadSkyMap(url: string): Texture {
  const map = new TextureLoader().load(url)
  map.colorSpace = SRGBColorSpace
  map.wrapS = RepeatWrapping
  // NASA galactic map is centered on the core; our sphere seam is +X after the flip.
  map.offset.x = 0.5
  map.generateMipmaps = false
  map.minFilter = LinearFilter
  map.magFilter = LinearFilter
  return map
}

export function MilkyWay({
  store,
  radius,
  showAxes,
  showDegrees,
  starBrightness,
  milkyWayBrightness,
}: MilkyWayProps) {
  const skyRef = useRef<Group>(null)
  const tipRef = useRef<Sprite>(null)
  const labelRef = useRef<Group>(null)
  const starMap = useMemo(() => loadSkyMap(STARMAP_URL), [])
  const dustMap = useMemo(() => loadSkyMap(MILKYWAY_URL), [])
  const starGain = starBrightness / 100
  const dustGain = milkyWayBrightness / 100
  const holeMap = useMemo(() => {
    const map = new TextureLoader().load(BLACK_HOLE_URL)
    map.colorSpace = SRGBColorSpace
    return map
  }, [])

  const arrowGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    return geo
  }, [])

  const arrowMaterial = useMemo(
    () => new LineBasicMaterial({ color: '#f0c36a', transparent: true, opacity: 0.32 }),
    [],
  )
  const arrow = useMemo(() => {
    const object = new Line(arrowGeometry, arrowMaterial)
    object.frustumCulled = false
    return object
  }, [arrowGeometry, arrowMaterial])

  useLayoutEffect(() => {
    return () => {
      starMap.dispose()
      dustMap.dispose()
      holeMap.dispose()
      arrowGeometry.dispose()
      arrowMaterial.dispose()
    }
  }, [arrowGeometry, arrowMaterial, dustMap, holeMap, starMap])

  useFrame(() => {
    const galactic = store.galactic
    xAxis.set(galactic.center[0], galactic.center[1], galactic.center[2])
    yAxis.set(galactic.north[0], galactic.north[1], galactic.north[2])
    zAxis.set(-galactic.motion[0], -galactic.motion[1], -galactic.motion[2])
    if (skyRef.current) {
      basis.makeBasis(xAxis, yAxis, zAxis)
      skyRef.current.quaternion.setFromRotationMatrix(basis)
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

    if (tipRef.current) {
      tipRef.current.position.copy(motionDir).multiplyScalar(reach)
      const tipScale = Math.max(reach * 0.052, 0.95)
      tipRef.current.scale.set(tipScale * BLACK_HOLE_ASPECT, tipScale, 1)
    }
    if (labelRef.current) {
      labelRef.current.position.copy(motionDir).multiplyScalar(reach * 0.72)
    }
  })

  const tilt = store.galactic.motionTiltDeg.toFixed(1)

  return (
    <>
      <group ref={skyRef}>
        <mesh scale={[-1, 1, 1]} renderOrder={-2}>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshBasicMaterial
            map={dustMap}
            color={[dustGain, dustGain, dustGain]}
            side={BackSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh scale={[-1, 1, 1]} renderOrder={-1}>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshBasicMaterial
            map={starMap}
            color={[starGain, starGain, starGain]}
            side={BackSide}
            depthWrite={false}
            toneMapped={false}
            transparent
            blending={AdditiveBlending}
          />
        </mesh>
      </group>
      {showAxes ? (
        <>
          <primitive object={arrow} />
          <sprite ref={tipRef} frustumCulled={false}>
            <spriteMaterial
              map={holeMap}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
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
