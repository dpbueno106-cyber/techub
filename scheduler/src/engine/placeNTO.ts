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

// All date parsing/formatting in this file goes through these two
// helpers so everything is anchored to LOCAL midnight consistently.
// Mixing bare `new Date("2027-01-08")` (parsed as UTC midnight) with
// `new Date("2027-01-08T00:00:00")` (parsed as local midnight) can
// silently shift comparisons by hours depending on server timezone,
// which is exactly the kind of thing that causes off-by-one-day bugs.
function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Injects NTO slots into an existing schedule. NTO is additive: it does
 * NOT replace existing slots, and — intentionally — it does NOT avoid
 * weeks that already have other (non-NTO) classes in them. NTO is meant
 * to run alongside a full slate of other courses taught by other
 * instructors, so sharing a week with a fixed/generated class is fine.
 * Instructor-level double-booking is still prevented separately, later,
 * by assignInstructors.ts.
 *
 * Rules:
 * - The first NTO block starts on/after config.startDate — including
 *   a mid-week date (e.g. a Tuesday), in which case it lands in
 *   whichever Monday-starting grid week that date falls inside.
 * - Subsequent blocks are targeted config.frequencyMonths apart
 * - Each block is config.weeks consecutive weeks (DST-safe adjacency)
 * - Skips actual holiday/blocked weeks (these come from placeHolidays,
 *   not from other classes)
 * - Avoids overlapping a PREVIOUS NTO occurrence with a new one
 * - Places NTO for all provided locations
 */
export function placeNTO(
  existingSlots: ClassSlot[],
  weeks: WeekSlot[],
  locations: Location[],
  config: NTOPlacementConfig
): { slots: ClassSlot[]; usedWeeks: Set<number> } {

  const slots: ClassSlot[] = [...existingSlots];

  // Tracks weeks NTO itself has claimed, so back-to-back NTO occurrences
  // can't overlap each other. This deliberately does NOT include weeks
  // used by other (non-NTO) classes — NTO is allowed to run alongside
  // other courses.
  const usedWeeks = new Set<number>();

  const blockLength = Math.max(1, config?.weeks ?? 2);
  const frequencyMonths = Math.max(1, config?.frequencyMonths ?? 1);

  // Only consider unblocked weeks (actual holidays), sorted chronologically.
  const sortedWeeks = [...weeks]
    .filter(w => !w.blocked)
    .sort(
      (a, b) =>
        parseLocalDate(a.startDate).getTime() -
        parseLocalDate(b.startDate).getTime()
    );

  if (sortedWeeks.length === 0 || !config?.startDate) {
    console.warn(
      "placeNTO: No available weeks or no start date configured; skipping NTO generation."
    );
    return { slots, usedWeeks };
  }

  const scheduleYear =
    parseLocalDate(sortedWeeks[0].startDate).getFullYear();

  let targetDate = parseLocalDate(config.startDate);
  let occurrence = 0;

  // Walk forward by frequencyMonths from startDate for as long as we're
  // still inside the scheduled year, placing one NTO block per stop.
  while (targetDate.getFullYear() <= scheduleYear) {

    if (targetDate.getFullYear() === scheduleYear) {

      // This occurrence may use any starting week from targetDate up to
      // (but not including) the NEXT occurrence's target date.
      const windowEnd = addMonths(targetDate, frequencyMonths);

      // Match on the week's END date, not its start — the week grid is
      // always Monday-based, but startDate can legitimately be a
      // mid-week date (e.g. NTO starting on a Tuesday). Using startDate
      // here would skip the very week the target date falls inside,
      // since Monday < Tuesday, and jump straight to the following week.
      const searchStartIndex = sortedWeeks.findIndex(
        w =>
          parseLocalDate(w.endDate).getTime() >=
          targetDate.getTime()
      );

      let placed = false;
      let sawConsecutiveOption = false;

      if (searchStartIndex >= 0) {

        for (
          let idx = searchStartIndex;
          idx < sortedWeeks.length;
          idx++
        ) {

          const candidateStart =
            parseLocalDate(sortedWeeks[idx].startDate).getTime();

          if (candidateStart >= windowEnd.getTime()) {
            break;
          }

          const block = sortedWeeks.slice(
            idx,
            idx + blockLength
          );

          const isConsecutive =
            block.length === blockLength &&
            block.every((w, i) => {
              if (i === 0) return true;

              const diffDays =
                (parseLocalDate(w.startDate).getTime() -
                  parseLocalDate(block[i - 1].startDate).getTime()) /
                (1000 * 60 * 60 * 24);

              // DST-safe definition of "the immediately following week"
              return diffDays >= 6 && diffDays <= 8;
            });

          if (!isConsecutive) {
            continue;
          }

          sawConsecutiveOption = true;

          // Only check against OTHER NTO occurrences, not other classes.
          const overlapsExistingNTO =
            block.some(w => usedWeeks.has(w.weekNumber));

          if (overlapsExistingNTO) {
            continue;
          }

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

          placed = true;
          break;
        }
      }

      if (!placed) {
        if (searchStartIndex < 0) {
          console.warn(
            `placeNTO: No available (non-holiday) week on/after ${formatLocalDate(targetDate)} for occurrence ${occurrence + 1}.`
          );
        } else if (!sawConsecutiveOption) {
          console.warn(
            `placeNTO: Could not find ${blockLength} consecutive non-holiday weeks between ${formatLocalDate(targetDate)} and ${formatLocalDate(windowEnd)} (occurrence ${occurrence + 1}).`
          );
        } else {
          console.warn(
            `placeNTO: Every candidate week between ${formatLocalDate(targetDate)} and ${formatLocalDate(windowEnd)} overlaps a previous NTO occurrence; skipping occurrence ${occurrence + 1}.`
          );
        }
      }
    }

    occurrence++;
    targetDate = addMonths(targetDate, frequencyMonths);
  }

  return { slots, usedWeeks };
}