import { useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial } from 'three'
import type { Vec3 } from '../astronomy/positions.ts'
import { ORBIT_SEGMENTS } from '../astronomy/orbits.ts'

type OrbitRingProps = {
  points: Float32Array
  color?: string
  opacity?: number
  getOffset?: () => Vec3
}

export function OrbitRing({ points, color = '#6b8cae', opacity = 0.28, getOffset }: OrbitRingProps) {
  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array((ORBIT_SEGMENTS + 1) * 3), 3))
    return geo
  }, [])

  const material = useMemo(
    () => new LineBasicMaterial({ color, transparent: true, opacity }),
    [color, opacity],
  )
  const line = useMemo(() => {
    const object = new Line(geometry, material)
    object.frustumCulled = false
    return object
  }, [geometry, material])

  useLayoutEffect(() => {
    if (getOffset) return
    const attr = geometry.getAttribute('position') as BufferAttribute
    ;(attr.array as Float32Array).set(points)
    attr.needsUpdate = true
    geometry.computeBoundingSphere()
  }, [geometry, getOffset, points])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(() => {
    if (!getOffset) return
    const attr = geometry.getAttribute('position') as BufferAttribute
    const out = attr.array as Float32Array
    const offset = getOffset()
    for (let i = 0; i < points.length; i += 3) {
      out[i] = points[i] + offset[0]
      out[i + 1] = points[i + 1] + offset[1]
      out[i + 2] = points[i + 2] + offset[2]
    }
    attr.needsUpdate = true
    geometry.computeBoundingSphere()
  })

  return <primitive object={line} />
}
