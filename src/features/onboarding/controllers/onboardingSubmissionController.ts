import { authManager } from '@/core/auth/authManager';
import { errorBody, isHttpError, statusOf } from '@/core/network/apiClient';
import type { CatalogOption } from '../data/models/catalogOption';
import { OnboardingCatalog } from '../data/onboardingFlowCatalog';
import type { PendingDeletion } from '../data/onboardingDraftStore';
import { onboardingRepository as repo } from '../data/onboardingRepository';
import { SavedRecord, unknownRecordId } from '../data/savedRecord';
import {
  intentIsCandidate,
  internshipIsComplete,
  projectIsComplete,
  type ExperienceEntry,
} from '../models/onboardingAnswers';
import { OnboardingBranch, resolveLastStep, uiPath, type OnboardingFlowStep } from '../models/onboardingFlowStep';
import { fetchExperienceCatalogs } from '../providers/experienceCatalogs';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

/** Milestones from `PATCH /user/profile-completion-status?status=`. */
export const ProfileCompletionStatus = {
  resumeUploadedAndParsed: 'resume_uploaded_and_parsed',
  skillsAdded: 'skills_added',
  jobQuestionsAdded: 'job_questions_added',
  preferencesAdded: 'preferences_added',
  interestsAdded: 'interests_added',
  completed: 'completed',
} as const;

/** Why a step couldn't be saved, in terms the shell can act on. */
export interface StepSaveFailure {
  message: string;
  sessionExpired: boolean;
}

const flow = () => useOnboardingFlow.getState();
const answers = () => flow().answers;

