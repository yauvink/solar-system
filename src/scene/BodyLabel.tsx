import { useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { CSSProperties, ReactNode } from 'react'
import type { Group } from 'three'
import type { Vec3 } from '../astronomy/positions.ts'

type ScreenBillboardTextProps = {
  children: ReactNode
  color?: string
}

const labelStyle = (color: string): CSSProperties => ({
  color,
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '0.02em',
  lineHeight: 1.2,
  textShadow: '0 0 6px #000, 0 1px 3px #000',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
})

export function ScreenBillboardText({ children, color = '#f4f1e8' }: ScreenBillboardTextProps) {
  return (
    <Html center sprite occlude={false} style={labelStyle(color)}>
      {children}
    </Html>
  )
}

type BodyLabelProps = {
  getPosition: () => Vec3
  radius: number
  children: string
  /** Hide the name when the camera is farther than this distance. */
  showWithin?: number
}

export function BodyLabel({ getPosition, radius, children, showWithin }: BodyLabelProps) {
  const groupRef = useRef<Group>(null)
  const nearRef = useRef(showWithin == null)
  const [near, setNear] = useState(showWithin == null)

  useFrame(({ camera }) => {
    const position = getPosition()
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1] + radius * 1.28, position[2])
    }
    if (showWithin == null) return
    const dx = camera.position.x - position[0]
    const dy = camera.position.y - position[1]
    const dz = camera.position.z - position[2]
    const distance = Math.hypot(dx, dy, dz)
    const next = nearRef.current ? distance < showWithin * 1.25 : distance < showWithin
    if (next !== nearRef.current) {
      nearRef.current = next
      setNear(next)
    }
  })

  return (
    <group ref={groupRef}>
      {near ? <ScreenBillboardText>{children}</ScreenBillboardText> : null}
    </group>
  )
}
