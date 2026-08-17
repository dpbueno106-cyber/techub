"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreInstructor = scoreInstructor;
function scoreInstructor(instructor, slot, context) {
    let score = 0;
    // Travel penalty
    if (slot.location !== instructor.homeLocation) {
        score += 5;
    }
    // Recency penalties
    if (context.recentWeeks.includes(slot.weekNumber - 1)) {
        score += 4;
    }
    else if (context.recentWeeks.includes(slot.weekNumber - 2)) {
        score += 2;
    }
    // Workload balance — relative to each instructor's own cap, not a flat
    // average, so instructors with different maxClasses values still get
    // filled evenly relative to their own capacity.
    const cap = instructor.maxClasses ?? context.averageAssignments;
    const fillRatio = cap > 0
        ? context.totalAssignments / cap
        : 1;
    // Strongly prefer instructors who haven't been used yet at all, so
    // everyone who is eligible gets at least one class before anyone
    // gets a second.
    if (context.totalAssignments === 0) {
        score -= 6;
    }
    // Otherwise scale by how "full" the instructor already is relative
    // to their own cap.
    score += Math.round(fillRatio * 5);
    // Category bias
    if (slot.category === "NTO")
        score -= 2;
    if (slot.category === "Advanced")
        score += 2;
    return score;
}
