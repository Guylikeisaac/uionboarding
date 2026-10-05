import { create } from 'zustand';

import { authManager } from '@/core/auth/authManager';
import { OnboardingCatalog } from '../data/onboardingFlowCatalog';
import { onboardingDraftStore, sameDeletion, type OnboardingDraft, type PendingDeletion } from '../data/onboardingDraftStore';
import { onboardingHydrationService } from '../data/onboardingHydrationService';
import { SavedRecord, unknownRecordId } from '../data/savedRecord';
import type { ParsedResume } from '../data/models/parsedResume';
import {
  clearedAfterIntent,
  emptyAnswers,
  emptyInternship,
  intentIsCandidate,
  type CandidateProfileType,
  type OnboardingAnswers,
  type OnboardingIntent,
} from '../models/onboardingAnswers';
import { resolveOnboardingSteps, type OnboardingFlowStep } from '../models/onboardingFlowStep';

export interface OnboardingFlowState {
  answers: OnboardingAnswers;
  /** Index into the resolved steps. */
  index: number;
  /** Server ids of records this flow has already created. */
  savedRecords: Record<string, string>;
  /** Rows removed locally whose DELETE hasn't succeeded yet. */
  pendingDeletions: PendingDeletion[];
  /** False until the draft has been read back and reconciled. */
  isRestored: boolean;
}

const initial: OnboardingFlowState = {
  answers: emptyAnswers,
  index: 0,
  savedRecords: {},
  pendingDeletions: [],
  isRestored: false,
};

/** Derived getters (Flutter `OnboardingFlowState` getters). */
export const flowSelectors = {
  steps: (s: OnboardingFlowState) => resolveOnboardingSteps(s.answers),
  totalSteps: (s: OnboardingFlowState) => resolveOnboardingSteps(s.answers, { assumeLongestPath: true }).length,
  current: (s: OnboardingFlowState): OnboardingFlowStep => {
    const list = resolveOnboardingSteps(s.answers);
    return list[Math.max(0, Math.min(s.index, list.length - 1))];
  },
  isLast: (s: OnboardingFlowState) => flowSelectors.current(s) === 'gender',
  toDraft: (s: OnboardingFlowState): OnboardingDraft => ({
    answers: s.answers,
    index: s.index,
    savedRecords: s.savedRecords,
    pendingDeletions: s.pendingDeletions,
  }),
};

function lastIndexFor(a: OnboardingAnswers) {
  const steps = resolveOnboardingSteps(a);
  return steps.length ? steps.length - 1 : 0;
}

const accountId = () => authManager.currentUser?.id ?? '';

/** Serialises writes so two rapid edits can't persist a stale snapshot last. */
let writeChain: Promise<void> = Promise.resolve();

interface Actions {
  restore: () => Promise<void>;
  rehydrateFromServer: () => Promise<void>;
  clearDraft: () => Promise<void>;
  next: () => boolean;
  back: () => boolean;
  update: (mutate: (a: OnboardingAnswers) => OnboardingAnswers) => void;
  applyResumePrefill: (parsed: ParsedResume) => string[];
  rememberSavedRecord: (key: string, id: string) => void;
  scheduleDeletion: (key: string) => void;
  clearDeletions: (done: PendingDeletion[]) => void;
  removeProject: (localId: string) => void;
  setIntent: (intent: OnboardingIntent) => void;
  setProfileType: (type: CandidateProfileType) => void;
  setDidInternship: (value: boolean) => void;
  hasInternshipData: () => boolean;
  hasAnswersBelowIntent: () => boolean;
  reset: () => void;
}

