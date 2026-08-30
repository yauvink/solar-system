import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import {
  createPerseidDustKit,
  createPerseidOrbitPath,
  perseidCrossingCenter,
  positionOfSwiftTuttle,
  writePerseidDustScene,
} from '../astronomy/perseids.ts'
import type { Vec3 } from '../astronomy/positions.ts'
import { BodyLabel } from './BodyLabel.tsx'
import { OrbitRing } from './OrbitRing.tsx'

type PerseidStreamProps = {
  store: EphemerisStore
  auInUnits: number
  crossing: boolean
  labelRadius: number
  showOrbit: boolean
}

const TAIL_LENGTH = 20
const tailCamLocal = new Vector3()

function createTailTexture(): CanvasTexture {
  const width = 64
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas is not available')
  }
  const image = ctx.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    const along = v ** 1.05
    for (let x = 0; x < width; x++) {
      const u = (x / (width - 1)) * 2 - 1
      const across = Math.exp(-u * u * 5.2)
      const i = (y * width + x) * 4
      const a = Math.min(1, along * across)
      image.data[i] = 255
      image.data[i + 1] = 246
      image.data[i + 2] = 232
      image.data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.premultiplyAlpha = true
  return texture
}

function faceTailToCamera(mesh: Mesh | null, camera: { position: Vector3 }, parent: Group) {
  if (!mesh) return
  tailCamLocal.copy(camera.position)
  parent.worldToLocal(tailCamLocal)
  mesh.rotation.z = Math.atan2(tailCamLocal.y, tailCamLocal.x) - Math.PI / 2
}

function createSoftSprite(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas is not available')
  }
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255, 244, 226, 0.95)')
  gradient.addColorStop(0.38, 'rgba(255, 196, 140, 0.32)')
  gradient.addColorStop(1, 'rgba(80, 40, 20, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function PerseidStream({ store, auInUnits, crossing, labelRadius, showOrbit }: PerseidStreamProps) {
  const cometRef = useRef<Group>(null)
  const tailRef = useRef<Group>(null)
  const dustPlaneRef = useRef<Mesh>(null)
  const ionPlaneRef = useRef<Mesh>(null)
  const cometPos = useRef<Vec3>(positionOfSwiftTuttle(new Date(store.dateMs), auInUnits))
  const kit = useMemo(() => createPerseidDustKit(), [])
  const orbitPath = useMemo(() => createPerseidOrbitPath(auInUnits), [auInUnits])
  const crossingCenter = useMemo(() => perseidCrossingCenter(auInUnits), [auInUnits])
  const sprite = useMemo(() => createSoftSprite(), [])
  const tailSprite = useMemo(() => createTailTexture(), [])
  const positions = useMemo(() => new Float32Array(kit.u.length * 3), [kit])

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    return geo
  }, [positions])

  const material = useMemo(
    () =>
      new PointsMaterial({
        map: sprite,
        color: new Color('#ffd2a8'),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: AdditiveBlending,
        size: Math.max(0.85, auInUnits * 0.013),
        sizeAttenuation: true,
      }),
    [auInUnits, sprite],
  )

  const points = useMemo(() => {
    const object = new Points(geometry, material)
    object.frustumCulled = false
    return object
  }, [geometry, material])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
      sprite.dispose()
      tailSprite.dispose()
    }
  }, [geometry, material, sprite, tailSprite])

  useFrame((state) => {
    writePerseidDustScene(positions, kit, store.dateMs, auInUnits)
    const attr = geometry.getAttribute('position') as BufferAttribute
    attr.needsUpdate = true
    geometry.computeBoundingSphere()

    const pulse = crossing ? 0.26 + Math.sin(state.clock.elapsedTime * 4.2) * 0.05 : 0.15
    material.opacity = pulse
    material.color.set(crossing ? '#ffe8c8' : '#ffd2a8')

    const pos = positionOfSwiftTuttle(new Date(store.dateMs), auInUnits)
    cometPos.current = pos
    const comet = cometRef.current
    if (!comet) return
    comet.position.set(pos[0], pos[1], pos[2])
    comet.lookAt(0, 0, 0)
    const dist = state.camera.position.distanceTo(comet.position)
    const size = Math.max(auInUnits * 0.014, dist * 0.0048)
    comet.scale.setScalar(size)
    const tail = tailRef.current
    if (tail) {
      const worldLen = Math.min(Math.max(dist * 0.7, auInUnits * 1.6), auInUnits * 6)
      tail.scale.setScalar(worldLen / (size * TAIL_LENGTH))
      faceTailToCamera(dustPlaneRef.current, state.camera, comet)
      faceTailToCamera(ionPlaneRef.current, state.camera, comet)
    }
  })

  const cometLabelRadius = Math.max(auInUnits * 0.02, 0.18)

  return (
    <>
      {showOrbit ? <OrbitRing points={orbitPath} color="#fff1dc" opacity={0.2} /> : null}
      <primitive object={points} />
      <group ref={cometRef}>
        <mesh>
          <sphereGeometry args={[1, 18, 18]} />
          <meshBasicMaterial color="#fff6e0" />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.45, 14, 14]} />
          <meshBasicMaterial color="#ffe2a8" transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <group ref={tailRef}>
          <mesh
            ref={dustPlaneRef}
            position={[0, 0, 0.15 + TAIL_LENGTH * 0.5]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[9.6, TAIL_LENGTH, 1, 16]} />
            <meshBasicMaterial
              map={tailSprite}
              color="#ffe6c0"
              transparent
              opacity={0.9}
              side={DoubleSide}
              depthTest={false}
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <mesh
            ref={ionPlaneRef}
            position={[0, 0, 0.15 + TAIL_LENGTH * 0.5]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[2.8, TAIL_LENGTH, 1, 16]} />
            <meshBasicMaterial
              map={tailSprite}
              color="#e4eeff"
              transparent
              opacity={0.75}
              side={DoubleSide}
              depthTest={false}
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
      <BodyLabel getPosition={() => cometPos.current} radius={cometLabelRadius}>
        Swift–Tuttle
      </BodyLabel>
      <BodyLabel getPosition={() => crossingCenter} radius={labelRadius}>
        {crossing ? 'Perseids · Earth in stream' : 'Perseids'}
      </BodyLabel>
    </>
  )
}
