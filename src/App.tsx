import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBodyPositions } from './astronomy/useBodyPositions.ts'
import {
  BODY_SCALE_MAX,
  BODY_SCALE_MIN,
  cameraFarForScale,
  DEFAULT_SCALE,
  getBodyRadii,
  maxDistanceForScale,
  SKY_BRIGHTNESS_MAX,
  SKY_BRIGHTNESS_MIN,
  skyRadiusForScale,
  type ScaleSettings,
} from './astronomy/scale.ts'
import { isPerseidCrossing } from './astronomy/perseids.ts'
import { SolarSystem } from './scene/SolarSystem.tsx'
import { SceneReady } from './scene/SceneReady.tsx'
import { type FocusId } from './scene/CameraRig.tsx'
import { writeStartPose } from './scene/startPose.ts'
import type { GeoLocation } from './scene/Earth.tsx'
import { Vector3 } from 'three'
import { Controls, type GeoStatus } from './ui/Controls.tsx'

const SHOW_AXES_KEY = 'solar-system:showAxes'
const SCALE_KEY = 'solar-system:scale'
const USER_GEO_KEY = 'solar-system:userGeo'

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

function readStoredGeo(): GeoLocation | null {
  try {
    const raw = window.localStorage.getItem(USER_GEO_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<GeoLocation>
    const lat = Number(parsed.lat)
    const lon = Number(parsed.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
    return { lat, lon }
  } catch {
    return null
  }
}

function writeStoredGeo(geo: GeoLocation): void {
  try {
    window.localStorage.setItem(USER_GEO_KEY, JSON.stringify(geo))
  } catch {
    // ignore quota / private mode
  }
}

function readStoredScale(): ScaleSettings {
  try {
    const raw = window.localStorage.getItem(SCALE_KEY)
    if (!raw) return DEFAULT_SCALE
    const parsed = JSON.parse(raw) as Partial<ScaleSettings>
    const skyBrightness = Number(parsed.skyBrightness)
    const milkyWayBrightness = Number(parsed.milkyWayBrightness)
    return {
      auInUnits: clamp(Number(parsed.auInUnits) || DEFAULT_SCALE.auInUnits, 20, 250),
      bodyScale: clamp(
        Number(parsed.bodyScale) || DEFAULT_SCALE.bodyScale,
        BODY_SCALE_MIN,
        BODY_SCALE_MAX,
      ),
      skyBrightness: clamp(
        Number.isFinite(skyBrightness) ? skyBrightness : DEFAULT_SCALE.skyBrightness,
        SKY_BRIGHTNESS_MIN,
        SKY_BRIGHTNESS_MAX,
      ),
      milkyWayBrightness: clamp(
        Number.isFinite(milkyWayBrightness)
          ? milkyWayBrightness
          : DEFAULT_SCALE.milkyWayBrightness,
        SKY_BRIGHTNESS_MIN,
        SKY_BRIGHTNESS_MAX,
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
    writeStartPose(store, camera, target)
    return {
      position: camera.toArray() as [number, number, number],
      target: target.toArray() as [number, number, number],
    }
  }, [store])
  const [focusNonce, setFocusNonce] = useState(0)
  const [showAxes, setShowAxes] = useState(() => readStoredFlag(SHOW_AXES_KEY, true))
  const skyRadius = skyRadiusForScale(scale.auInUnits)
  const cameraFar = cameraFarForScale(scale.auInUnits)
  const maxDistance = maxDistanceForScale(scale.auInUnits)
  const perseidCrossing = isPerseidCrossing(date)
  const [userGeo, setUserGeo] = useState<GeoLocation | null>(readStoredGeo)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(() => (readStoredGeo() ? 'ready' : 'idle'))
  const userGeoRef = useRef(userGeo)
  userGeoRef.current = userGeo

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
  }, [])

  useEffect(() => {
    writeStoredFlag(SHOW_AXES_KEY, showAxes)
  }, [showAxes])

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

  const applyUserGeo = useCallback((geo: GeoLocation) => {
    setUserGeo(geo)
    setGeoStatus('ready')
    writeStoredGeo(geo)
  }, [])

  const requestUserGeo = useCallback(
    (focusEarth: boolean) => {
      if (!navigator.geolocation) {
        setGeoStatus('unavailable')
        return
      }
      if (focusEarth) setGeoStatus('pending')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyUserGeo({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
          if (focusEarth) handleFocus('earth')
        },
        (error) => {
          if (userGeoRef.current) {
            setGeoStatus('ready')
            if (focusEarth) handleFocus('earth')
            return
          }
          setGeoStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')
        },
        { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
      )
    },
    [applyUserGeo, handleFocus],
  )

  useEffect(() => {
    const permissions = navigator.permissions
    if (!permissions?.query) return
    let cancelled = false
    permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!cancelled && result.state === 'granted') requestUserGeo(false)
      })
      .catch(() => {
        // Safari and some embeds omit geolocation from Permissions API.
      })
    return () => {
      cancelled = true
    }
  }, [requestUserGeo])

  const handleWhereAmI = useCallback(() => {
    if (userGeo) {
      handleFocus('earth')
      return
    }
    requestUserGeo(true)
  }, [handleFocus, requestUserGeo, userGeo])

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
          showDegrees={showAxes}
          skyBrightness={scale.skyBrightness}
          milkyWayBrightness={scale.milkyWayBrightness}
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
        onShowAxesChange={handleShowAxes}
        geoStatus={geoStatus}
        onWhereAmI={handleWhereAmI}
      />
    </div>
  )
}
