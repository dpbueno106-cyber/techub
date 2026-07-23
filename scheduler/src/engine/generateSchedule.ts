import type {
  ClassDefinition,
  ClassSlot,
  Instructor,
  GenerationConfig,
  WeekSlot,
  FixedPlacement,
  InstructorTimeOff
} from "../types";

import { balanceLocations } from "./balanceLocations";
import { buildWeeks } from "./buildWeeks";
import { placeNTO } from "./placeNTO";
import { classSlotGenerator } from "./classSlotGenerator";
import { assignInstructors } from "./assignInstructors";



export function generateSchedule(
  generationConfig: GenerationConfig,
  catalog: ClassDefinition[],
  instructors: Instructor[],
  fixedPlacements: FixedPlacement[] = [],
  instructorTimeOff: InstructorTimeOff[] = []
): ClassSlot[] {
  // 1. Build the configured calendar weeks.
  const weeks = buildWeeks(
    generationConfig.year
  );

  // 2. Convert imported fixed placements into schedule slots.
  let slots: ClassSlot[] =
    buildFixedPlacementSlots(
      fixedPlacements,
      catalog,
      instructors,
      weeks,
      generationConfig.year
    );

  console.log(
    "Valid fixed placements:",
    slots.length
  );

  // 3. Generate NTO courses around existing fixed placements.
  if (generationConfig.nto.enabled) {
    const ntoResult = placeNTO(
      slots,
      weeks,
      generationConfig.nto.locations
    );

    slots = ntoResult.slots;
  }

  /*
   * Count only generated NTO slots.
   *
   * Locked imported courses are additive and therefore do not
   * reduce the requested normal schedule size.
   */
  const generatedNTOCount =
    slots.filter(
      slot =>
        slot.category === "NTO" &&
        !slot.locked
    ).length;

  const reservedForNonNTO = Math.max(
    generationConfig.totalClasses -
      generatedNTOCount,
    0
  );

  // 4. Build weekly usage from fixed and generated NTO slots.
  const weekUsage =
    buildInitialWeekUsage(slots);

  console.log(
    "========== SCHEDULE GENERATION =========="
  );

  console.log(
    "Total classes configured:",
    generationConfig.totalClasses
  );

  console.log(
    "Imported fixed placements:",
    fixedPlacements.length
  );

  console.log(
    "Valid fixed slots:",
    slots.filter(slot => slot.locked).length
  );

  console.log(
    "Generated NTO slots:",
    generatedNTOCount
  );

  console.log(
    "Existing slots before non-NTO generation:",
    slots.length
  );

  console.log(
    "Requested non-NTO slots:",
    reservedForNonNTO
  );

  console.log(
    "Maximum classes per week:",
    generationConfig.maxClassesPerWeek
  );

  // 5. Generate normal classes around fixed placements and NTO.
  const nonNTOSlots = classSlotGenerator(
    weeks,
    catalog,
    reservedForNonNTO,
    weekUsage,
    generationConfig,
    slots
  );

  console.log(
    "Generated non-NTO slots:",
    nonNTOSlots.length
  );

  slots = [
    ...slots,
    ...nonNTOSlots
  ];

  console.log(
    "Slots before location balancing:",
    slots.length
  );

  console.log(
    "Slots by category:",
    slots.reduce(
      (summary, slot) => {
        summary[slot.category] =
          (
            summary[slot.category] ?? 0
          ) + 1;

        return summary;
      },
      {} as Record<string, number>
    )
  );

  // 6. Balance only unlocked locations.
  const balanced =
    balanceLocations(slots);

  // 7. Assign instructors while preserving locked assignments.
  const assigned =
  assignInstructors(
    balanced,
    instructors,
    generationConfig,
    instructorTimeOff
  );

  // 8. Sort the completed schedule.
  return assigned.sort(
    (first, second) => {
      if (
        first.weekNumber ===
        second.weekNumber
      ) {
        return first.location.localeCompare(
          second.location
        );
      }

      return (
        first.weekNumber -
        second.weekNumber
      );
    }
  );
}

