import type {
  ClassDefinition,
  ClassSlot,
  Instructor,
  GenerationConfig
} from "../types";

import { balanceLocations } from "./balanceLocations";
import { buildWeeks } from "./buildWeeks";
import { placeNTO } from "./placeNTO";
import { classSlotGenerator } from "./classSlotGenerator";
import { assignInstructors } from "./assignInstructors";

export function generateSchedule(
  generationConfig: GenerationConfig,
  catalog: ClassDefinition[],
  instructors: Instructor[]
): ClassSlot[] {

  // 1. Build calendar weeks
  const weeks = buildWeeks(generationConfig.year);

  // 2. Initialize schedule state
  let slots: ClassSlot[] = [];
  

  // 3. Place NTO (additive, optional)
  if (generationConfig.nto.enabled) {
    const ntoResult = placeNTO(
      slots,
      weeks,
      generationConfig.nto.locations
    );

    slots = ntoResult.slots;
    
  }

  // 4. Determine remaining capacity
  const ntoCount = slots.length;
  const reservedForNonNTO = Math.max(
    generationConfig.totalClasses - ntoCount,
    0
  );

const weekUsage = new Map<number, number>();

slots.forEach(slot => {
  weekUsage.set(
    slot.weekNumber,
    (weekUsage.get(slot.weekNumber) ?? 0) + 1
  );
});
const nonNTOSlots = classSlotGenerator(
  weeks,
  catalog,
  reservedForNonNTO,
  weekUsage,
  generationConfig
);

  slots = [...slots, ...nonNTOSlots];

  // Debug visibility (keep this)
  console.log(
    "Slots by category:",
    slots.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  // 6. Balance locations
  const balanced = balanceLocations(slots);

  // 7. Assign instructors
  const assigned = assignInstructors(
  balanced,
  instructors,
  generationConfig
);
  // 8. Final sort
  return assigned.sort((a, b) =>
    a.weekNumber === b.weekNumber
      ? a.location.localeCompare(b.location)
      : a.weekNumber - b.weekNumber
  );
}