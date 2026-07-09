"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceLocations = balanceLocations;
function balanceLocations(slots) {
    let inCount = 0;
    let miCount = 0;
    return slots.map(slot => {
        if (slot.locked ||
            slot.classId === "NTO") {
            if (slot.location === "IN") {
                inCount++;
            }
            else {
                miCount++;
            }
            return slot;
        }
        const newLocation = inCount <= miCount
            ? "IN"
            : "MI";
        if (newLocation === "IN") {
            inCount++;
        }
        else {
            miCount++;
        }
        return {
            ...slot,
            location: newLocation
        };
    });
}
