import type { Instructor, ClassSlot } from "../types";

type AssignmentContext = {
  recentWeeks: number[];
  totalAssignments: number;
  averageAssignments: number;
};

export function scoreInstructor(
  instructor: Instructor,
  slot: ClassSlot,
  context: AssignmentContext
): number {
  let score = 0;

  // Travel penalty
  if (slot.location !== instructor.homeLocation) {
    score += 5;
  }

  // Recency penalties
  if (context.recentWeeks.includes(slot.weekNumber - 1)) {
    score += 4;
  } else if (context.recentWeeks.includes(slot.weekNumber - 2)) {
    score += 2;
  }

  // Workload balance
  if (context.totalAssignments > context.averageAssignments) {
    score += 3;
  } else if (context.totalAssignments < context.averageAssignments) {
    score -= 2;
  }

  // Category bias
  if (slot.category === "NTO") score -= 2;
  if (slot.category === "Advanced") score += 2;

  return score;
}