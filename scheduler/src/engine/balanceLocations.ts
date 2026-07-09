import type { ClassSlot, Location } from "../types";

export function balanceLocations(
  slots: ClassSlot[]
): ClassSlot[] {

  let inCount = 0;
  let miCount = 0;

  return slots.map(slot => {

    if (
      slot.locked ||
      slot.classId === "NTO"
    ) {

      if (slot.location === "IN") {
        inCount++;
      } else {
        miCount++;
      }

      return slot;
    }

    const newLocation: Location =
      inCount <= miCount
        ? "IN"
        : "MI";

    if (newLocation === "IN") {
      inCount++;
    } else {
      miCount++;
    }

    return {
      ...slot,
      location: newLocation
    };
  });
}