/** `double.tryParse` — undefined for empty / non-numeric text. */
function tryParseDouble(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function failureFor(step: OnboardingFlowStep, e: unknown): StepSaveFailure {
  const status = statusOf(e);
  const body = errorBody(e);
  const msg = body && typeof body === 'object' ? (body as any).message?.toString() : undefined;
  if (__DEV__) console.log(`❌ onboarding ${step} (${status}): ${msg}`);
  if (status === 401 || status === 403) {
    if (authManager.sessionExpired) {
      return {
        message: 'Your session expired. Sign in again to carry on — the answers you have already saved are safe.',
        sessionExpired: true,
      };
    }
    return { message: "We couldn't renew your session — check your connection and retry.", sessionExpired: false };
  }
  return { message: msg ?? "Couldn't save that step. Please try again.", sessionExpired: false };
}

/** Create-or-update and remember the resulting id (POST once, PUT after). */
async function upsert(key: string, save: (id?: string) => Promise<string | null>) {
  const existing = flow().savedRecords[key];
  if (existing === unknownRecordId) return;
  const id = await save(existing);
  flow().rememberSavedRecord(key, id ?? unknownRecordId);
}

/** Non-fatal milestone, through AuthManager so the router stays in sync. */
async function setStatus(status: string) {
  const r = await authManager.setProfileCompletionStatus(status);
  if (!r.isSuccess && __DEV__) console.log(`⚠️ milestone ${status} not recorded: ${r.error}`);
}

async function saveCompensation(noticeLabel: string) {
  const a = answers();
  const current = tryParseDouble(a.currentCtc);
  const preferred = tryParseDouble(a.expectedCtc);
  const days = OnboardingCatalog.noticePeriodToDays[noticeLabel];
  if (days == null && current == null && preferred == null) return;
  await repo.saveCompensation({ currentSalaryLPA: current, preferredSalaryLPA: preferred, noticePeriodDays: days });
}

/** "Currently studying" has no year, so no end date is sent. */
function graduationDate(yearOrStatus?: string): Date | undefined {
  if (!yearOrStatus || !/^\d+$/.test(yearOrStatus)) return undefined;
  return new Date(parseInt(yearOrStatus, 10), 5, 1);
}

function idFor(options: CatalogOption[], name: string): number | undefined {
  return options.find((o) => o.name.toLowerCase() === name.toLowerCase())?.id;
}

async function saveDepartmentIndustry(e: ExperienceEntry) {
  if (e.department == null || e.industry == null) return;
  const catalogs = await fetchExperienceCatalogs();
  const dep = idFor(catalogs.departments, e.department);
  const ind = idFor(catalogs.industries, e.industry);
  if (dep == null || ind == null) return;
  await repo.saveDepartmentIndustry(dep, ind);
}

async function saveExperienceEntry(e: ExperienceEntry) {
  if (!e.jobTitle.trim() || !e.from) return;
  const from = e.from;
  await upsert(SavedRecord.experience, (id) =>
    repo.upsertExperience({
      companyName: e.company.trim(),
      jobTitle: e.jobTitle.trim(),
      workMode: OnboardingCatalog.employmentTypeToWorkMode[e.employmentType ?? ''] ?? 'fulltime',
      currentlyWorking: e.currentlyWorkHere,
      startMonthYear: from,
      endMonthYear: e.currentlyWorkHere ? undefined : e.to,
      id,
    }),
  );
}

async function persist(step: OnboardingFlowStep) {
  const a = answers();
  switch (step) {
    case 'intent': {
      if (!a.intent) return;
      await repo.saveOpenTo(intentIsCandidate(a.intent) ? 'WORK' : 'HIRE');
      if (a.intent === 'activelyLooking') await repo.saveJobStatus('active');
      else if (a.intent === 'passivelyOpen') await repo.saveJobStatus('open');
      return;
    }
    case 'location': {
      if (a.currentLocation) await repo.saveCurrentLocation(a.currentLocation.id);
      if (a.preferredLocations.length) await repo.savePreferredLocations(a.preferredLocations.map((l) => l.id));
      return;
    }
    case 'profileType':
      if (a.profileType === 'fresher') await repo.markOnboardingFresher();
      return;
    case 'experience':
      await saveDepartmentIndustry(a.experience);
      await saveExperienceEntry(a.experience);
      return;
    case 'rolesOpenTo':
      if (a.rolesOpenTo.length) await repo.saveJobRole(a.rolesOpenTo[0]);
      return;
    case 'noticePeriod':
      await saveCompensation(a.noticePeriod);
      await setStatus(ProfileCompletionStatus.jobQuestionsAdded);
      return;
    case 'education': {
      const e = a.education;
      if (!e.college.trim()) return;
      await upsert(SavedRecord.education, (id) =>
        repo.upsertEducation({
          school: e.college.trim(),
          degreeName: e.degree.trim(),
          fieldOfStudyName: e.specialization.trim(),
          yearOrStatus: e.yearOrStatus,
          endDate: graduationDate(e.yearOrStatus),
          id,
        }),
      );
      return;
    }
    case 'internshipDetails': {
      const i = a.internship;
      if (!internshipIsComplete(i)) return;
      await upsert(SavedRecord.internship, (id) =>
        repo.upsertExperience({
          companyName: i.company.trim(),
          jobTitle: i.role.trim(),
          workMode: 'internship',
          currentlyWorking: false,
          startMonthYear: i.from!,
          endMonthYear: i.to,
          jobDescription: i.description.trim(),
          id,
        }),
      );
      return;
    }
    case 'projects':
      for (const p of a.projects) {
        if (!projectIsComplete(p)) continue;
        await upsert(SavedRecord.project(p.localId), (id) =>
          repo.upsertProject({
            title: p.title.trim(),
            description: p.description.trim(),
            linkUrl: p.link.trim(),
            startMonthYear: p.start,
            endMonthYear: p.ongoing ? undefined : p.end,
            currentlyWorking: p.ongoing,
            attachmentKeys: p.imageKeys,
            id,
          }),
        );
      }
      return;
    case 'joinAvailability':
      await saveCompensation(a.joinAvailability);
      await setStatus(ProfileCompletionStatus.jobQuestionsAdded);
      return;
    case 'skills':
      if (a.skills.length) {
        await repo.saveKeySkills(a.skills);
        try {
          await repo.saveSkillRecords(a.skills);
        } catch (e) {
          if (__DEV__) console.log('⚠️ skill/create-batch mirror failed:', e);
        }
        await setStatus(ProfileCompletionStatus.skillsAdded);
      }
      return;
    case 'workLinks':
      await repo.saveProfileLinks({
        linkedinUrl: a.linkedinUrl,
        githubUrl: a.githubUrl,
        twitterUrl: a.twitterUrl,
        personalWebsite: a.websiteUrl,
      });
      await setStatus(ProfileCompletionStatus.preferencesAdded);
      return;
    case 'interests':
      if (a.interests.length) {
        await repo.saveInterests(a.interests);
        await setStatus(ProfileCompletionStatus.interestsAdded);
      }
      return;
    case 'gender': {
      const value = a.gender ? OnboardingCatalog.genderToApiValue[a.gender] : undefined;
      if (value) await repo.saveGender(value);
      return;
    }
    case 'recruiterWork':
      if (a.companyName.trim()) await repo.saveCurrentCompany(a.companyName.trim());
      if ((a.recruiterRole ?? '').trim()) await repo.saveUserTitle(a.recruiterRole!.trim());
      if (a.aboutOneLiner.trim()) await repo.saveBio(a.aboutOneLiner.trim());
      return;
    case 'resume':
      if (a.resumeParsed) await setStatus(ProfileCompletionStatus.resumeUploadedAndParsed);
      return;
    case 'expectedCtc': {
      const dreamRole = a.dreamRole?.trim();
      if (dreamRole) await repo.saveJobRole(dreamRole);
      return;
    }
    case 'currentAndExpectedCtc':
    case 'internshipQuestion':
    case 'hiring':
      return;
  }
}

/** Retries queued DELETEs; 404/403 are dropped as permanently done. */
async function drainDeletions() {
  const queue = flow().pendingDeletions;
  if (!queue.length) return;
  const done: PendingDeletion[] = [];
  for (const d of queue) {
    try {
      if (d.kind === 'education') await repo.deleteEducation(d.id);
      else if (d.kind === 'experience') await repo.deleteExperience(d.id);
      else await repo.deleteProject(d.id);
      done.push(d);
    } catch (e) {
      const status = statusOf(e);
      if (status === 404 || status === 403) done.push(d);
    }
  }
  flow().clearDeletions(done);
}

function meta(step: OnboardingFlowStep): Record<string, unknown> {
  const a = answers();
  return {
    uiPath: uiPath(step),
    ...(a.currentlyHiring != null ? { currentlyHiring: a.currentlyHiring } : {}),
    ...(a.didInternship != null ? { didInternship: a.didInternship } : {}),
    ...(a.resumeFileName != null ? { resumeFileName: a.resumeFileName } : {}),
    ...(a.rolesOpenTo.length > 1 ? { additionalJobRoles: a.rolesOpenTo.slice(1) } : {}),
    ...(a.dreamRole ? { dreamRole: a.dreamRole } : {}),
  };
}

/** Best-effort progress marker. Never throws. */
async function recordProgress(step: OnboardingFlowStep) {
  const a = answers();
  const path = resolveLastStep(a, step);
  if (!path) return;
  try {
    await repo.saveOnboardingProgress({ lastStep: path, branch: OnboardingBranch.forAnswers(a), meta: meta(step) });
  } catch (e) {
    if (__DEV__) console.log(`⚠️ onboarding-progress not recorded for ${step}:`, e);
  }
}

/**
 * Persists one questionnaire step at a time. The step's own data blocks on
 * failure; progress markers and queued deletions are advisory.
 */
export const onboardingSubmissionController = {
  async persistStep(step: OnboardingFlowStep): Promise<StepSaveFailure | null> {
    try {
      await persist(step);
    } catch (e) {
      if (isHttpError(e)) return failureFor(step, e);
      if (__DEV__) console.log(`❌ onboarding ${step}:`, e);
      return { message: "Couldn't save that step. Please try again.", sessionExpired: false };
    }
    await drainDeletions();
    await recordProgress(step);
    return null;
  },

  /** Terminal call after the gender step: flips the account to `completed`. */
  async complete(): Promise<StepSaveFailure | null> {
    try {
      const result = await authManager.setProfileCompletionStatus(ProfileCompletionStatus.completed);
      if (result.isSuccess) return null;
      return {
        message: result.error ?? "Couldn't finish setting up your profile. Please retry.",
        sessionExpired: authManager.sessionExpired,
      };
    } catch (e) {
      if (isHttpError(e)) return failureFor('gender', e);
      return { message: "Couldn't finish setting up your profile. Please retry.", sessionExpired: false };
    }
  },
};
