import { useRef } from 'react'
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
}

export function BodyLabel({ getPosition, radius, children }: BodyLabelProps) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    const position = getPosition()
    if (!groupRef.current) return
    groupRef.current.position.set(position[0], position[1] + radius * 1.28, position[2])
  })

  return (
    <group ref={groupRef}>
      <ScreenBillboardText>{children}</ScreenBillboardText>
    </group>
  )
}
