'use client'

import { useEffect, useState } from 'react'

/**
 * A clock that re-renders on an interval. `offsetMs` shifts the returned time,
 * which the live view uses to simulate festival day for demos. Returns null on
 * the server / first paint to stay hydration-safe.
 */
export function useNow(intervalMs = 1000, offsetMs = 0): Date | null {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + offsetMs))
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, offsetMs])

  return now
}
