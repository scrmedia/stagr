import { spanEnd, spanStart } from '@/lib/time'
import type { SlotWithStage, Stage } from '@/types'

export type StageState = {
  stage: Stage
  current: SlotWithStage | null
  next: SlotWithStage | null
}

/** Current and upcoming act for a single stage at time `nowMs`. */
export function stageStateAt(stage: Stage, slots: SlotWithStage[], nowMs: number): StageState {
  const stageSlots = slots
    .filter((slot) => slot.stage_id === stage.id)
    .sort((a, b) => spanStart(a).getTime() - spanStart(b).getTime())

  const current =
    stageSlots.find((slot) => spanStart(slot).getTime() <= nowMs && nowMs < spanEnd(slot).getTime()) ??
    null
  const next = stageSlots.find((slot) => spanStart(slot).getTime() > nowMs) ?? null

  return { stage, current, next }
}

/** The user's flagged acts that are playing right now. */
export function flaggedNow(slots: SlotWithStage[], nowMs: number): SlotWithStage[] {
  return slots
    .filter(
      (slot) => slot.is_flagged && spanStart(slot).getTime() <= nowMs && nowMs < spanEnd(slot).getTime(),
    )
    .sort((a, b) => spanStart(a).getTime() - spanStart(b).getTime())
}

/** The user's flagged acts starting after now, soonest first. */
export function flaggedUpcoming(slots: SlotWithStage[], nowMs: number): SlotWithStage[] {
  return slots
    .filter((slot) => slot.is_flagged && spanStart(slot).getTime() > nowMs)
    .sort((a, b) => spanStart(a).getTime() - spanStart(b).getTime())
}

/** Full festival timeline bounds in ms, across every slot. */
export function festivalBounds(slots: SlotWithStage[]): { min: number; max: number } | null {
  if (slots.length === 0) {
    return null
  }
  let min = Infinity
  let max = -Infinity
  for (const slot of slots) {
    min = Math.min(min, spanStart(slot).getTime())
    max = Math.max(max, spanEnd(slot).getTime())
  }
  return { min, max }
}
