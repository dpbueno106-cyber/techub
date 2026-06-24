import type { WeekSlot, ClassSlot, Location } from "../types";

/**
 * Injects NTO (New Technician Orientation) slots into an existing schedule.
 * NTO is additive: it does NOT replace existing slots.
 *
 * Rules:
 * - One 2-week NTO per month
 * - Week 1 must start in the month
 * - Week 2 must be the immediately following week (may cross month boundary)
 * - Reserves both weeks so other classes do not overlap
 * - Places NTO for all provided locations
 */
export function placeNTO(
  existingSlots: ClassSlot[],
  weeks: WeekSlot[],
  locations: Location[]
): { slots: ClassSlot[]; usedWeeks: Set<number> } {

  const slots: ClassSlot[] = [...existingSlots];
  const usedWeeks = new Set<number>();

  // Reserve weeks already occupied
  for (const slot of existingSlots) {
    for (let i = 0; i < slot.durationWeeks; i++) {
      usedWeeks.add(slot.weekNumber + i);
    }
  }

  const availableWeeks = weeks.filter(w => !w.blocked);

  for (let month = 0; month < 12; month++) {
    const monthWeeks = availableWeeks.filter(
      w => new Date(w.startDate).getMonth() === month
    );

    let placedForMonth = false;

    for (const week1 of monthWeeks) {
      const week2 = availableWeeks.find(w => {
  const d1 = new Date(week1.startDate);
  const d2 = new Date(w.startDate);

  const diffMs = d2.getTime() - d1.getTime();
const diffDays = diffMs / (1000 * 60 * 60 * 24);

// Accept 6–8 days as “one week”
return diffDays >= 6 && diffDays <= 8;
});

      if (!week2) continue;

      const alreadyUsed =
        usedWeeks.has(week1.weekNumber) ||
        usedWeeks.has(week2.weekNumber);

      if (alreadyUsed) continue;

      //  Place NTO for each location
      for (const location of locations) {
        slots.push({
          classId: "NTO",
          className: "New Technician Orientation",
          category: "NTO",
          location,
          weekNumber: week1.weekNumber,
          weekStartDate: week1.startDate,
          weekEndDate: week2.endDate,
          durationWeeks: 2,
          instructorId: null
        });
      }

      // Reserve both weeks
      usedWeeks.add(week1.weekNumber);
      usedWeeks.add(week2.weekNumber);

      placedForMonth = true;
      break;
    }

    if (!placedForMonth) {
      console.warn(
        `placeNTO: Could not place NTO for month ${month + 1}`
      );
    }
  }

  return { slots, usedWeeks };
}