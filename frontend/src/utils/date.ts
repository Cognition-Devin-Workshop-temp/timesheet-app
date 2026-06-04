/**
 * Timezone-safe date utilities.
 *
 * `new Date("YYYY-MM-DD")` is parsed as UTC midnight per the ECMAScript spec,
 * which causes off-by-one errors in timezones west of UTC. These helpers parse
 * and format date-only strings using local time components instead.
 */

/**
 * Parse a date value (YYYY-MM-DD string or UTC-midnight timestamp) into a
 * local-time Date. Handles both API response formats safely.
 */
export function parseLocalDate(dateVal: string | number): Date {
  if (typeof dateVal === 'number' || /^\d+$/.test(dateVal)) {
    // Timestamp (ms since epoch) representing UTC midnight — extract UTC components
    const d = new Date(typeof dateVal === 'number' ? dateVal : Number(dateVal));
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  // "YYYY-MM-DD" string
  const [year, month, day] = dateVal.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Format a Date to "YYYY-MM-DD" using local date components. */
export function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