function buildFixedPlacementSlots(
  fixedPlacements: FixedPlacement[],
  catalog: ClassDefinition[],
  instructors: Instructor[],
  weeks: WeekSlot[],
  configuredYear: number
): ClassSlot[] {
  const fixedSlots: ClassSlot[] = [];

  for (
    const placement of fixedPlacements
  ) {
    const normalizedClassName =
      normalizeText(
        placement.className
      );

    const course =
      catalog.find(
        catalogCourse =>
          normalizeText(
            catalogCourse.name
          ) === normalizedClassName
      );

    if (!course) {

  console.warn(
    "Course not found in catalog. Creating custom fixed course.",
    placement
  );

  const dateText =
    normalizeDateText(
      placement.weekStartDate
    );

  const weekIndex =
    weeks.findIndex(
      week =>
        normalizeDateText(
          week.startDate
        ) === dateText
    );

  if (weekIndex < 0) {
    continue;
  }

  const startWeek =
    weeks[weekIndex];

  const instructor =
    findInstructor(
      instructors,
      placement.instructorName
    );

  fixedSlots.push({
    classId:
      `custom-${Date.now()}-${weekIndex}`,

    className:
      placement.className,

    classAcronym:
      placement.classAcronym,

    courseNumber:
      placement.courseNumber,

    cohortNumber:
      placement.cohortNumber,

    displayCategory:
      placement.displayCategory,

    category:
      "Custom",

    location:
      (
        placement.location
          ?.toUpperCase?.() || "IN"
      ) as "IN" | "MI",

    instructorId:
      instructor?.id ?? null,

    weekNumber:
      startWeek.weekNumber,

    weekStartDate:
      startWeek.startDate,

    weekEndDate:
      startWeek.endDate,

    durationWeeks: 1,

    possibleInstructors: [],

    locked: true
  });

  continue;
}

    const dateText =
      normalizeDateText(
        placement.weekStartDate
      );

    if (!dateText) {
      console.warn(
        "Skipping fixed placement because the date is invalid:",
        placement
      );

      continue;
    }

    const placementYear =
      Number(dateText.slice(0, 4));

    if (
      placementYear !== configuredYear
    ) {
      console.warn(
        "Skipping fixed placement outside the configured year:",
        {
          configuredYear,
          placement
        }
      );

      continue;
    }

    /*
     * Use the exact WeekSlot produced by buildWeeks().
     * This avoids discrepancies between different week-number
     * algorithms.
     */
    const weekIndex =
      weeks.findIndex(
        week =>
          normalizeDateText(
            week.startDate
          ) === dateText
      );

    if (weekIndex < 0) {
      console.warn(
        "Skipping fixed placement because its start date does not match a schedule week:",
        placement
      );

      continue;
    }

    const startWeek =
      weeks[weekIndex];

    if (startWeek.blocked) {
      console.warn(
        "Skipping fixed placement because its week is blocked:",
        placement
      );

      continue;
    }

    const normalizedLocation =
      normalizeText(
        String(placement.location)
      ).toUpperCase();

    if (
      normalizedLocation !== "IN" &&
      normalizedLocation !== "MI"
    ) {
      console.warn(
        "Skipping fixed placement because its location is invalid:",
        placement
      );

      continue;
    }

    const location =
      normalizedLocation as
        ClassSlot["location"];

    const instructor =
      findInstructor(
        instructors,
        placement.instructorName
      );

    const durationWeeks = Math.max(
      1,
      course.durationWeeks ?? 1
    );

    const endingWeekIndex =
      weekIndex + durationWeeks - 1;

    const endingWeek =
      weeks[
        Math.min(
          endingWeekIndex,
          weeks.length - 1
        )
      ];

    fixedSlots.push({
  classId: course.id,
  className: course.name,

  classAcronym:
    placement.classAcronym,

  courseNumber:
    placement.courseNumber,

  cohortNumber:
    placement.cohortNumber,

  displayCategory:
    placement.displayCategory,

  category: course.category,

  location,

  instructorId:
    instructor?.id ?? null,

  weekNumber:
    startWeek.weekNumber,

  weekStartDate:
    startWeek.startDate,

  weekEndDate:
    endingWeek.endDate,

  durationWeeks,

  possibleInstructors:
    course.possibleInstructors,

  locked: true
});
  }

  return fixedSlots;
}

function buildInitialWeekUsage(
  slots: ClassSlot[]
): Map<number, number> {
  const weekUsage =
    new Map<number, number>();

  for (const slot of slots) {
    for (
      let offset = 0;
      offset < slot.durationWeeks;
      offset++
    ) {
      const coveredWeek =
        slot.weekNumber + offset;

      weekUsage.set(
        coveredWeek,
        (
          weekUsage.get(
            coveredWeek
          ) ?? 0
        ) + 1
      );
    }
  }

  return weekUsage;
}

function findInstructor(
  instructors: Instructor[],
  instructorName:
    | string
    | null
    | undefined
): Instructor | undefined {
  const normalizedInstructor =
    normalizeText(
      instructorName ?? ""
    );

  if (!normalizedInstructor) {
    return undefined;
  }

  return instructors.find(
    instructor =>
      normalizeText(
        instructor.id
      ) === normalizedInstructor ||
      normalizeText(
        getInstructorName(
          instructor
        )
      ) === normalizedInstructor
  );
}

function getInstructorName(
  instructor: Instructor
): string {
  /*
   * Some instructor types may only declare id while the
   * Firestore data also contains name. This safely supports both.
   */
  const instructorWithName =
    instructor as Instructor & {
      name?: string;
    };

  return (
    instructorWithName.name ??
    instructor.id
  );
}

function normalizeText(
  value: string
): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeDateText(
  value: string
): string | null {
  if (!value) {
    return null;
  }

  /*
   * Preserve ISO date strings without allowing timezone
   * conversion to move the date backward or forward.
   */
  const isoMatch =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (!isoMatch) {
    return null;
  }

  const normalized =
    `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const date =
    new Date(
      `${normalized}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return normalized;
}