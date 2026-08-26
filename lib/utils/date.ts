/**
 * Safe Date Parser Helper
 * Converts any date value (string, number, Date, Firestore Timestamp) to a valid Date object.
 * Returns fallback new Date() if the value is null/undefined/invalid to prevent RangeError: Invalid time value.
 */
export const safeParseDate = (dateVal: any): Date => {
  if (dateVal === null || dateVal === undefined) return new Date();

  // If already a valid Date instance
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? new Date() : dateVal;
  }

  // Handle Firestore Timestamp object (seconds / nanoseconds or _seconds)
  if (typeof dateVal === "object") {
    if (typeof dateVal.toDate === "function") {
      try {
        const d = dateVal.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch (e) {
        // ignore
      }
    }
    if ("seconds" in dateVal && typeof dateVal.seconds === "number") {
      return new Date(dateVal.seconds * 1000);
    }
    if ("_seconds" in dateVal && typeof dateVal._seconds === "number") {
      return new Date(dateVal._seconds * 1000);
    }
  }

  // Handle numbers (epoch timestamps in ms or sec)
  if (typeof dateVal === "number") {
    if (isNaN(dateVal)) return new Date();
    const timestamp = dateVal < 1e11 ? dateVal * 1000 : dateVal;
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // Handle string
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") return new Date();
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const fallback = new Date(dateVal);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

/**
 * Safe ISO string formatter
 */
export const safeFormatISO = (dateVal: any): string => {
  return safeParseDate(dateVal).toISOString();
};

/**
  * Calculates Monday 00:00:00.000 to Sunday 23:59:59.999 of current week
  */
export function getThisWeekDateRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Minggu, 1 = Senin, 2 = Selasa, ...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { startOfWeek: monday, endOfWeek: sunday };
}

/**
 * Formats date object to readable Indonesian date string
 */
export function formatIndonesianDate(dateInput: Date | string): string {
  if (!dateInput) return "-";
  const dateObj = safeParseDate(dateInput);

  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
