'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SlotWithStage } from '@/types'
import { spanStart } from '@/lib/time'

const STORAGE_KEY = 'stagr:reminders'
const DAY_MS = 24 * 60 * 60 * 1000

type Permission = 'default' | 'granted' | 'denied' | 'unsupported'

/**
 * Schedules local notifications a few minutes before each flagged set starts,
 * while the app is open. Honest about scope: this is client-side scheduling, not
 * server web-push, so reminders fire when the PWA is running.
 */
function readPermission(): Permission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  return Notification.permission as Permission
}

export function useReminders(slots: SlotWithStage[], leadMinutes = 10) {
  // Lazy initialisers read browser state once without a setState-in-effect.
  const [enabled, setEnabled] = useState<boolean>(
    () => typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1',
  )
  const [permission, setPermission] = useState<Permission>(readPermission)
  const timers = useRef<number[]>([])

  useEffect(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []

    if (!enabled || permission !== 'granted' || typeof Notification === 'undefined') {
      return
    }

    const now = Date.now()
    const lead = leadMinutes * 60000

    for (const slot of slots) {
      if (!slot.is_flagged) {
        continue
      }
      const delay = spanStart(slot).getTime() - lead - now
      // Only schedule reminders within the next day to keep timers sane.
      if (delay > 0 && delay < DAY_MS) {
        const id = window.setTimeout(() => {
          try {
            new Notification(`${slot.band_name} starts soon`, {
              body: `${slot.stage.name} · in ${leadMinutes} min`,
              icon: '/icon.svg',
              tag: slot.id,
            })
          } catch {
            // Ignore notification failures (e.g. permission revoked mid-session).
          }
        }, delay)
        timers.current.push(id)
      }
    }

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id))
      timers.current = []
    }
  }, [enabled, permission, slots, leadMinutes])

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false)
      window.localStorage.setItem(STORAGE_KEY, '0')
      return
    }
    if (typeof Notification === 'undefined') {
      return
    }
    let next = Notification.permission as Permission
    if (next === 'default') {
      next = (await Notification.requestPermission()) as Permission
    }
    setPermission(next)
    if (next === 'granted') {
      setEnabled(true)
      window.localStorage.setItem(STORAGE_KEY, '1')
    }
  }, [enabled])

  return { enabled, permission, toggle, leadMinutes }
}
