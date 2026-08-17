import type { ClassSlot, Instructor, InstructorTimeOff } from "../types";
import { scoreInstructor } from "./scoreInstructor";

function exceedsConsecutiveLimit(
  assignedWeeks: number[],
  nextWeek: number,
  maxConsecutive: number
): boolean {
  const weeks = new Set(assignedWeeks);
  weeks.add(nextWeek);

  let streak = 1;

  // check backward
  for (let w = nextWeek - 1; weeks.has(w); w--) {
    streak++;
  }

  // check forward
  for (let w = nextWeek + 1; weeks.has(w); w++) {
    streak++;
  }

  return streak > maxConsecutive;
}
function getCoveredWeeks(
  slot: ClassSlot
): number[] {
  return Array.from(
    { length: slot.durationWeeks },
    (_, index) =>
      slot.weekNumber + index
  );
}

function isInstructorAvailable(
  instructorId: string,
  slot: ClassSlot,
  instructorTimeOff: InstructorTimeOff[]
): boolean {

  const classWeekStart =
  new Date(slot.weekStartDate);

const classWeekEnd =
  new Date(classWeekStart);

classWeekEnd.setDate(
  classWeekEnd.getDate() + 6
);


  return !instructorTimeOff.some(
  timeOff => {

    if (
  timeOff.instructorId !== instructorId
) {
  return false;
}

    const vacationStart =
      new Date(timeOff.startDate);

    const vacationEnd =
      new Date(timeOff.endDate);

    const overlaps =
      classWeekStart <= vacationStart && vacationEnd <= classWeekEnd ||
      classWeekStart <= vacationStart && ((classWeekEnd <= vacationEnd) && classWeekEnd >= vacationStart) ||
      classWeekStart <= vacationEnd && vacationStart <= classWeekEnd ||
      vacationStart <= classWeekStart && classWeekEnd <= vacationEnd;

    return overlaps;

  }

);
  
}


/**
 * maxClasses is a hard cap: an instructor can never be assigned (or keep
 * a non-locked assignment) that would put their total distinct class
 * count at or above their configured maximum. This is tracked separately
 * from `assignmentsByInstructor` (which tracks *weeks*, for consecutive-
 * week and conflict checks) because a single multi-week class should
 * only ever count as ONE class against the cap.
 */
function wouldExceedMaxClasses(
  instructorId: string,
  instructors: Instructor[],
  assignmentsCountByInstructor: Map<string, number>
): boolean {
  const instructor = instructors.find(
    i => i.id === instructorId
  );

  if (!instructor || instructor.maxClasses == null) {
    return false;
  }

  const currentCount =
    assignmentsCountByInstructor.get(
      instructorId
    ) ?? 0;

  return currentCount >= instructor.maxClasses;
}

