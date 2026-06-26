'use client'

import { cn } from '@/lib/utils'
import { formatDayShort, formatDayLabel } from '@/lib/time'

interface DayTabsProps {
  days: string[]
  selectedDay: string
  onSelect: (day: string) => void
}

export function DayTabs({ days, selectedDay, onSelect }: DayTabsProps) {
  if (days.length <= 1) {
    return null
  }

  return (
    <div className='flex gap-2 overflow-x-auto px-4 py-3'>
      {days.map((day) => {
        const isActive = day === selectedDay
        return (
          <button
            key={day}
            type='button'
            onClick={() => onSelect(day)}
            className={cn(
              'flex min-h-11 shrink-0 flex-col items-center justify-center rounded-xl px-4 py-1.5 transition-colors',
              isActive
                ? 'bg-stagr-amber text-stagr-night'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <span className='text-sm font-semibold leading-tight'>{formatDayShort(day)}</span>
            <span className={cn('text-[10px] leading-tight', isActive ? 'text-stagr-night/70' : 'text-muted-foreground')}>
              {formatDayLabel(day).replace(`${formatDayShort(day)} `, '')}
            </span>
          </button>
        )
      })}
    </div>
  )
}
