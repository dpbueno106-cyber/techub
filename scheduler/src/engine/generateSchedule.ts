import type { ScheduleConfig, ClassDefinition, ClassSlot, Instructor } from "../types";
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

  let weeks = buildWeeks(config.year);
  weeks = placeHolidays(weeks, config.holidays);

  const { slots: ntoSl  , usedWeeks } =
    placeNTO(weeks, ["IN", "MI"]);

  const otherSl   = classSlotGenerator(
    weeks,
    catalog,
    usedWeeks,
    config.totalClasses - ntoSl  .length
  );

  const allSl   = [...ntoSl  , ...otherSl  ];

  // Balance IN vs MI
  const balanced = balanceLocations(allSl  );

  const assigned = assignInstructors(balanced, instructors);

  return assigned.sort((a, b) =>
    a.weekNumber === b.weekNumber
      ? a.location.localeCompare(b.location)
      : a.weekNumber - b.weekNumber
  );
}