function isStillValidAssignment(
  instructorId: string,
  slot: ClassSlot,
  assignmentsByInstructor: Map<string, number[]>,
  generationConfig: {
    maxConsecutiveWeeks: number;
  },
  instructorTimeOff: InstructorTimeOff[],
  instructors: Instructor[],
  assignmentsCountByInstructor: Map<string, number>
): boolean {

  const assignedWeeks =
    assignmentsByInstructor.get(
      instructorId
    ) ?? [];

  const coveredWeeks =
    getCoveredWeeks(slot);

  const available =
    isInstructorAvailable(
      instructorId,
      slot,
      instructorTimeOff
    );

  const hasConflict =
    coveredWeeks.some(
      week =>
        assignedWeeks.includes(week)
    );

  const wouldExceed =
    coveredWeeks.some(
      week =>
        exceedsConsecutiveLimit(
          assignedWeeks,
          week,
          generationConfig.maxConsecutiveWeeks
        )
    );

  const overCap =
    wouldExceedMaxClasses(
      instructorId,
      instructors,
      assignmentsCountByInstructor
    );

  return (
    available &&
    !hasConflict &&
    !wouldExceed &&
    !overCap
  );
}
export function assignInstructors(
  slots: ClassSlot[],
  instructors: Instructor[],
  generationConfig: {
    maxConsecutiveWeeks: number;
  },
  instructorTimeOff: InstructorTimeOff[] = []
): ClassSlot[] {
  console.log(
  "INSTRUCTOR PTO:",
  instructorTimeOff
);
  const assignmentsByInstructor = new Map<
    string,
    number[]
  >();

  // Distinct class counts per instructor, used solely for the maxClasses
  // hard cap — a multi-week class counts once, not once per week.
  const assignmentsCountByInstructor = new Map<
    string,
    number
  >();

  instructors.forEach(i => {
    assignmentsByInstructor.set(i.id, []);
    assignmentsCountByInstructor.set(i.id, 0);
  });
  // Seed instructor usage with locked assignments
  slots.forEach(slot => {
    if (!slot.locked || !slot.instructorId) {
      return;
    }

    const coveredWeeks =
      getCoveredWeeks(slot);

    const current =
      assignmentsByInstructor.get(
        slot.instructorId
      ) ?? [];

    current.push(...coveredWeeks);

    assignmentsByInstructor.set(
      slot.instructorId,
      current
    );

    assignmentsCountByInstructor.set(
      slot.instructorId,
      (
        assignmentsCountByInstructor.get(
          slot.instructorId
        ) ?? 0
      ) + 1
    );
  });
  const avgAssignments =
    slots.length /
    Math.max(instructors.length, 1);
console.log(
  "Preassigned",
  slots.filter(
    s => s.instructorId && !s.locked
  ).length
);
  return slots.map(slot => {
   // Preserve locked assignments
if (
  slot.locked &&
  slot.instructorId
) {

  const available =
    isInstructorAvailable(
      slot.instructorId,
      slot,
      instructorTimeOff
    );

  if (available) {
    return slot;
  }

  console.warn(
    `Fixed course ${slot.className} removed from ${slot.instructorId} due to PTO`
  );

  slot = {
    ...slot,
    instructorId: null
  };
}
    // Preserve generator-selected instructor
// Preserve generator-selected instructor
if (
  !slot.locked &&
  slot.instructorId
) {

  const valid =
    isStillValidAssignment(
      slot.instructorId,
      slot,
      assignmentsByInstructor,
      generationConfig,
      instructorTimeOff,
      instructors,
      assignmentsCountByInstructor
    );

  if (valid) {

    const coveredWeeks =
      getCoveredWeeks(slot);

    assignmentsByInstructor
      .get(slot.instructorId)
      ?.push(...coveredWeeks);

    assignmentsCountByInstructor.set(
      slot.instructorId,
      (
        assignmentsCountByInstructor.get(
          slot.instructorId
        ) ?? 0
      ) + 1
    );

    return slot;
  }

  console.warn(
    `Generator-selected instructor ${slot.instructorId}
     became invalid for ${slot.className}`
  );

  slot = {
    ...slot,
    instructorId: null
  };
}
    // Normal eligibility pass
    

    const eligible =
      instructors.filter(i => {
        const normalizedClass =
          slot.className
            .trim()
            .toLowerCase();

        const canTeach =
          (i.capabilities ?? []).some(
            cap =>
              cap.trim().toLowerCase() ===
              normalizedClass
          );

        const isPossibleInstructor =
          !slot.possibleInstructors
            ?.length ||
          slot.possibleInstructors.includes(
            i.id
          );

        const canBeThere =
          slot.location ===
          i.homeLocation ||
          i.canTravel;

        const assignedWeeks =
          assignmentsByInstructor.get(
            i.id
          ) ?? [];

        const coveredWeeks =
          getCoveredWeeks(slot);

        const available =
          isInstructorAvailable(
            i.id,
            slot,
            instructorTimeOff
          );

        const hasConflict =
          coveredWeeks.some(
            week =>
              assignedWeeks.includes(
                week
              )
          );

        const wouldExceed =
          coveredWeeks.some(
            week =>
              exceedsConsecutiveLimit(
                assignedWeeks,
                week,
                generationConfig.maxConsecutiveWeeks ??
                2
              )
          );

        const underMaxClasses =
          !wouldExceedMaxClasses(
            i.id,
            instructors,
            assignmentsCountByInstructor
          );



        return (
          isPossibleInstructor &&
          canTeach &&
          canBeThere &&
          !hasConflict &&
          !wouldExceed &&
          available &&
          underMaxClasses
        );

      });

    let candidates = eligible;

    
    // Fallback pass
    // Ignore consecutive-week limit
    

    if (candidates.length === 0) {
      console.warn(
        `No fully eligible instructor for ${slot.className}. Trying fallback assignment.`
      );

      candidates =
        instructors.filter(i => {
          const normalizedClass =
            slot.className
              .trim()
              .toLowerCase();

          const canTeach =
            (
              i.capabilities ?? []
            ).some(
              cap =>
                cap
                  .trim()
                  .toLowerCase() ===
                normalizedClass
            );

          const isPossibleInstructor =
            !slot
              .possibleInstructors
              ?.length ||
            slot.possibleInstructors.includes(
              i.id
            );

          const canBeThere =
            slot.location ===
            i.homeLocation ||
            i.canTravel;

          const assignedWeeks =
            assignmentsByInstructor.get(
              i.id
            ) ?? [];

          const coveredWeeks =
            getCoveredWeeks(slot);
          const available =
            isInstructorAvailable(
              i.id,
              slot,
              instructorTimeOff
            );
          const hasConflict =
            coveredWeeks.some(
              week =>
                assignedWeeks.includes(
                  week
                )
            );

          const underMaxClasses =
            !wouldExceedMaxClasses(
              i.id,
              instructors,
              assignmentsCountByInstructor
            );

          return (
            isPossibleInstructor &&
            canTeach &&
            canBeThere &&
            !hasConflict &&
            available &&
            underMaxClasses
          );
        });
    }

   
    // No candidate at all
    

    if (
      candidates.length === 0
    ) {
      console.warn(
        `No instructor available for ${slot.className} (week ${slot.weekNumber})`
      );

      return slot;
    }

    
    // Score candidates
    

    const scored =
      candidates.map(i => {
        const weeks =
          assignmentsByInstructor.get(
            i.id
          ) ?? [];

        const classCount =
          assignmentsCountByInstructor.get(
            i.id
          ) ?? 0;

        return {
          instructor: i,
          score: scoreInstructor(
            i,
            slot,
            {
              recentWeeks:
                weeks,
              totalAssignments:
                classCount,
              averageAssignments:
                avgAssignments
            }
          )
        };
      });

    scored.sort((a, b) => {
      const scoreDiff =
        a.score - b.score;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const aAssignments =
        assignmentsCountByInstructor.get(
          a.instructor.id
        ) ?? 0;

      const bAssignments =
        assignmentsCountByInstructor.get(
          b.instructor.id
        ) ?? 0;

      return (
        aAssignments -
        bAssignments
      );
    });

    const chosen =
      scored[0].instructor;

    const coveredWeeks =
      getCoveredWeeks(slot);

    assignmentsByInstructor
      .get(chosen.id)
      ?.push(...coveredWeeks);

    assignmentsCountByInstructor.set(
      chosen.id,
      (
        assignmentsCountByInstructor.get(
          chosen.id
        ) ?? 0
      ) + 1
    );

    return {
      ...slot,
      instructorId: chosen.id
    };
  });
}