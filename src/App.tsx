import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBodyPositions } from './astronomy/useBodyPositions.ts'
import {
  BODY_SCALE_MAX,
  BODY_SCALE_MIN,
  cameraFarForScale,
  DEFAULT_SCALE,
  getBodyRadii,
  maxDistanceForScale,
  skyRadiusForScale,
  type ScaleSettings,
} from './astronomy/scale.ts'
import { isPerseidCrossing } from './astronomy/perseids.ts'
import { SolarSystem } from './scene/SolarSystem.tsx'
import { SceneReady } from './scene/SceneReady.tsx'
import { writeFocusPose, type FocusId } from './scene/CameraRig.tsx'
import type { GeoLocation } from './scene/Earth.tsx'
import { Vector3 } from 'three'
import { Controls, type GeoStatus } from './ui/Controls.tsx'

const SHOW_AXES_KEY = 'solar-system:showAxes'
const SHOW_DEGREES_KEY = 'solar-system:showDegrees'
const SCALE_KEY = 'solar-system:scale'

function readStoredFlag(key: string, fallback = false): boolean {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === '1'
  } catch {
    return fallback
  }
}

function writeStoredFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}

function hideBootLoader(): void {
  const loader = document.getElementById('space-loader')
  if (!loader || loader.classList.contains('is-done')) return
  loader.classList.add('is-done')
  window.setTimeout(() => loader.remove(), 700)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function readStoredScale(): ScaleSettings {
  try {
    const raw = window.localStorage.getItem(SCALE_KEY)
    if (!raw) return DEFAULT_SCALE
    const parsed = JSON.parse(raw) as Partial<ScaleSettings>
    return {
      auInUnits: clamp(Number(parsed.auInUnits) || DEFAULT_SCALE.auInUnits, 20, 250),
      bodyScale: clamp(
        Number(parsed.bodyScale) || DEFAULT_SCALE.bodyScale,
        BODY_SCALE_MIN,
        BODY_SCALE_MAX,
      ),
    }
  } catch {
    return DEFAULT_SCALE
  }
}

export default function App() {
  const [scale, setScale] = useState<ScaleSettings>(readStoredScale)
  const { store, date, live, positions, goLive, setCustomDate, setSpeed } = useBodyPositions(
    scale.auInUnits,
    scale.bodyScale,
  )
  const radii = useMemo(() => getBodyRadii(scale), [scale])
  const [focus, setFocus] = useState<FocusId>('earth')
  const startCamera = useMemo(() => {
    const camera = new Vector3()
    const target = new Vector3()
    writeFocusPose('earth', store, radii, camera, target)
    return {
      position: camera.toArray() as [number, number, number],
      target: target.toArray() as [number, number, number],
    }
  }, [radii, store])
  const [focusNonce, setFocusNonce] = useState(0)
  const [showAxes, setShowAxes] = useState(() => readStoredFlag(SHOW_AXES_KEY, true))
  const [showDegrees, setShowDegrees] = useState(() => {
    const axes = readStoredFlag(SHOW_AXES_KEY, true)
    return axes && readStoredFlag(SHOW_DEGREES_KEY, true)
  })
  const skyRadius = skyRadiusForScale(scale.auInUnits)
  const cameraFar = cameraFarForScale(scale.auInUnits)
  const maxDistance = maxDistanceForScale(scale.auInUnits)
  const perseidCrossing = isPerseidCrossing(date)
  const [userGeo, setUserGeo] = useState<GeoLocation | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')

  const handleFocus = useCallback((id: FocusId) => {
    setFocus(id)
    setFocusNonce((value) => value + 1)
  }, [])

  const handleScaleChange = useCallback((patch: Partial<ScaleSettings>) => {
    setScale((current) => ({ ...current, ...patch }))
  }, [])

  const handleScaleReset = useCallback(() => {
    setScale(DEFAULT_SCALE)
  }, [])

  const handleShowAxes = useCallback((value: boolean) => {
    setShowAxes(value)
    if (!value) setShowDegrees(false)
  }, [])

  const handleShowDegrees = useCallback((value: boolean) => {
    setShowDegrees(value)
  }, [])

  useEffect(() => {
    writeStoredFlag(SHOW_AXES_KEY, showAxes)
  }, [showAxes])

  useEffect(() => {
    writeStoredFlag(SHOW_DEGREES_KEY, showDegrees)
  }, [showDegrees])

  useEffect(() => {
    try {
      window.localStorage.setItem(SCALE_KEY, JSON.stringify(scale))
    } catch {
      // ignore quota / private mode
    }
  }, [scale])

  const handleSceneReady = useCallback(() => {
    hideBootLoader()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(hideBootLoader, 12_000)
    return () => window.clearTimeout(timer)
  }, [])

  const handleWhereAmI = useCallback(() => {
    if (userGeo) {
      handleFocus('earth')
      return
    }
    if (!navigator.geolocation) {
      setGeoStatus('unavailable')
      return
    }
    setGeoStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserGeo({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
        setGeoStatus('ready')
        handleFocus('earth')
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    )
  }, [handleFocus, userGeo])

  return (
    <div className="app">
      <div className="viewport">
      <Canvas
        camera={{ position: startCamera.position, fov: 48, near: 0.01, far: cameraFar }}
        gl={{ antialias: true }}
      >
        <SceneReady onReady={handleSceneReady} />
        <SolarSystem
          store={store}
          radii={radii}
          focus={focus}
          focusNonce={focusNonce}
          skyRadius={skyRadius}
          cameraFar={cameraFar}
          maxDistance={maxDistance}
          showAxes={showAxes}
          showDegrees={showDegrees}
          auInUnits={scale.auInUnits}
          perseidCrossing={perseidCrossing}
          startTarget={startCamera.target}
          userGeo={userGeo}
        />
      </Canvas>
      </div>
      <Controls
        date={date}
        live={live}
        onDateChange={setCustomDate}
        focus={focus}
        onFocus={handleFocus}
        onRefresh={goLive}
        onSpeed={setSpeed}
        scale={scale}
        onScaleChange={handleScaleChange}
        onScaleReset={handleScaleReset}
        radii={radii}
        positions={positions}
        showAxes={showAxes}
        showDegrees={showDegrees}
        onShowAxesChange={handleShowAxes}
        onShowDegreesChange={handleShowDegrees}
        geoStatus={geoStatus}
        onWhereAmI={handleWhereAmI}
      />
    </div>
  )
}
