import { generateSchedule } from "./engine/generateSchedule";
import { config, catalog, instructors } from "./data";

const schedule = generateSchedule(config, catalog, instructors);

const instructorById = new Map(instructors.map(i => [i.id, i.name]));
const formattedSchedule = schedule.map(slot => ({
  week: slot.weekNumber,
  classId: slot.classId,
  className: slot.className,
  location: slot.location,
  instructorId: slot.instructorId,
  instructorName: slot.instructorId
    ? instructorById.get(slot.instructorId) ?? slot.instructorId
    : "TBD",
  durationWeeks: slot.durationWeeks,
  category: slot.category,
  level: slot.level
}));

console.table(formattedSchedule);

