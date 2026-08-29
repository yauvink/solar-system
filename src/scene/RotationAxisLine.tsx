import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, type Group } from 'three'
import type { Vec3 } from '../astronomy/positions.ts'
import { ScreenBillboardText } from './BodyLabel.tsx'

type RotationAxisLineProps = {
  getPosition: () => Vec3
  getNorth: () => Vec3
  getTiltDeg: () => number
  radius: number
  showDegrees: boolean
}

const NORTH_POLE = '#c45c5c'
const SOUTH_POLE = '#5a7eb0'
const AXIS_LABEL = '#c5cdd8'
const DEGREE_VIEW_RADII = 18
const DEGREE_VIEW_MIN = 2.8
const LARGE_BODY_RADII = 5.2
const LARGE_BODY_RADIUS = 4

function axisHalfLength(radius: number): number {
  return Math.max(radius * 2.6, 0.14)
}

export function RotationAxisLine({
  getPosition,
  getNorth,
  getTiltDeg,
  radius,
  showDegrees,
}: RotationAxisLineProps) {
  const northLabel = useRef<Group>(null)
  const southLabel = useRef<Group>(null)
  const nearRef = useRef(false)
  const [near, setNear] = useState(false)
  const half = axisHalfLength(radius)
  const degreeLimit =
    radius >= LARGE_BODY_RADIUS
      ? radius * LARGE_BODY_RADII
      : Math.max(radius * DEGREE_VIEW_RADII, DEGREE_VIEW_MIN)

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    return geo
  }, [])

  const material = useMemo(
    () => new LineBasicMaterial({ color: '#d7e4ff', transparent: true, opacity: 0.85 }),
    [],
  )
  const line = useMemo(() => {
    const object = new Line(geometry, material)
    object.frustumCulled = false
    return object
  }, [geometry, material])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(({ camera }) => {
    const position = getPosition()
    const north = getNorth()
    const nx = north[0] * half
    const ny = north[1] * half
    const nz = north[2] * half
    const attr = geometry.getAttribute('position') as BufferAttribute
    const array = attr.array as Float32Array
    array[0] = position[0] - nx
    array[1] = position[1] - ny
    array[2] = position[2] - nz
    array[3] = position[0] + nx
    array[4] = position[1] + ny
    array[5] = position[2] + nz
    attr.needsUpdate = true
    geometry.computeBoundingSphere()

    if (northLabel.current) {
      northLabel.current.position.set(position[0] + nx, position[1] + ny, position[2] + nz)
    }
    if (southLabel.current) {
      southLabel.current.position.set(position[0] - nx, position[1] - ny, position[2] - nz)
    }

    if (!showDegrees) return
    const dx = camera.position.x - position[0]
    const dy = camera.position.y - position[1]
    const dz = camera.position.z - position[2]
    const distance = Math.hypot(dx, dy, dz)
    const enter = degreeLimit
    const exit = degreeLimit * 1.2
    const next = nearRef.current ? distance < exit : distance < enter
    if (next !== nearRef.current) {
      nearRef.current = next
      setNear(next)
    }
  })

  const tilt = getTiltDeg().toFixed(1)

  return (
    <>
      <primitive object={line} />
      {showDegrees && near ? (
        <>
          <group ref={northLabel}>
            <ScreenBillboardText color={AXIS_LABEL}>
              <span style={{ color: NORTH_POLE }}>N</span>
              {` - ${tilt}°`}
            </ScreenBillboardText>
          </group>
          <group ref={southLabel}>
            <ScreenBillboardText color={AXIS_LABEL}>
              <span style={{ color: SOUTH_POLE }}>S</span>
            </ScreenBillboardText>
          </group>
        </>
      ) : null}
    </>
  )
}
