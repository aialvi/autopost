export function dateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isQuietHours(preferences: { quietHoursStart: string | null; quietHoursEnd: string | null; timezone: string }, now = new Date()): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd || preferences.quietHoursStart === preferences.quietHoursEnd) return false;
  const minutes = (time: string) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
  const current = minutes(new Intl.DateTimeFormat("en-GB", { timeZone: preferences.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now));
  const start = minutes(preferences.quietHoursStart);
  const end = minutes(preferences.quietHoursEnd);
  return start < end ? current >= start && current < end : current >= start || current < end;
}
