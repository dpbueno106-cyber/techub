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

if (
  slot.weekStartDate.startsWith("2027-02")
) {
  console.log(
    "FEB CHECK",
    {
      instructorId,
      weekNumber: slot.weekNumber,
      classStart: classWeekStart,
      classEnd: classWeekEnd,
      vacationStart,
      vacationEnd,
      overlaps
    }
  );
}
    console.log(
      "PTO CHECK",
      {
        instructorId,
        classStart: slot.weekStartDate,
        classEnd: slot.weekEndDate,
        vacationStart: timeOff.startDate,
        vacationEnd: timeOff.endDate,
        overlaps
      }
    );

    return overlaps;
    
  }
  
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

  instructors.forEach(i => {
    assignmentsByInstructor.set(i.id, []);
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
  });
  const avgAssignments =
    slots.length /
    Math.max(instructors.length, 1);

  return slots.map(slot => {
    // Preserve manual assignments
  if (
  slot.locked &&
  slot.instructorId &&
  !isInstructorAvailable(
    slot.instructorId,
    slot,
    instructorTimeOff
  )
)  {

  const available =
    isInstructorAvailable(
      slot.instructorId,
      slot,
      instructorTimeOff
    );

  if (!available) {

    console.warn(
      `Fixed course ${slot.className} removed from ${slot.instructorId} due to PTO`
    );

    slot = {
  ...slot,
  instructorId: null
};
  }

  return slot;
}

    // -------------------------
    // Normal eligibility pass
    // -------------------------

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
          assignedWeeks.length <
          (i.maxClasses ??
            Number.MAX_SAFE_INTEGER);



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

    // -------------------------
    // Fallback pass
    // Ignore consecutive-week limit
    // -------------------------

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
            assignedWeeks.length <
            (i.maxClasses ??
              Number.MAX_SAFE_INTEGER);

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

    // -------------------------
    // No candidate at all
    // -------------------------

    if (
      candidates.length === 0
    ) {
      console.warn(
        `No instructor available for ${slot.className} (week ${slot.weekNumber})`
      );

      return slot;
    }

    // -------------------------
    // Score candidates
    // -------------------------

    const scored =
      candidates.map(i => {
        const weeks =
          assignmentsByInstructor.get(
            i.id
          ) ?? [];

        return {
          instructor: i,
          score: scoreInstructor(
            i,
            slot,
            {
              recentWeeks:
                weeks,
              totalAssignments:
                weeks.length,
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
        assignmentsByInstructor.get(
          a.instructor.id
        )?.length ?? 0;

      const bAssignments =
        assignmentsByInstructor.get(
          b.instructor.id
        )?.length ?? 0;

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

    return {
      ...slot,
      instructorId: chosen.id
    };
  });
}