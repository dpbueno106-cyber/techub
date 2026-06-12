import type { WeekSlot } from "../types";

export function buildWeeks(year: number): WeekSlot[] {
  const weeks: WeekSlot[] = [];
  let date = new Date(`${year}-01-01`);

  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }

  let weekNumber = 1;

  while (date.getFullYear() === year) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(start.getDate() + 4);

    weeks.push({
      weekNumber,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      blocked: false
    });

    date.setDate(date.getDate() + 7);
    weekNumber++;
  }

  return weeks;
}
