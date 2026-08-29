import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'

type CameraFarProps = {
  far: number
}

export function CameraFar({ far }: CameraFarProps) {
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    camera.far = far
    camera.updateProjectionMatrix()
  }, [camera, far])

  return null
}
