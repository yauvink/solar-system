import { useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  ShaderMaterial,
} from 'three'
import type { Vec3 } from '../astronomy/positions.ts'
import { ORBIT_SEGMENTS } from '../astronomy/orbits.ts'

type OrbitRingProps = {
  points: Float32Array
  color?: string
  opacity?: number
  getOffset?: () => Vec3
}

const vertCount = ORBIT_SEGMENTS + 1

export function OrbitRing({ points, color = '#6b8cae', opacity = 0.28, getOffset }: OrbitRingProps) {
  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(vertCount * 3), 3))
    geo.setAttribute('fade', new BufferAttribute(new Float32Array(vertCount).fill(1), 1))
    return geo
  }, [])

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        attribute float fade;
        varying float vFade;
        void main() {
          vFade = fade;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vFade;
        void main() {
          gl_FragColor = vec4(uColor, uOpacity * vFade);
        }
      `,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  }, [color, opacity])

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

  useFrame(({ camera }) => {
    const posAttr = geometry.getAttribute('position') as BufferAttribute
    const fadeAttr = geometry.getAttribute('fade') as BufferAttribute
    const out = posAttr.array as Float32Array

    if (getOffset) {
      const offset = getOffset()
      for (let i = 0; i < points.length; i += 3) {
        out[i] = points[i] + offset[0]
        out[i + 1] = points[i + 1] + offset[1]
        out[i + 2] = points[i + 2] + offset[2]
      }
      posAttr.needsUpdate = true
      geometry.computeBoundingSphere()
    }

    const cx = camera.position.x
    const cy = camera.position.y
    const cz = camera.position.z
    let nearest = Infinity
    for (let i = 0; i < vertCount; i++) {
      const i3 = i * 3
      const dist = Math.hypot(out[i3] - cx, out[i3 + 1] - cy, out[i3 + 2] - cz)
      if (dist < nearest) nearest = dist
    }

    const fadeRange = nearest * 8 + 40
    const fades = fadeAttr.array as Float32Array
    for (let i = 0; i < vertCount; i++) {
      const i3 = i * 3
      const dist = Math.hypot(out[i3] - cx, out[i3 + 1] - cy, out[i3 + 2] - cz)
      const t = (dist - nearest) / fadeRange
      fades[i] = t <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t * (3 - 2 * t)
    }
    fadeAttr.needsUpdate = true
  })

  return <primitive object={line} />
}
