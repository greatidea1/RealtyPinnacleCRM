/** Indian Standard Time — hardcoded default timezone for the app. */
export const APP_TIMEZONE = 'Asia/Kolkata' as const;

/** Locale used with IST date/time formatting. */
export const APP_LOCALE = 'en-IN' as const;

/**
 * Formats a date/time in Indian Standard Time.
 * @param date - Date value to format
 * @param options - Intl date formatting options (timeZone is always IST)
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  return new Date(date).toLocaleDateString(APP_LOCALE, {
    ...options,
    timeZone: APP_TIMEZONE,
  });
}
// End formatDate

/**
 * Formats a date with weekday in Indian Standard Time.
 * @param date - Date value to format
 */
export function formatDateLong(date: Date | string | number): string {
  return formatDate(date, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
// End formatDateLong

/**
 * Returns today's calendar date as YYYY-MM-DD in IST.
 */
export function todayISODate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
// End todayISODate

/**
 * Returns the current hour (0–23) in Indian Standard Time.
 */
export function getHoursIST(date: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour);
}
// End getHoursIST

/**
 * Start of the current calendar day in IST (as a UTC Date instant).
 */
export function startOfTodayIST(): Date {
  return new Date(`${todayISODate()}T00:00:00+05:30`);
}
// End startOfTodayIST

/**
 * End of the current calendar day in IST (as a UTC Date instant).
 */
export function endOfTodayIST(): Date {
  return new Date(`${todayISODate()}T23:59:59.999+05:30`);
}
// End endOfTodayIST

/**
 * Calendar day (YYYY-MM-DD) for a given instant in IST.
 * @param date - Instant to convert
 */
export function toISTDateString(date: Date | string | number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}
// End toISTDateString

/**
 * True when `dueDate` is before the start of today in IST.
 * @param dueDate - Due date to compare
 */
export function isOverdueIST(dueDate: Date | string | number): boolean {
  return new Date(dueDate).getTime() < startOfTodayIST().getTime();
}
// End isOverdueIST
