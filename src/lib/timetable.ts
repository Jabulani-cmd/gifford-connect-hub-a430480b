export const timetableDayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const timetableShortDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function normalizeTimetableTime(time: string | null | undefined) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function timetableUsesZeroBasedDays(entries: Array<{ day_of_week?: number | null }> = []) {
  if (entries.some((entry) => entry?.day_of_week === 0)) return true;
  if (entries.some((entry) => entry?.day_of_week === 5)) return false;
  return true;
}

export function timetableDayMatches(entryDay: number | null | undefined, dayIndex: number, zeroBased: boolean) {
  if (entryDay === null || entryDay === undefined) return false;
  return zeroBased ? entryDay === dayIndex : entryDay === dayIndex + 1;
}

export function timetableDayLabel(entryDay: number | null | undefined, zeroBased: boolean) {
  if (entryDay === null || entryDay === undefined) return "Day —";
  const index = zeroBased ? entryDay : entryDay - 1;
  return timetableDayLabels[index] || `Day ${entryDay}`;
}