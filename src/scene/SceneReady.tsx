import { useEffect, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

type SceneReadyProps = {
  onReady: () => void
}

const SETTLE_FRAMES = 24
const FAILSAFE_MS = 12_000

export function SceneReady({ onReady }: SceneReadyProps) {
  const { active, loaded, total } = useProgress()
  const frames = useRef(0)
  const done = useRef(false)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (done.current) return
      done.current = true
      onReadyRef.current()
    }, FAILSAFE_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current < SETTLE_FRAMES) return
    if (active) return
    if (total > 0 && loaded < total) return
    done.current = true
    onReadyRef.current()
  })

  return null
}
