/** Compact count label: 1234 → "1.2k", 2_400_000 → "2.4M", 950 → "950". */
export function compactCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${trim(n / 1000)}k`;
  return `${trim(n / 1_000_000)}M`;
}

function trim(v: number): string {
  const s = v.toFixed(1);
  return s.endsWith('.0') ? s.substring(0, s.length - 2) : s;
}
