import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { isMoonId, MOON_BY_ID, type BodyId } from '../astronomy/bodies.ts'
import type { EphemerisStore } from '../astronomy/ephemerisStore.ts'
import { length } from '../astronomy/positions.ts'
import type { BodyRadii } from '../astronomy/scale.ts'
import { writeStartPose } from './startPose.ts'

export type FocusId = BodyId | 'reset'

type CameraRigProps = {
  focus: FocusId
  focusNonce: number
  store: EphemerisStore
  radii: BodyRadii
}

type OrbitLike = {
  target: Vector3
  update: () => void
}

const goalCam = new Vector3()
const goalTarget = new Vector3()
const startCam = new Vector3()
const startTarget = new Vector3()
const bodyPos = new Vector3()
const offset = new Vector3()

const ANIM_MIN = 1.05
const ANIM_MAX = 2.15

function easeInOut(u: number): number {
  return u * u * u * (u * (u * 6 - 15) + 10)
}

function animDuration(from: Vector3, to: Vector3): number {
  const dist = from.distanceTo(to)
  return Math.min(ANIM_MAX, Math.max(ANIM_MIN, 0.72 + Math.sqrt(dist) * 0.11))
}

/** Small orbit-control nudge: swipe left + up, so the Sun sits off-center and a bit lower. */
const FOCUS_YAW = -0.32
const FOCUS_PITCH = 0.06

function biasFocusCamera(cameraOut: Vector3, target: Vector3) {
  const ox = cameraOut.x - target.x
  const oy = cameraOut.y - target.y
  const oz = cameraOut.z - target.z

  const cy = Math.cos(FOCUS_YAW)
  const sy = Math.sin(FOCUS_YAW)
  const x = ox * cy - oz * sy
  const z = ox * sy + oz * cy

  const horiz = Math.hypot(x, z) || 1
  const cp = Math.cos(FOCUS_PITCH)
  const sp = Math.sin(FOCUS_PITCH)
  const newHoriz = horiz * cp + oy * sp
  const scale = newHoriz / horiz

  cameraOut.set(target.x + x * scale, target.y + oy * cp - horiz * sp, target.z + z * scale)
}

export function writeFocusPose(
  focus: FocusId,
  store: EphemerisStore,
  radii: BodyRadii,
  cameraOut: Vector3,
  targetOut: Vector3,
) {
  const positions = store.positions

  if (focus === 'reset') {
    const reach = Math.max(length(positions.saturn), store.auInUnits * 8)
    targetOut.set(0, 0, 0)
    cameraOut.set(reach * 0.62, reach * 0.38, reach * 0.62)
    return
  }

  const pos = positions[focus]
  const radius = radii[focus]
  targetOut.set(pos[0], pos[1], pos[2])

  if (focus === 'sun') {
    cameraOut.set(0, radius * 1.35, radius * 3.4)
    return
  }

  if (isMoonId(focus)) {
    const parent = positions[MOON_BY_ID[focus].parent]
    let ax = pos[0] - parent[0]
    let ay = pos[1] - parent[1]
    let az = pos[2] - parent[2]
    const len = Math.hypot(ax, ay, az) || 1
    cameraOut.set(
      pos[0] + (ax / len) * radius * 12,
      pos[1] + radius * 6 + (ay / len) * radius * 2,
      pos[2] + (az / len) * radius * 12,
    )
    biasFocusCamera(cameraOut, targetOut)
    return
  }

  const len = Math.hypot(pos[0], pos[1], pos[2]) || 1
  const ax = pos[0] / len
  const az = pos[2] / len
  if (focus === 'earth') {
    // Quarter-phase: stand off the Sun–Earth line so day and night share the disk.
    const phase = 1.15
    const dist = radius * 10
    const sx = az
    const sz = -ax
    cameraOut.set(
      pos[0] + (-Math.cos(phase) * ax + Math.sin(phase) * sx) * dist,
      pos[1] + radius * 4,
      pos[2] + (-Math.cos(phase) * az + Math.sin(phase) * sz) * dist,
    )
    biasFocusCamera(cameraOut, targetOut)
    return
  }

  cameraOut.set(
    pos[0] + ax * radius * 10,
    pos[1] + radius * 5,
    pos[2] + az * radius * 10,
  )
  biasFocusCamera(cameraOut, targetOut)
}

function setGoals(focus: FocusId, store: EphemerisStore, radii: BodyRadii) {
  writeFocusPose(focus, store, radii, goalCam, goalTarget)
}

export function CameraRig({ focus, focusNonce, store, radii }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitLike | null
  const gl = useThree((state) => state.gl)
  const animating = useRef(false)
  const following = useRef(true)
  const snapped = useRef(false)
  const animTime = useRef(0)
  const animLength = useRef(ANIM_MIN)
  const radiiRef = useRef(radii)
  radiiRef.current = radii

  useEffect(() => {
    setGoals(focus, store, radiiRef.current)
    following.current = true
    if (!snapped.current) return
    startCam.copy(camera.position)
    startTarget.copy(controls?.target ?? goalTarget)
    animTime.current = 0
    animLength.current = animDuration(startCam, goalCam)
    animating.current = true
  }, [camera, focus, focusNonce, store])

  useEffect(() => {
    const canvas = gl.domElement
    const stop = () => {
      animating.current = false
      following.current = false
    }
    const resume = () => {
      if (focus === 'reset') return
      bodyPos.set(store.positions[focus][0], store.positions[focus][1], store.positions[focus][2])
      offset.copy(camera.position).sub(bodyPos)
      following.current = true
    }
    canvas.addEventListener('pointerdown', stop)
    canvas.addEventListener('wheel', stop, { passive: true })
    canvas.addEventListener('pointerup', resume)
    return () => {
      canvas.removeEventListener('pointerdown', stop)
      canvas.removeEventListener('wheel', stop)
      canvas.removeEventListener('pointerup', resume)
    }
  }, [camera, focus, gl, store])

  useFrame((_, delta) => {
    if (!controls) return

    if (!snapped.current) {
      if (focus === 'earth') {
        writeStartPose(store, camera.position, controls.target)
      } else {
        setGoals(focus, store, radiiRef.current)
        camera.position.copy(goalCam)
        controls.target.copy(goalTarget)
      }
      controls.update()
      if (focus !== 'reset') {
        bodyPos.set(store.positions[focus][0], store.positions[focus][1], store.positions[focus][2])
        offset.copy(camera.position).sub(bodyPos)
      }
      following.current = true
      snapped.current = true
      return
    }

    if (animating.current) {
      setGoals(focus, store, radiiRef.current)
      animTime.current += delta
      const u = Math.min(1, animTime.current / animLength.current)
      const t = easeInOut(u)
      camera.position.lerpVectors(startCam, goalCam, t)
      controls.target.lerpVectors(startTarget, goalTarget, t)
      controls.update()
      if (u >= 1) {
        animating.current = false
        if (focus !== 'reset') {
          bodyPos.set(store.positions[focus][0], store.positions[focus][1], store.positions[focus][2])
          offset.copy(camera.position).sub(bodyPos)
        }
      }
      return
    }

    if (focus === 'reset' || !following.current) return

    bodyPos.set(store.positions[focus][0], store.positions[focus][1], store.positions[focus][2])
    controls.target.copy(bodyPos)
    camera.position.copy(bodyPos).add(offset)
    controls.update()
  })

  return null
}
