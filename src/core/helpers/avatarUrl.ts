/**
 * The backend serves this stock image for users who never uploaded a photo.
 * Rendering it looks like a broken gray placeholder, so callers treat it as
 * "no photo" and fall back to the branded initials avatar instead.
 */
const kDefaultProfilePicMarker = 'syncup_default_profile_pic';

/** Returns [url] when usable; '' for null/blank/stock-default values. */
export function sanitizeAvatarUrl(url?: string | null): string {
  const u = url?.trim() ?? '';
  if (!u || u.includes(kDefaultProfilePicMarker)) return '';
  return u;
}
