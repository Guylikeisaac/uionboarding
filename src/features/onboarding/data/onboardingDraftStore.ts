import { prefs } from '@/core/storage/storage';
import { answersFromJson, answersToJson, type OnboardingAnswers } from '../models/onboardingAnswers';

/** Which collection a stale row belongs to, so the retry knows the endpoint. */
export type DeletableRecord = 'education' | 'experience' | 'project';

export interface PendingDeletion {
  kind: DeletableRecord;
  id: string;
}

export const sameDeletion = (a: PendingDeletion, b: PendingDeletion) => a.kind === b.kind && a.id === b.id;

/** Everything the questionnaire needs to pick up exactly where it left off. */
export interface OnboardingDraft {
  answers: OnboardingAnswers;
  index: number;
  savedRecords: Record<string, string>;
  pendingDeletions: PendingDeletion[];
}

const schemaVersion = 1;
const prefix = 'onboarding_draft_v1_';

function draftToJson(d: OnboardingDraft) {
  return {
    version: schemaVersion,
    answers: answersToJson(d.answers),
    index: d.index,
    savedRecords: d.savedRecords,
    pendingDeletions: d.pendingDeletions,
  };
}

function draftFromJson(j: Record<string, any>): OnboardingDraft {
  const records: Record<string, string> = {};
  if (j.savedRecords && typeof j.savedRecords === 'object') {
    for (const [k, v] of Object.entries(j.savedRecords)) records[String(k)] = String(v);
  }
  return {
    answers: answersFromJson(j.answers && typeof j.answers === 'object' ? j.answers : {}),
    index: typeof j.index === 'number' ? Math.trunc(j.index) : 0,
    savedRecords: records,
    pendingDeletions: Array.isArray(j.pendingDeletions)
      ? j.pendingDeletions
          .filter((e: unknown) => e && typeof e === 'object')
          .map((e: any) => ({
            kind: (['education', 'experience', 'project'].includes(e.kind) ? e.kind : 'project') as DeletableRecord,
            id: e.id?.toString() ?? '',
          }))
      : [],
  };
}

/**
 * Persists the in-progress questionnaire to disk, per account. Plain storage
 * on purpose (not secure storage): none of this is a credential.
 */
export const onboardingDraftStore = {
  async save(accountId: string, draft: OnboardingDraft): Promise<void> {
    if (!accountId) return;
    try {
      await prefs.setJson(`${prefix}${accountId}`, draftToJson(draft));
    } catch (e) {
      if (__DEV__) console.log('⚠️ onboarding draft not saved:', e);
    }
  },

  async load(accountId: string): Promise<OnboardingDraft | null> {
    if (!accountId) return null;
    try {
      const map = await prefs.getJson<Record<string, any>>(`${prefix}${accountId}`);
      if (!map || typeof map !== 'object') return null;
      if (map.version !== schemaVersion) {
        await onboardingDraftStore.clear(accountId);
        return null;
      }
      return draftFromJson(map);
    } catch {
      await onboardingDraftStore.clear(accountId);
      return null;
    }
  },

  async clear(accountId: string): Promise<void> {
    if (!accountId) return;
    try {
      await prefs.remove(`${prefix}${accountId}`);
    } catch {
      // ignore
    }
  },
};
