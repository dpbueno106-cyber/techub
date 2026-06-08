import { ScheduleConfig, ClassDefinition, ClassSlot } from "../types";
import { buildWeeks } from "./buildWeeks";
import { placeHolidays } from "./placeHolidays";
import { placeNTO } from "./placeNTO";
import { classSlotGenerator } from "./classSlotGenerator";

export function generateSchedule(
  config: ScheduleConfig,
  catalog: ClassDefinition[]
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

  return [...ntoSlots, ...otherSlots];
}
