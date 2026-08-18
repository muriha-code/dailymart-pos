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
  const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return String(dateInput);

  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
