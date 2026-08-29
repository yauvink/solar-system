import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
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
  type WebGLProgramParametersWithUniforms,
} from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { length } from '../astronomy/positions.ts'
import { ScreenBillboardText } from './BodyLabel.tsx'

type MilkyWayProps = {
  store: EphemerisStore
  radius: number
  showAxes: boolean
  showDegrees: boolean
  brightness: number
}

const xAxis = new Vector3()
const yAxis = new Vector3()
const zAxis = new Vector3()
const basis = new Matrix4()
const motionDir = new Vector3()

const STARMAP_URL = `${import.meta.env.BASE_URL}textures/milky-way/starmap.webp`
const BLACK_HOLE_URL = `${import.meta.env.BASE_URL}textures/milky-way/black-hole.png`
const BLACK_HOLE_ASPECT = 558 / 274

export function MilkyWay({
  store,
  radius,
  showAxes,
  showDegrees,
  brightness,
}: MilkyWayProps) {
  const skyRef = useRef<Group>(null)
  const tipRef = useRef<Sprite>(null)
  const labelRef = useRef<Group>(null)
  const texture = useMemo(() => {
    const map = new TextureLoader().load(STARMAP_URL)
    map.colorSpace = SRGBColorSpace
    map.wrapS = RepeatWrapping
    // NASA galactic map is centered on the core; our sphere seam is +X after the flip.
    map.offset.x = 0.5
    map.generateMipmaps = false
    map.minFilter = LinearFilter
    map.magFilter = LinearFilter
    return map
  }, [])
  const skyUniforms = useMemo(() => ({ skyGain: { value: 1 } }), [])
  skyUniforms.skyGain.value = brightness / 100
  const onBeforeCompile = useMemo(() => {
    return (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.skyGain = skyUniforms.skyGain
      shader.fragmentShader = `uniform float skyGain;\n${shader.fragmentShader}`.replace(
        'vec3 outgoingLight = reflectedLight.indirectDiffuse;',
        `vec3 outgoingLight = reflectedLight.indirectDiffuse;
	float lum = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
	float star = smoothstep(0.28, 0.78, lum);
	float crush = mix(1.35, 1.0, skyGain);
	vec3 dimmed = pow(max(outgoingLight, vec3(0.0)), vec3(crush)) * skyGain;
	float pop = (1.0 - skyGain) * smoothstep(0.0, 0.08, skyGain);
	outgoingLight = mix(dimmed, outgoingLight * mix(skyGain, 1.0, star), pop);`,
      )
    }
  }, [skyUniforms])
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
      texture.dispose()
      holeMap.dispose()
      arrowGeometry.dispose()
      arrowMaterial.dispose()
    }
  }, [arrowGeometry, arrowMaterial, holeMap, texture])

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
        <mesh scale={[-1, 1, 1]}>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshBasicMaterial
            map={texture}
            side={BackSide}
            depthWrite={false}
            toneMapped={false}
            onBeforeCompile={onBeforeCompile}
            customProgramCacheKey={() => 'milky-way-sky-v2'}
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
