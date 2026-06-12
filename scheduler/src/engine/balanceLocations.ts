import type { ClassSlot, Location } from "../types";

export function balanceLocations(slots: ClassSlot[]): ClassSlot[] {

  let inCount = 0;
  let miCount = 0;

  return slots.map(slot => {

    if (slot.classId === "NTO") {
      if (slot.location === "IN") inCount++;
      else miCount++;
      return slot;
    }

    let newLocation: Location;

    if (inCount <= miCount) {
      newLocation = "IN";
      inCount++;
    } else {
      newLocation = "MI";
      miCount++;
    }

    return {
      ...slot,
      location: newLocation
    };
  });
}