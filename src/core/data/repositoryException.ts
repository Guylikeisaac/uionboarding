/**
 * Thrown by repositories on failure. API repos map `AxiosError` → this.
 * Hooks surface it to the UI as an error state — failures are never swallowed
 * into empty UI.
 */
export class RepositoryException extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'RepositoryException';
    this.cause = options?.cause;
  }

  toString(): string {
    return this.message;
  }
}

/** Shared status for one-shot command flows (create, save, upload). */
export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

/** Human message for any thrown value. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof RepositoryException) return e.message;
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e) return e;
  return fallback;
}
