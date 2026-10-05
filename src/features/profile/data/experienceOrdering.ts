import type { ProfileEntry } from './profileModels';

/** Descending by date; null = "still open" = newest. */
function newestFirst(a?: Date, b?: Date): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return b.getTime() - a.getTime();
}

const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Current role first, then later end, then later start, then id. */
export function compareExperienceRecency(a: ProfileEntry, b: ProfileEntry): number {
  if (a.currentlyWorking !== b.currentlyWorking) return a.currentlyWorking ? -1 : 1;
  const byEnd = newestFirst(a.endDate, b.endDate);
  if (byEnd) return byEnd;
  const byStart = newestFirst(a.startDate, b.startDate);
  if (byStart) return byStart;
  return cmpStr(a.id ?? '', b.id ?? '');
}

export function compareEducationRecency(a: ProfileEntry, b: ProfileEntry): number {
  const byEnd = newestFirst(a.endDate, b.endDate);
  if (byEnd) return byEnd;
  const byStart = newestFirst(a.startDate, b.startDate);
  if (byStart) return byStart;
  return cmpStr(a.id ?? '', b.id ?? '');
}

export const sortExperiencesNewestFirst = (rows: ProfileEntry[]) => [...rows].sort(compareExperienceRecency);
export const sortEducationsNewestFirst = (rows: ProfileEntry[]) => [...rows].sort(compareEducationRecency);

export const currentOrLatestExperience = (rows: ProfileEntry[]) => (rows.length ? sortExperiencesNewestFirst(rows)[0] : undefined);

/** Experience rows win over the drifting `currentCompany` scalar. */
export function canonicalCurrentCompany(experiences: ProfileEntry[], fallback: string): string {
  const top = currentOrLatestExperience(experiences);
  if (!top) return fallback.trim();
  return top.subtitle.trim();
}
