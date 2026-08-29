import { useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three'
import { createPerseidCloud } from '../astronomy/perseids.ts'
import { BodyLabel } from './BodyLabel.tsx'

type PerseidStreamProps = {
  auInUnits: number
  crossing: boolean
  labelRadius: number
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
  gradient.addColorStop(0, 'rgba(255, 236, 210, 0.9)')
  gradient.addColorStop(0.35, 'rgba(255, 168, 92, 0.35)')
  gradient.addColorStop(1, 'rgba(80, 40, 20, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function PerseidStream({ auInUnits, crossing, labelRadius }: PerseidStreamProps) {
  const cloud = useMemo(() => createPerseidCloud(auInUnits), [auInUnits])
  const sprite = useMemo(() => createSoftSprite(), [])

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(cloud.positions, 3))
    return geo
  }, [cloud])

  const material = useMemo(
    () =>
      new PointsMaterial({
        map: sprite,
        color: new Color('#ffc48a'),
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: AdditiveBlending,
        size: Math.max(0.7, auInUnits * 0.009),
        sizeAttenuation: true,
      }),
    [auInUnits, sprite],
  )

  const points = useMemo(() => new Points(geometry, material), [geometry, material])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
      sprite.dispose()
    }
  }, [geometry, material, sprite])

  useFrame((state) => {
    const pulse = crossing ? 0.19 + Math.sin(state.clock.elapsedTime * 4.2) * 0.04 : 0.1
    material.opacity = pulse
    material.color.set(crossing ? '#ffe0b0' : '#ffc48a')
  })

  const haze = Math.max(2.2, auInUnits * 0.055)

  return (
    <>
      <mesh position={cloud.crossingCenter}>
        <sphereGeometry args={[haze, 28, 28]} />
        <meshBasicMaterial
          color={crossing ? '#ffd2a0' : '#e8a070'}
          transparent
          opacity={crossing ? 0.06 : 0.03}
          depthWrite={false}
        />
      </mesh>
      <primitive object={points} />
      <BodyLabel getPosition={() => cloud.crossingCenter} radius={labelRadius}>
        {crossing ? 'Perseids · Earth in stream' : 'Perseids'}
      </BodyLabel>
    </>
  )
}
