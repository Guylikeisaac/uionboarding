/**
 * Compact relative timestamps for feed/comment rows ("Just now", "5m ago",
 * "3h ago", "2d ago", then "12 Jun" past a week).
 */
const kMonthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Relative label for an ISO-8601 timestamp; empty string when unparseable. */
export function relativeTimeFromIso(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return relativeTime(new Date(t));
}

export function relativeTime(dt: Date): string {
  const diffMs = Date.now() - dt.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${dt.getDate()} ${kMonthShort[dt.getMonth()]}`;
}

export const monthShortNames = kMonthShort;