export const useOnboardingFlow = create<OnboardingFlowState & Actions>((set, get) => {
  const persist = () => {
    const s = get();
    if (!s.isRestored) return;
    const draft = flowSelectors.toDraft(s);
    const id = accountId();
    writeChain = writeChain.then(() => onboardingDraftStore.save(id, draft)).catch(() => {});
  };

  const scheduleDeletion = (key: string) => {
    const s = get();
    const id = s.savedRecords[key];
    const records = { ...s.savedRecords };
    delete records[key];
    const queue = [...s.pendingDeletions];
    if (id && id !== unknownRecordId) {
      const d: PendingDeletion = { kind: SavedRecord.kindOf(key), id };
      if (!queue.some((q) => sameDeletion(q, d))) queue.push(d);
    }
    set({ savedRecords: records, pendingDeletions: queue });
    persist();
  };

  return {
    ...initial,

    /** Loads the on-disk draft, then reconciles it with the server. Idempotent. */
    restore: async () => {
      if (get().isRestored) return;
      const s = get();
      const local: OnboardingDraft =
        (await onboardingDraftStore.load(accountId())) ?? flowSelectors.toDraft(s);
      let draft = local;
      try {
        draft = await onboardingHydrationService.hydrate(local);
      } catch (e) {
        if (__DEV__) console.log('⚠️ onboarding hydration failed, using local draft:', e);
      }
      set({
        answers: draft.answers,
        index: Math.max(0, Math.min(draft.index, lastIndexFor(draft.answers))),
        savedRecords: draft.savedRecords,
        pendingDeletions: draft.pendingDeletions,
        isRestored: true,
      });
      persist();
    },

    /**
     * Re-reads the server profile after a resume parse (server wins), adopting
     * the rows the backend parser created so later saves PUT instead of POST.
     */
    rehydrateFromServer: async () => {
      if (!get().isRestored) return;
      try {
        const merged = await onboardingHydrationService.hydrate(flowSelectors.toDraft(get()), { serverWins: true });
        set({ answers: merged.answers, savedRecords: merged.savedRecords });
        persist();
      } catch (e) {
        if (__DEV__) console.log('⚠️ post-resume rehydrate failed:', e);
      }
    },

    clearDraft: () => {
      const id = accountId();
      writeChain = writeChain.then(() => onboardingDraftStore.clear(id));
      return writeChain;
    },

    next: () => {
      const s = get();
      if (s.index >= flowSelectors.steps(s).length - 1) return false;
      set({ index: s.index + 1 });
      persist();
      return true;
    },

    back: () => {
      const s = get();
      if (s.index === 0) return false;
      set({ index: s.index - 1 });
      persist();
      return true;
    },

    update: (mutate) => {
      set({ answers: mutate(get().answers) });
      persist();
    },

    /**
     * Merges parsed-resume data into EMPTY answers only, one-shot. Forks are
     * never prefilled. Returns what was filled.
     */
    applyResumePrefill: (parsed) => {
      let a = get().answers;
      if (a.resumePrefillApplied) return [];
      const filled: string[] = [];

      if (a.skills.length === 0 && parsed.skills.length) {
        a = { ...a, skills: parsed.skills.slice(0, 5) };
        filled.push('skills');
      }

      const pick = (current: string, incoming?: string) => (current ? current : incoming ?? '');
      const before = [a.linkedinUrl, a.githubUrl, a.twitterUrl, a.websiteUrl];
      a = {
        ...a,
        linkedinUrl: pick(a.linkedinUrl, parsed.linkedinUrl),
        githubUrl: pick(a.githubUrl, parsed.githubUrl),
        twitterUrl: pick(a.twitterUrl, parsed.twitterUrl),
        websiteUrl: pick(a.websiteUrl, parsed.websiteUrl),
      };
      const after = [a.linkedinUrl, a.githubUrl, a.twitterUrl, a.websiteUrl];
      if (!after.every((v, i) => v === before[i])) filled.push('links');

      const edu = parsed.education;
      if (edu && !a.education.college.trim()) {
        const yr = edu.endYear == null ? undefined : String(edu.endYear);
        a = {
          ...a,
          education: {
            ...a.education,
            college: edu.school ?? '',
            degree: edu.degree ?? '',
            specialization: edu.fieldOfStudy ?? '',
            yearOrStatus:
              yr && OnboardingCatalog.educationYearOrStatus.includes(yr) ? yr : a.education.yearOrStatus,
          },
        };
        filled.push('education');
      }

      const exp = parsed.experience;
      if (exp && !a.experience.jobTitle.trim()) {
        a = {
          ...a,
          experience: {
            ...a.experience,
            jobTitle: exp.jobTitle ?? '',
            company: exp.company ?? '',
            from: exp.from ?? a.experience.from,
            to: exp.to ?? a.experience.to,
            currentlyWorkHere: exp.currentlyWorking,
          },
        };
        filled.push('work experience');
      }

      set({ answers: { ...a, resumePrefillApplied: true } });
      persist();
      return filled;
    },

    rememberSavedRecord: (key, id) => {
      set({ savedRecords: { ...get().savedRecords, [key]: id } });
      persist();
    },

    scheduleDeletion,

    clearDeletions: (done) => {
      if (!done.length) return;
      set({ pendingDeletions: get().pendingDeletions.filter((d) => !done.some((x) => sameDeletion(x, d))) });
      persist();
    },

    removeProject: (localId) => {
      const a = get().answers;
      set({ answers: { ...a, projects: a.projects.filter((p) => p.localId !== localId) } });
      scheduleDeletion(SavedRecord.project(localId));
    },

    /** Only the recruiter/candidate crossing invalidates (local) answers. */
    setIntent: (intent) => {
      const prev = get().answers.intent;
      if (prev === intent) return;
      const crosses = prev != null && intentIsCandidate(prev) !== intentIsCandidate(intent);
      const withIntent = { ...get().answers, intent };
      set({ answers: crosses ? clearedAfterIntent(withIntent) : withIntent });
      persist();
    },

    /** Fork 2 keeps everything — it only decides which screens show. */
    setProfileType: (type) => {
      if (get().answers.profileType === type) return;
      set({ answers: { ...get().answers, profileType: type } });
      persist();
    },

    /** Switching Yes → No discards the internship and queues its row's deletion. */
    setDidInternship: (value) => {
      const a = get().answers;
      if (a.didInternship === value) return;
      set({ answers: { ...a, didInternship: value, internship: value ? a.internship : emptyInternship } });
      if (!value) scheduleDeletion(SavedRecord.internship);
      persist();
    },

    hasInternshipData: () => {
      const i = get().answers.internship;
      return !!(i.company.trim() || i.role.trim() || i.description.trim());
    },

    hasAnswersBelowIntent: () => {
      const a = get().answers;
      return (
        a.profileType != null ||
        a.currentLocation != null ||
        a.resumeFileName != null ||
        a.companyName.trim().length > 0 ||
        a.recruiterRole != null
      );
    },

    /** Wipes in-memory state AND the stored draft. */
    reset: () => {
      void get().clearDraft();
      set({ ...initial, isRestored: true });
    },
  };
});
