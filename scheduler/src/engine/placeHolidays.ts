import type { WeekSlot } from "../types.ts";

export function placeHolidays(
  weeks: WeekSlot[],
  holidays: string[]
): WeekSlot[] {
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
