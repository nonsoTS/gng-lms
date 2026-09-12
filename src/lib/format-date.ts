/**
 * Server-only date formatting with a fixed locale/timezone. Never format a
 * Date client-side in a component that's part of the initial SSR output —
 * the server's and the browser's Intl defaults can differ, and React
 * compares the two renders literally, so a mismatch there is a hydration
 * error. Format once here, pass the resulting string down as a prop.
 */
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatDateTime(date: Date): string {
  return `${DATE_TIME_FORMAT.format(date)} UTC`;
}

export function formatDate(date: Date): string {
  return DATE_FORMAT.format(date);
}
