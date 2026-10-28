import dayjs from "dayjs";
import type { ScheduleSlot } from "../schema/attendance";

/**
 * ISO weekday: 1=Mon … 7=Sun (from JS getDay() which is 0=Sun … 6=Sat).
 */
export function isoWeekday(d: Date): number {
  const jsDay = d.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Whether the given date falls on a training day per the schedule.
 */
export function isTrainingDay(schedule: ScheduleSlot[], d: Date): boolean {
  const wd = isoWeekday(d);
  return schedule.some((slot) => slot.weekday === wd);
}

/**
 * Format a local Date as "YYYY-MM-DD" for API calls (no UTC shift).
 */
export function toApiDate(d: Date): string {
  return dayjs(d).format("YYYY-MM-DD");
}

/**
 * Parse an API date string "YYYY-MM-DD" into a local midnight Date.
 */
export function parseApiDate(s: string): Date {
  return dayjs(s).toDate();
}

/**
 * Monday of the week containing d.
 */
export function mondayOf(d: Date): Date {
  const wd = isoWeekday(d);
  return dayjs(d)
    .subtract(wd - 1, "day")
    .startOf("day")
    .toDate();
}

/**
 * Default date for the day view: today if it is a training day,
 * otherwise walk back up to 90 days to the most recent training day.
 * If none found, return today.
 */
export function defaultDate(schedule: ScheduleSlot[], today: Date): Date {
  if (isTrainingDay(schedule, today)) {
    return today;
  }
  for (let i = 1; i <= 90; i++) {
    const candidate = dayjs(today).subtract(i, "day").toDate();
    if (isTrainingDay(schedule, candidate)) {
      return candidate;
    }
  }
  return today;
}

/**
 * Czech day label: "pondělí 20. 10. 2026".
 */
export function fmtDayLabel(d: Date): string {
  return dayjs(d).locale("cs").format("dddd D. M. YYYY");
}
