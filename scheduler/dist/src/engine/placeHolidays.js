"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeHolidays = placeHolidays;
function placeHolidays(weeks, holidays) {
    return weeks.map(week => {
        const start = new Date(week.startDate);
        const end = new Date(week.endDate);
        const overlaps = holidays.some(h => {
            const d = new Date(h);
            return d >= start && d <= end;
        });
        return { ...week, blocked: overlaps };
    });
}
