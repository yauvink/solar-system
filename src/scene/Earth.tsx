import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  Matrix4,
  Quaternion,
  RepeatWrapping,
  NoColorSpace,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type Texture,
} from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { BodyLabel, ScreenBillboardText } from './BodyLabel.tsx'
import { createEarthTexture } from './createBodyTexture.ts'

export type GeoLocation = {
  lat: number
  lon: number
}

type EarthProps = {
  store: EphemerisStore
  radius: number
  userGeo?: GeoLocation | null
}

type EarthMaps = {
  day: Texture
  night: Texture
  clouds: Texture
}

const yUp = new Vector3(0, 1, 0)
const northDir = new Vector3()
const orient = new Quaternion()
const pinUp = new Quaternion()
const pinDir = new Vector3()

/** Equirectangular NASA maps on Three.js SphereGeometry: lon 0° at +X, lat 90° at +Y. */
function latLonOnSphere(lat: number, lon: number, radius: number): Vector3 {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180
  const phi = lonRad + Math.PI
  const theta = Math.PI / 2 - latRad
  const ring = Math.sin(theta)
  return new Vector3(-Math.cos(phi) * ring * radius, Math.cos(theta) * radius, Math.sin(phi) * ring * radius)
}

const DAY_URL = `${import.meta.env.BASE_URL}textures/earth/bluemarble-2048.webp`
const NIGHT_URL = `${import.meta.env.BASE_URL}textures/earth/earthatnight-2048.webp`
const CLOUDS_URL = `${import.meta.env.BASE_URL}textures/earth/clouds.jpg`

const SHOW_CLOUDS_LAYER = true

function prepareMap(texture: Texture, colorSpace = true): Texture {
  texture.wrapS = RepeatWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = 8
  texture.colorSpace = colorSpace ? SRGBColorSpace : NoColorSpace
  texture.needsUpdate = true
  return texture
}

function useNasaEarthMaps(): EarthMaps | null {
  const [maps, setMaps] = useState<EarthMaps | null>(null)

  useEffect(() => {
    const loader = new TextureLoader()
    let cancelled = false
    Promise.all([
      loader.loadAsync(DAY_URL),
      loader.loadAsync(NIGHT_URL),
      loader.loadAsync(CLOUDS_URL),
    ])
      .then(([day, night, clouds]) => {
        if (cancelled) {
          day.dispose()
          night.dispose()
          clouds.dispose()
          return
        }
        setMaps({
          // Custom terminator shader outputs display-referred color (toneMapped: false).
          day: prepareMap(day, false),
          night: prepareMap(night, false),
          clouds: prepareMap(clouds, false),
        })
      })
      .catch(() => {
        // Procedural fallback stays on screen.
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      maps?.day.dispose()
      maps?.night.dispose()
      maps?.clouds.dispose()
    }
  }, [maps])

  return maps
}

const sunDirWorld = new Vector3()
const worldInverse = new Matrix4()

const DAY_NIGHT_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vObjectNormal;

void main() {
  vUv = uv;
  vObjectNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const DAY_NIGHT_FRAG = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDirection;
varying vec2 vUv;
varying vec3 vObjectNormal;

void main() {
  vec3 day = texture2D(dayMap, vUv).rgb * 1.45;
  vec3 night = texture2D(nightMap, vUv).rgb * 3.2 + vec3(0.018, 0.024, 0.05);
  float light = dot(normalize(vObjectNormal), normalize(sunDirection));
  float dayFactor = smoothstep(-0.05, 0.1, light);
  vec3 color = mix(night, day, dayFactor);
  float twilight = exp(-light * light * 22.0);
  color += vec3(0.26, 0.11, 0.04) * twilight * 0.2;
  gl_FragColor = vec4(color, 1.0);
}
`

function EarthDayNightMaterial({
  day,
  night,
  store,
  meshRef,
}: {
  day: Texture
  night: Texture
  store: EphemerisStore
  meshRef: RefObject<Mesh | null>
}) {
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        dayMap: { value: day },
        nightMap: { value: night },
        sunDirection: { value: new Vector3(1, 0, 0) },
      },
      vertexShader: DAY_NIGHT_VERT,
      fragmentShader: DAY_NIGHT_FRAG,
      toneMapped: false,
    })
  }, [day, night])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const earth = store.positions.earth
    sunDirWorld.set(-earth[0], -earth[1], -earth[2]).normalize()
    mesh.updateWorldMatrix(true, false)
    worldInverse.copy(mesh.matrixWorld).invert()
    material.uniforms.sunDirection.value
      .copy(sunDirWorld)
      .transformDirection(worldInverse)
  })

  useLayoutEffect(() => () => material.dispose(), [material])

  return <primitive object={material} attach="material" />
}

function YouAreHere({ lat, lon }: GeoLocation) {
  const { position, rotation } = useMemo(() => {
    const position = latLonOnSphere(lat, lon, 1.04)
    pinDir.copy(position).normalize()
    return {
      position,
      rotation: pinUp.setFromUnitVectors(yUp, pinDir).clone(),
    }
  }, [lat, lon])

  return (
    <group position={position} quaternion={rotation}>
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, 0.055, 8]} />
        <meshBasicMaterial color="#f0c36a" />
      </mesh>
      <mesh position={[0, 0.048, 0]}>
        <sphereGeometry args={[0.028, 14, 14]} />
        <meshBasicMaterial color="#ff5a4a" />
      </mesh>
      <mesh position={[0, 0.048, 0]}>
        <sphereGeometry args={[0.052, 12, 12]} />
        <meshBasicMaterial
          color="#ff8a6a"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <group position={[0, 0.1, 0]}>
        <ScreenBillboardText color="#f0c36a">You</ScreenBillboardText>
      </group>
    </group>
  )
}

export function Earth({ store, radius, userGeo }: EarthProps) {
  const groupRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const fallback = useMemo(() => createEarthTexture(), [])
  const maps = useNasaEarthMaps()

  useLayoutEffect(() => {
    return () => {
      fallback.dispose()
    }
  }, [fallback])

  useFrame(() => {
    const position = store.positions.earth
    const axis = store.axes.earth
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
        <group ref={spinRef}>
          <mesh ref={meshRef}>
            <sphereGeometry args={[1, 96, 96]} />
            {maps ? (
              <EarthDayNightMaterial
                day={maps.day}
                night={maps.night}
                store={store}
                meshRef={meshRef}
              />
            ) : (
              <meshStandardMaterial
                map={fallback}
                roughness={0.62}
                metalness={0.02}
                emissiveMap={fallback}
                emissive="#ffffff"
                emissiveIntensity={0.18}
              />
            )}
          </mesh>
          {userGeo ? <YouAreHere lat={userGeo.lat} lon={userGeo.lon} /> : null}
          {SHOW_CLOUDS_LAYER && maps ? (
            <mesh scale={1.018}>
              <sphereGeometry args={[1, 64, 64]} />
              <meshStandardMaterial
                color="#f2f6ff"
                alphaMap={maps.clouds}
                transparent
                opacity={0.62}
                depthWrite={false}
                roughness={1}
                metalness={0}
                emissive="#dce6f5"
                emissiveIntensity={0.1}
              />
            </mesh>
          ) : null}
        </group>
      </group>
      <BodyLabel getPosition={() => store.positions.earth} radius={radius}>
        Earth
      </BodyLabel>
    </>
  )
}
