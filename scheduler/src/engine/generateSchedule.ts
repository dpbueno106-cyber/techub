import type {
  ScheduleConfig,
  ClassDefinition,
  ClassSlot,
  Instructor
} from "../types";

import { balanceLocations } from "./balanceLocations";
import { buildWeeks } from "./buildWeeks";
import { placeHolidays } from "./placeHolidays";
import { placeNTO } from "./placeNTO";
import { classSlotGenerator } from "./classSlotGenerator";
import { assignInstructors } from "./assignInstructors";

export function generateSchedule(
  config: ScheduleConfig,
  catalog: ClassDefinition[],
  instructors: Instructor[]
): ClassSlot[] {

  // 1. Build calendar weeks
  let weeks = buildWeeks(config.year);
  weeks = placeHolidays(weeks, config.holidays);

  // 2. Start with empty schedule
  let slots: ClassSlot[] = [];

  // 3. Place NTO (additive)
  const ntoResult = placeNTO(
    slots,
    weeks,
    ["IN", "MI"]
  );

  slots = ntoResult.slots;
  const usedWeeks = ntoResult.usedWeeks;
const ntoCount = slots.length;
const reservedForNonNTO = Math.max(
  config.totalClasses - ntoCount,
  0
);
  // 4. Generate remaining classes
  const remainingSlots = classSlotGenerator(
  weeks,
  catalog,
  usedWeeks,
  reservedForNonNTO
);
  slots = [...slots, ...remainingSlots];

  //  Debug visibility (safe to keep)
  console.log(
    "Slots by category:",
    slots.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  // 5. Balance locations
  const balanced = balanceLocations(slots);

  // 6. Assign instructors
  const assigned = assignInstructors(balanced, instructors);

  // 7. Final sort
  return assigned.sort((a, b) =>
    a.weekNumber === b.weekNumber
      ? a.location.localeCompare(b.location)
      : a.weekNumber - b.weekNumber
  );
}