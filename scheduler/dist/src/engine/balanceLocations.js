"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceLocations = balanceLocations;
function balanceLocations(slots) {
    let inCount = 0;
    let miCount = 0;
    return slots.map(slot => {
        if (slot.classId === "NTO") {
            if (slot.location === "IN")
                inCount++;
            else
                miCount++;
            return slot;
        }
        let newLocation;
        if (inCount <= miCount) {
            newLocation = "IN";
            inCount++;
        }
        else {
            newLocation = "MI";
            miCount++;
        }
        return {
            ...slot,
            location: newLocation
        };
    });
}
