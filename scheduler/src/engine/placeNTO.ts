import type { WeekSlot, ClassSlot, Location } from "../types";

/**
 * Configuration for how NTO (New Technician Orientation) blocks are
 * generated across the year. All three fields are admin-configurable
 * from the generation settings screen.
 */
export interface NTOPlacementConfig {
  /** How many consecutive weeks each NTO block runs for. Default 2. */
  weeks: number;

  /** ISO date (yyyy-mm-dd) the FIRST NTO block may start on or after. */
  startDate: string;

  /**
   * How many months apart each NTO occurrence is placed, starting from
   * startDate. 1 = monthly, 2 = every other month, etc.
   */
  frequencyMonths: number;
}

/**
 * Injects NTO slots into an existing schedule. NTO is additive: it does
 * NOT replace existing slots.
 *
 * Rules:
 * - The first NTO block starts on/after config.startDate
 * - Subsequent blocks are spaced config.frequencyMonths apart
 * - Each block is config.weeks consecutive weeks (DST-safe adjacency)
 * - Reserves all weeks in a block so other classes do not overlap
 * - Places NTO for all provided locations
 */
export function placeNTO(
  existingSlots: ClassSlot[],
  weeks: WeekSlot[],
  locations: Location[],
  config: NTOPlacementConfig
): { slots: ClassSlot[]; usedWeeks: Set<number> } {

  const slots: ClassSlot[] = [...existingSlots];
  const usedWeeks = new Set<number>();

  const blockLength = Math.max(1, config?.weeks ?? 2);
  const frequencyMonths = Math.max(1, config?.frequencyMonths ?? 1);

  // Reserve weeks already occupied by existing slots
  for (const slot of existingSlots) {
    for (let i = 0; i < slot.durationWeeks; i++) {
      usedWeeks.add(slot.weekNumber + i);
    }
  }

  // Only consider unblocked weeks, sorted chronologically
  const sortedWeeks = [...weeks]
    .filter(w => !w.blocked)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime()
    );

  if (sortedWeeks.length === 0 || !config?.startDate) {
    console.warn(
      "placeNTO: No available weeks or no start date configured; skipping NTO generation."
    );
    return { slots, usedWeeks };
  }

  const scheduleYear =
    new Date(sortedWeeks[0].startDate).getFullYear();

  let targetDate = new Date(`${config.startDate}T00:00:00`);
  let occurrence = 0;

  // Walk forward by frequencyMonths from startDate for as long as we're
  // still inside the scheduled year, placing one NTO block per stop.
  while (targetDate.getFullYear() <= scheduleYear) {

    if (targetDate.getFullYear() === scheduleYear) {

      const startIndex = sortedWeeks.findIndex(
        w =>
          new Date(w.startDate).getTime() >=
          targetDate.getTime()
      );

      if (startIndex < 0) {
        console.warn(
          `placeNTO: No available week on/after ${targetDate.toISOString().slice(0, 10)} for occurrence ${occurrence + 1}.`
        );
      } else {

        const block = sortedWeeks.slice(
          startIndex,
          startIndex + blockLength
        );

        const isConsecutive =
          block.length === blockLength &&
          block.every((w, idx) => {
            if (idx === 0) return true;

            const diffDays =
              (new Date(w.startDate).getTime() -
                new Date(block[idx - 1].startDate).getTime()) /
              (1000 * 60 * 60 * 24);

            // DST-safe definition of "the immediately following week"
            return diffDays >= 6 && diffDays <= 8;
          });

        const alreadyUsed =
          block.some(w => usedWeeks.has(w.weekNumber));

        if (!isConsecutive) {
          console.warn(
            `placeNTO: Could not find ${blockLength} consecutive unblocked weeks starting near ${targetDate.toISOString().slice(0, 10)} (occurrence ${occurrence + 1}).`
          );
        } else if (alreadyUsed) {
          console.warn(
            `placeNTO: Weeks starting ${block[0].startDate} are already reserved; skipping occurrence ${occurrence + 1}.`
          );
        } else {

          const firstWeek = block[0];
          const lastWeek = block[block.length - 1];

          for (const location of locations) {
            slots.push({
              classId: "NTO",
              className: "New Technician Orientation",
              category: "NTO",
              location,
              weekNumber: firstWeek.weekNumber,
              weekStartDate: firstWeek.startDate,
              weekEndDate: lastWeek.endDate,
              durationWeeks: blockLength,
              instructorId: null
            });
          }

          block.forEach(w => usedWeeks.add(w.weekNumber));
        }
      }
    }

    occurrence++;
    const next = new Date(targetDate);
    next.setMonth(next.getMonth() + frequencyMonths);
    targetDate = next;
  }

  return { slots, usedWeeks };
}