// Pure date/time helpers shared across client and server. All times are
// festival-local "HH:MM" strings paired with a "YYYY-MM-DD" day. Sets that end
// past midnight (end <= start) are treated as finishing on the following day.

export type TimeSpan = {
  day: string
  start_time: string
  end_time: string
}

const MINUTES_IN_DAY = 24 * 60

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0
  }
  return hours * 60 + minutes
}

function dayToParts(day: string): [number, number, number] {
  const [year, month, date] = day.split('-').map(Number)
  return [year, month, date]
}

/** Absolute Date for the start of a span, in the runtime's local timezone. */
export function spanStart(span: TimeSpan): Date {
  const [year, month, date] = dayToParts(span.day)
  const minutes = timeToMinutes(span.start_time)
  return new Date(year, month - 1, date, Math.floor(minutes / 60), minutes % 60, 0, 0)
}

/** Absolute Date for the end of a span; rolls to the next day for overnight sets. */
export function spanEnd(span: TimeSpan): Date {
  const start = timeToMinutes(span.start_time)
  let end = timeToMinutes(span.end_time)
  if (end <= start) {
    end += MINUTES_IN_DAY
  }
  const [year, month, date] = dayToParts(span.day)
  return new Date(year, month - 1, date, Math.floor(end / 60), end % 60, 0, 0)
}

export function durationMinutes(span: TimeSpan): number {
  return Math.max(0, Math.round((spanEnd(span).getTime() - spanStart(span).getTime()) / 60000))
}

/** Duration from bare HH:MM strings (no day), treating end <= start as overnight. */
export function durationMinutesFromTimes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  let end = timeToMinutes(endTime)
  if (end <= start) {
    end += MINUTES_IN_DAY
  }
  return end - start
}

/** Two spans clash when their [start, end) intervals overlap on the timeline. */
export function spansClash(a: TimeSpan, b: TimeSpan): boolean {
  const aStart = spanStart(a).getTime()
  const aEnd = spanEnd(a).getTime()
  const bStart = spanStart(b).getTime()
  const bEnd = spanEnd(b).getTime()
  return aStart < bEnd && bStart < aEnd
}

export function formatTime(time: string): string {
  // Festival posters use 24h; normalise to padded HH:MM.
  const [hours, minutes] = time.split(':')
  return `${hours.padStart(2, '0')}:${minutes ?? '00'}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDayLabel(day: string): string {
  const [year, month, date] = dayToParts(day)
  const d = new Date(year, month - 1, date)
  return `${WEEKDAYS[d.getDay()]} ${date} ${MONTHS[month - 1]}`
}

export function formatDayShort(day: string): string {
  const [year, month, date] = dayToParts(day)
  const d = new Date(year, month - 1, date)
  return WEEKDAYS[d.getDay()]
}

/** Inclusive list of YYYY-MM-DD days between two dates. */
export function daysBetween(startDate: string, endDate: string): string[] {
  const [sy, sm, sd] = dayToParts(startDate)
  const [ey, em, ed] = dayToParts(endDate)
  const cursor = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  const days: string[] = []
  // Cap to a sane range so a bad end date can't loop forever.
  while (cursor <= end && days.length < 60) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const dd = String(cursor.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${dd}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function toDayString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Human countdown like "Now", "4m", "1h 12m", or "2d 3h". */
export function formatCountdown(msUntil: number): string {
  if (msUntil <= 0) {
    return 'Now'
  }
  const totalMinutes = Math.floor(msUntil / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
