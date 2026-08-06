import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

export const SYDNEY_TZ = "Australia/Sydney";

// Converts a stored UTC Date (or ISO string) into the value expected by an
// <input type="datetime-local">, displayed in Sydney local time.
export function toSydneyInputValue(utcDate: Date | string): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  const zoned = toZonedTime(date, SYDNEY_TZ);
  return format(zoned, "yyyy-MM-dd'T'HH:mm", { timeZone: SYDNEY_TZ });
}

// Converts a <input type="datetime-local"> value (entered as Sydney local
// time, with no timezone info attached) back into a correct UTC Date for storage.
export function fromSydneyInputValue(localValue: string): Date {
  return fromZonedTime(localValue, SYDNEY_TZ);
}
