import { tryParseDate } from '@/core/helpers/dates';
import { monthShortNames } from '@/core/helpers/relativeTime';

/**
 * The user's latest uploaded resume FILE on record. The payload carries only
 * `{id, resumeKey, userId, createdAt}` — display fields are derivations.
 */
export interface ResumeFile {
  /** `DELETE /resume/{id}` target. */
  id: string;
  /** S3 object key — the download target (query param; contains slashes). */
  resumeKey: string;
  uploadedAt?: Date;
}

export function resumeFileFromJson(json: Record<string, any>): ResumeFile {
  return {
    id: String(json.id ?? ''),
    resumeKey: String(json.resumeKey ?? ''),
    uploadedAt: tryParseDate(json.createdAt ?? ''),
  };
}

/** Display cleanup; optionally strips backend timestamp / UUID key prefixes. */
export function sanitizeResumeDisplayName(raw: string, stripBackendPrefixes = false): string {
  const base = raw.split('/').pop() ?? raw;
  const normalized = stripBackendPrefixes
    ? base
        .replace(/^\d{10,}-/, '')
        .replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-/, '')
    : base;
  const cleaned = normalized.replace(/\s+(\.[^.]+)$/, '$1').trim();
  return cleaned || base;
}

export const resumeFileName = (f: ResumeFile) => sanitizeResumeDisplayName(f.resumeKey, true);

export function resumeFileExtension(f: ResumeFile): string {
  const base = f.resumeKey.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot === -1 || dot === base.length - 1) return '';
  return base.substring(dot + 1).toLowerCase();
}

export const resumeFileTypeLabel = (f: ResumeFile) => resumeFileExtension(f).toUpperCase();

/** "Updated Jul 12, 2026 · PDF" — only parts with real values. */
export function resumeFileMetaLabel(f: ResumeFile): string {
  const parts: string[] = [];
  if (f.uploadedAt) {
    const d = f.uploadedAt;
    parts.push(`Updated ${monthShortNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
  }
  const t = resumeFileTypeLabel(f);
  if (t) parts.push(t);
  return parts.join(' · ');
}
