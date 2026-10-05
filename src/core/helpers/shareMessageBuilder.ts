/**
 * Composes the user-facing copy for the OS share sheet for posts and jobs.
 * Missing metadata never produces a blank or "  at  " line.
 */
export const ShareMessages = {
  post(url: string): string {
    return `Check out this post on SyncUp:\n${url}`;
  },
  postSubject: 'A post on SyncUp',
  job({ title, company, url }: { title?: string | null; company?: string | null; url: string }): string {
    const detail = jobDetailLine(title, company);
    if (!detail) return `Check out this job on SyncUp:\n${url}`;
    return `Check out this job on SyncUp:\n${detail}\n${url}`;
  },
  jobSubject({ title, company }: { title?: string | null; company?: string | null }): string {
    const detail = jobDetailLine(title, company);
    return detail || 'A job on SyncUp';
  },
};

function jobDetailLine(title?: string | null, company?: string | null): string {
  const t = title?.trim() ?? '';
  const c = company?.trim() ?? '';
  if (t && c) return `${t} at ${c}`;
  return t || c || '';
}
