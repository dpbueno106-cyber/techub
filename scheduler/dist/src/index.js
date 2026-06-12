"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generateSchedule_1 = require("./engine/generateSchedule");
const data_1 = require("./data");
const schedule = (0, generateSchedule_1.generateSchedule)(data_1.config, data_1.catalog, data_1.instructors);
const instructorById = new Map(data_1.instructors.map(i => [i.id, i.name]));
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
