import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createEphemerisStore,
  HUD_FLUSH_MS,
  LIVE_REFRESH_MS,
  recomputeEphemeris,
  type EphemerisStore,
} from './ephemerisStore.ts'

export function useBodyPositions(auInUnits: number) {
  const storeRef = useRef<EphemerisStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createEphemerisStore(auInUnits)
  }
  const store = storeRef.current

  if (store.auInUnits !== auInUnits) {
    store.auInUnits = auInUnits
    recomputeEphemeris(store)
  }

  const [date, setDate] = useState(() => new Date(store.dateMs))
  const [live, setLive] = useState(store.live)

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = new Date(store.dateMs)
      setDate((prev) => (prev.getTime() === next.getTime() ? prev : next))
      setLive(store.live)
    }, HUD_FLUSH_MS)
    return () => window.clearInterval(id)
  }, [store])

  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => {
      if (!store.live || store.speedDaysPerSec !== 0) return
      store.dateMs = Date.now()
      recomputeEphemeris(store)
    }, LIVE_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [live, store])

  const goLive = useCallback(() => {
    store.speedDaysPerSec = 0
    store.live = true
    store.dateMs = Date.now()
    recomputeEphemeris(store)
    setDate(new Date(store.dateMs))
    setLive(true)
  }, [store])

  const setCustomDate = useCallback(
    (next: Date) => {
      if (Number.isNaN(next.getTime())) return
      store.speedDaysPerSec = 0
      store.live = false
      store.dateMs = next.getTime()
      recomputeEphemeris(store)
      setDate(next)
      setLive(false)
    },
    [store],
  )

  const setSpeed = useCallback(
    (daysPerSec: number) => {
      if (daysPerSec !== 0) {
        store.live = false
      }
      store.speedDaysPerSec = daysPerSec
    },
    [store],
  )

  return { store, date, live, positions: store.positions, goLive, setCustomDate, setSpeed }
}
