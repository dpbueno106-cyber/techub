import type { ScheduleConfig, ClassDefinition, ClassSlot, Instructor } from "../types.ts";
import { balanceLocations } from "./balanceLocations.ts";
import { buildWeeks } from "./buildWeeks.ts";
import { placeHolidays } from "./placeHolidays.ts";
import { placeNTO } from "./placeNTO.ts";
import { classSlotGenerator } from "./classSlotGenerator.ts";
import { assignInstructors } from "./assignInstructors.ts";

export function generateSchedule(
  config: ScheduleConfig,
  catalog: ClassDefinition[],
  instructors: Instructor[]
): ClassSlot[] {

  let weeks = buildWeeks(config.year);
  weeks = placeHolidays(weeks, config.holidays);

  const { slots: ntoSlots, usedWeeks } =
    placeNTO(weeks, ["IN", "MI"]);

  const otherSlots = classSlotGenerator(
    weeks,
    catalog,
    usedWeeks,
    config.totalClasses - ntoSlots.length
  );

  const allSlots = [...ntoSlots, ...otherSlots];

  // Balance IN vs MI
  const balanced = balanceLocations(allSlots);

  const assigned = assignInstructors(balanced, instructors);

  return assigned.sort((a, b) =>
    a.weekNumber === b.weekNumber
      ? a.location.localeCompare(b.location)
      : a.weekNumber - b.weekNumber
  );
}


