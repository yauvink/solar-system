import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
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

const DAY_URL = `${import.meta.env.BASE_URL}textures/earth/day.png`
const NIGHT_URL = `${import.meta.env.BASE_URL}textures/earth/night.png`
const CLOUDS_URL = `${import.meta.env.BASE_URL}textures/earth/clouds.jpg`

function prepareMap(texture: Texture, colorSpace = true): Texture {
  texture.wrapS = RepeatWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.anisotropy = 8
  if (colorSpace) texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/** Keep city lights, drop the dark land/ocean fill so additive blending stays clean. */
function crushNightLights(texture: Texture): Texture {
  const image = texture.image as CanvasImageSource & { width: number; height: number }
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return texture
  ctx.drawImage(image, 0, 0)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const luma = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11
    if (luma < 36) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
    }
  }
  ctx.putImageData(pixels, 0, 0)
  texture.image = canvas
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
          night: crushNightLights(prepareMap(night)),
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
          <mesh>
            <sphereGeometry args={[1, 64, 64]} />
            {maps ? (
              <meshStandardMaterial
                map={maps.day}
                emissiveMap={maps.day}
                emissive="#ffffff"
                emissiveIntensity={0.42}
                roughness={0.55}
                metalness={0.02}
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
          {maps ? (
            <mesh>
              <sphereGeometry args={[1.004, 64, 64]} />
              <meshBasicMaterial
                map={maps.night}
                blending={AdditiveBlending}
                transparent
                depthWrite={false}
              />
            </mesh>
          ) : null}
          {userGeo ? <YouAreHere lat={userGeo.lat} lon={userGeo.lon} /> : null}
          {maps ? (
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
