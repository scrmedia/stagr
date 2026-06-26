import { spansClash } from '@/lib/time'
import type { SlotWithStage } from '@/types'

/**
 * Set of slot ids that clash with another *flagged* slot. A clash means the
 * user flagged two acts whose set times overlap, so they can't catch both.
 */
export function findClashingSlotIds(slots: SlotWithStage[]): Set<string> {
  const flagged = slots.filter((slot) => slot.is_flagged)
  const clashing = new Set<string>()

  for (let i = 0; i < flagged.length; i += 1) {
    for (let j = i + 1; j < flagged.length; j += 1) {
      if (spansClash(flagged[i], flagged[j])) {
        clashing.add(flagged[i].id)
        clashing.add(flagged[j].id)
      }
    }
  }

  return clashing
}

/** Flagged slots (other than `slot`) whose times overlap with `slot`. */
export function clashesFor(slot: SlotWithStage, slots: SlotWithStage[]): SlotWithStage[] {
  return slots.filter(
    (other) => other.id !== slot.id && other.is_flagged && spansClash(slot, other),
  )
}
