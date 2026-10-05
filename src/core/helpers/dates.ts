const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/**
 * Dart `DateTime.toIso8601String()` for a LOCAL DateTime:
 * `2024-06-01T00:00:00.000` — no zone suffix. The backend contracts were
 * built against this exact shape, so payloads keep it.
 */
export function dartLocalIso(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  );
}

/** UTC midnight of the SAME calendar Y/M/D, `Z`-suffixed. */
export function utcMidnightIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00.000Z`;
}

/** `DateTime.tryParse` equivalent; undefined when unparseable. */
export function tryParseDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (!s) return undefined;
  // Zone-less ISO strings are local time in Dart; JS treats date-only as UTC.
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/.exec(s);
  if (m) {
    return new Date(
      +m[1],
      +m[2] - 1,
      +m[3],
      m[4] ? +m[4] : 0,
      m[5] ? +m[5] : 0,
      m[6] ? +m[6] : 0,
      m[7] ? Math.round(+`0.${m[7]}` * 1000) : 0,
    );
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t);
}

/**
 * Year/month as written in an ISO string (Dart reads UTC fields for `Z`
 * strings and local fields for zone-less ones — i.e. the written digits).
 */
export function isoYearMonth(raw: unknown): { year: number; month: number } | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (m) return { year: +m[1], month: +m[2] };
  const d = tryParseDate(s);
  return d ? { year: d.getFullYear(), month: d.getMonth() + 1 } : undefined;
}
