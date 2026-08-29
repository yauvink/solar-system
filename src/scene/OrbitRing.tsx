import { useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector2,
} from 'three'
import type { Vec3 } from '../astronomy/positions.ts'
import { ORBIT_SEGMENTS } from '../astronomy/orbits.ts'

type OrbitRingProps = {
  points: Float32Array
  color?: string
  opacity?: number
  getOffset?: () => Vec3
}

const pathCount = ORBIT_SEGMENTS + 1
const stripCount = pathCount * 2
const LINE_WIDTH_PX = 1.5

function writePath(out: Float32Array, points: Float32Array, getOffset?: () => Vec3): void {
  if (!getOffset) {
    out.set(points)
    return
  }
  const offset = getOffset()
  for (let i = 0; i < points.length; i += 3) {
    out[i] = points[i] + offset[0]
    out[i + 1] = points[i + 1] + offset[1]
    out[i + 2] = points[i + 2] + offset[2]
  }
}

function writeStrip(path: Float32Array, pos: Float32Array, prev: Float32Array, next: Float32Array): void {
  for (let i = 0; i < pathCount; i++) {
    const prevI = i === 0 ? pathCount - 2 : i - 1
    const nextI = i === pathCount - 1 ? 1 : i + 1
    const i3 = i * 3
    const p3 = prevI * 3
    const n3 = nextI * 3
    const a = i * 6
    const b = a + 3
    pos[a] = pos[b] = path[i3]
    pos[a + 1] = pos[b + 1] = path[i3 + 1]
    pos[a + 2] = pos[b + 2] = path[i3 + 2]
    prev[a] = prev[b] = path[p3]
    prev[a + 1] = prev[b + 1] = path[p3 + 1]
    prev[a + 2] = prev[b + 2] = path[p3 + 2]
    next[a] = next[b] = path[n3]
    next[a + 1] = next[b + 1] = path[n3 + 1]
    next[a + 2] = next[b + 2] = path[n3 + 2]
  }
}

export function OrbitRing({ points, color = '#6b8cae', opacity = 0.28, getOffset }: OrbitRingProps) {
  const path = useMemo(() => new Float32Array(pathCount * 3), [])
  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const side = new Float32Array(stripCount)
    const index = new Uint16Array((pathCount - 1) * 6)
    for (let i = 0; i < pathCount; i++) {
      side[i * 2] = -1
      side[i * 2 + 1] = 1
    }
    for (let i = 0; i < pathCount - 1; i++) {
      const a = i * 2
      const o = i * 6
      index[o] = a
      index[o + 1] = a + 1
      index[o + 2] = a + 2
      index[o + 3] = a + 1
      index[o + 4] = a + 2
      index[o + 5] = a + 3
    }
    geo.setAttribute('position', new BufferAttribute(new Float32Array(stripCount * 3), 3))
    geo.setAttribute('prev', new BufferAttribute(new Float32Array(stripCount * 3), 3))
    geo.setAttribute('next', new BufferAttribute(new Float32Array(stripCount * 3), 3))
    geo.setAttribute('side', new BufferAttribute(side, 1))
    geo.setAttribute('fade', new BufferAttribute(new Float32Array(stripCount).fill(1), 1))
    geo.setIndex(new BufferAttribute(index, 1))
    return geo
  }, [])

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(color) },
        uOpacity: { value: opacity },
        uWidth: { value: LINE_WIDTH_PX },
        uResolution: { value: new Vector2(1, 1) },
      },
      vertexShader: `
        attribute float side;
        attribute float fade;
        attribute vec3 prev;
        attribute vec3 next;
        uniform float uWidth;
        uniform vec2 uResolution;
        varying float vFade;

        void main() {
          vFade = fade;
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 clipPrev = projectionMatrix * modelViewMatrix * vec4(prev, 1.0);
          vec4 clipNext = projectionMatrix * modelViewMatrix * vec4(next, 1.0);
          vec2 curr = clip.xy / max(abs(clip.w), 0.0001);
          vec2 prevNdc = clipPrev.xy / max(abs(clipPrev.w), 0.0001);
          vec2 nextNdc = clipNext.xy / max(abs(clipNext.w), 0.0001);
          vec2 dir = nextNdc - curr;
          if (dot(dir, dir) < 1.0e-10) dir = curr - prevNdc;
          dir = normalize(dir);
          vec2 n = vec2(-dir.y, dir.x);
          vec2 pixel = vec2(uWidth / uResolution.x, uWidth / uResolution.y) * 2.0;
          clip.xy += n * side * pixel * clip.w;
          gl_Position = clip;
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
      side: DoubleSide,
    })
  }, [color, opacity])

  const mesh = useMemo(() => {
    const object = new Mesh(geometry, material)
    object.frustumCulled = false
    return object
  }, [geometry, material])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(({ camera, size, viewport }) => {
    writePath(path, points, getOffset)
    const posAttr = geometry.getAttribute('position') as BufferAttribute
    const prevAttr = geometry.getAttribute('prev') as BufferAttribute
    const nextAttr = geometry.getAttribute('next') as BufferAttribute
    const fadeAttr = geometry.getAttribute('fade') as BufferAttribute
    writeStrip(
      path,
      posAttr.array as Float32Array,
      prevAttr.array as Float32Array,
      nextAttr.array as Float32Array,
    )
    posAttr.needsUpdate = true
    prevAttr.needsUpdate = true
    nextAttr.needsUpdate = true
    geometry.computeBoundingSphere()

    const cx = camera.position.x
    const cy = camera.position.y
    const cz = camera.position.z
    let nearest = Infinity
    for (let i = 0; i < pathCount; i++) {
      const i3 = i * 3
      const dist = Math.hypot(path[i3] - cx, path[i3 + 1] - cy, path[i3 + 2] - cz)
      if (dist < nearest) nearest = dist
    }

    const fadeRange = nearest * 8 + 40
    const fades = fadeAttr.array as Float32Array
    for (let i = 0; i < pathCount; i++) {
      const i3 = i * 3
      const dist = Math.hypot(path[i3] - cx, path[i3 + 1] - cy, path[i3 + 2] - cz)
      const t = (dist - nearest) / fadeRange
      const fade = t <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t * (3 - 2 * t)
      fades[i * 2] = fade
      fades[i * 2 + 1] = fade
    }
    fadeAttr.needsUpdate = true
    material.uniforms.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr)
  })

  return <primitive object={mesh} />
}
