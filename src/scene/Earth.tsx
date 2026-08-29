import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  Matrix4,
  MeshStandardMaterial,
  NoColorSpace,
  Quaternion,
  RepeatWrapping,
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
          day: prepareMap(day),
          night: prepareMap(night),
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
    const mat = new MeshStandardMaterial({
      map: day,
      roughness: 0.88,
      metalness: 0,
      emissiveMap: night,
      emissive: '#ffffff',
      emissiveIntensity: 1.65,
    })
    mat.customProgramCacheKey = () => 'earth-sun-terminator-v2'
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.sunDirection = { value: new Vector3(1, 0, 0) }
      mat.userData.sunDirection = shader.uniforms.sunDirection
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          varying vec3 vObjectNormal;
          `,
        )
        .replace(
          '#include <beginnormal_vertex>',
          /* glsl */ `
          #include <beginnormal_vertex>
          vObjectNormal = objectNormal;
          `,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          uniform vec3 sunDirection;
          varying vec3 vObjectNormal;
          `,
        )
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `
          float dayFactor = smoothstep(-0.04, 0.14, dot(normalize(vObjectNormal), normalize(sunDirection)));
          diffuseColor.rgb *= mix(0.09, 1.0, dayFactor);
          #ifdef USE_EMISSIVEMAP
            vec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv);
            float cityLuma = dot(emissiveColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 nightFill = emissiveColor.rgb * 0.42;
            vec3 cities = emissiveColor.rgb * smoothstep(0.035, 0.16, cityLuma);
            totalEmissiveRadiance *= (nightFill + cities) * (1.0 - dayFactor);
          #endif
          `,
        )
    }
    return mat
  }, [day, night])

  useFrame(() => {
    const mesh = meshRef.current
    const sunUniform = material.userData.sunDirection as { value: Vector3 } | undefined
    if (!mesh || !sunUniform) return
    const earth = store.positions.earth
    sunDirWorld.set(-earth[0], -earth[1], -earth[2]).normalize()
    mesh.updateWorldMatrix(true, false)
    worldInverse.copy(mesh.matrixWorld).invert()
    sunUniform.value.copy(sunDirWorld).transformDirection(worldInverse)
  })

  useLayoutEffect(() => () => material.dispose(), [material])

  return <primitive object={material} attach="material" />
}

function EarthCloudMaterial({
  clouds,
  store,
  meshRef,
}: {
  clouds: Texture
  store: EphemerisStore
  meshRef: RefObject<Mesh | null>
}) {
  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: '#f2f6ff',
      alphaMap: clouds,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    })
    mat.customProgramCacheKey = () => 'earth-clouds-sun-v2'
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.sunDirection = { value: new Vector3(1, 0, 0) }
      mat.userData.sunDirection = shader.uniforms.sunDirection
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          varying vec3 vObjectNormal;
          `,
        )
        .replace(
          '#include <beginnormal_vertex>',
          /* glsl */ `
          #include <beginnormal_vertex>
          vObjectNormal = objectNormal;
          `,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          uniform vec3 sunDirection;
          varying vec3 vObjectNormal;
          `,
        )
        .replace(
          '#include <alphamap_fragment>',
          /* glsl */ `
          #include <alphamap_fragment>
          float dayFactor = smoothstep(-0.02, 0.16, dot(normalize(vObjectNormal), normalize(sunDirection)));
          diffuseColor.rgb *= mix(0.08, 1.0, dayFactor);
          diffuseColor.a *= mix(0.22, 1.0, dayFactor);
          `,
        )
    }
    return mat
  }, [clouds])

  useFrame((_, delta) => {
    clouds.offset.x = (clouds.offset.x + delta * 0.0019) % 1
    const mesh = meshRef.current
    const sunUniform = material.userData.sunDirection as { value: Vector3 } | undefined
    if (!mesh || !sunUniform) return
    const earth = store.positions.earth
    sunDirWorld.set(-earth[0], -earth[1], -earth[2]).normalize()
    mesh.updateWorldMatrix(true, false)
    worldInverse.copy(mesh.matrixWorld).invert()
    sunUniform.value.copy(sunDirWorld).transformDirection(worldInverse)
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
  const cloudRef = useRef<Mesh>(null)
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
            <mesh ref={cloudRef} scale={1.018}>
              <sphereGeometry args={[1, 64, 64]} />
              <EarthCloudMaterial clouds={maps.clouds} store={store} meshRef={cloudRef} />
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
