import { authManager } from '@/core/auth/authManager';
import { RepositoryException } from '@/core/data/repositoryException';
import { pushForResult } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { showSnackbar } from '@/shared/ui/snackbar';
import { resumeRepository } from '@/features/resume/data/resumeRepository';
import { sprintEligibility, sprintSessionStore, type SprintPendingStatus } from '@/features/readinessSprint/data/sprintRepositories';
import { invalidateSprintPendingStatus } from '@/features/readinessSprint/providers/sprintProviders';
import { showResumeGateSheet } from '../widgets/ResumeGateSheet';
import { useJobApplyCoordinator, useJobApplyEvents } from './jobApplyCoordinator';

export type JobApplyOutcome = 'applied' | 'alreadyApplied' | 'cancelled' | 'failed';

export interface JobApplyFlowOptions {
  jobId: string;
  jobTitle: string;
  /**
   * True only while the originating surface is genuinely in front of the user
   * (focused route / visible tab). Gates LOCAL completion UI only.
   */
  isActive: () => boolean;
  onSprintStateChanged?: () => Promise<void> | void;
}

/** (stored sessionId, owed sprint). Errors read as "nothing". */
export async function sprintEntryInfoFor(jobId: string): Promise<[string | null, SprintPendingStatus | null]> {
  try {
    const stored = sprintSessionStore.sessionFor(jobId);
    const pending = sprintEligibility.pendingStatus();
    return [await stored, await pending];
  } catch {
    return [null, null];
  }
}

/** Opens the sprint screen and waits until the user returns. */
async function openSprint(jobId: string, jobTitle?: string) {
  await pushForResult(RouteNames.readinessSprintPath(jobId), jobTitle ? { jobTitle } : undefined);
  void invalidateSprintPendingStatus();
}

/**
 * The job apply flow, shared by the detail screen's sticky bar and card mode's
 * ✓ action: resume gate (fails CLOSED) → coordinator submit → aftermath UI
 * (sprint hand-off only when eligible; otherwise confirmation + owed-sprint
 * reminder). When the surface is no longer active, completion is announced
 * for the shell listener instead.
 */
export async function runJobApplyFlow(o: JobApplyFlowOptions): Promise<JobApplyOutcome> {
  const { jobId, jobTitle, isActive, onSprintStateChanged } = o;
  try {
    const ready = await ensureResumeReady();
    if (!ready) return 'cancelled';

    const submission = await useJobApplyCoordinator.getState().submit(jobId, jobTitle);
    const announce = () =>
      useJobApplyEvents.getState().announce({
        jobId,
        jobTitle,
        outcome: submission.outcome,
        sprintEligible: submission.sprintEligible,
        errorMessage: submission.errorMessage,
      });

    switch (submission.outcome) {
      case 'duplicate':
        return 'cancelled';
      case 'failed':
        if (isActive()) showSnackbar(submission.errorMessage ?? "Couldn't submit your application. Please try again.", { isError: true });
        else announce();
        return 'failed';
      case 'alreadyApplied':
        if (isActive()) await openSprintForAppliedJob({ jobId, jobTitle, isActive, onSprintStateChanged });
        else announce();
        return 'alreadyApplied';
      case 'applied':
        if (!isActive()) {
          announce();
          return 'applied';
        }
        if (!submission.sprintEligible) {
          await confirmAppliedWithPendingReminder({ jobId, jobTitle, isActive, onSprintStateChanged });
          return 'applied';
        }
        await openSprint(jobId, jobTitle);
        await onSprintStateChanged?.();
        return 'applied';
    }
  } catch (e) {
    showSnackbar(e instanceof RepositoryException ? e.message : "Couldn't submit your application. Please try again.", { isError: true });
    return 'failed';
  }
}

/** Sprint entry for an already-applied job. */
export async function openSprintForAppliedJob(o: JobApplyFlowOptions) {
  const { jobId, jobTitle, isActive, onSprintStateChanged } = o;
  const [stored, pending] = await sprintEntryInfoFor(jobId);
  if (!isActive()) {
    useJobApplyEvents.getState().announce({ jobId, jobTitle, outcome: 'alreadyApplied', sprintEligible: false });
    return;
  }
  const owedHere = pending?.jobId === jobId;
  if (stored == null && !owedHere) {
    showSnackbar("You've already applied to this job.");
    await onSprintStateChanged?.();
    return;
  }
  await openSprint(jobId, jobTitle);
  await onSprintStateChanged?.();
}

async function confirmAppliedWithPendingReminder(o: JobApplyFlowOptions) {
  const { jobId, jobTitle, isActive, onSprintStateChanged } = o;
  const [, pending] = await sprintEntryInfoFor(jobId);
  if (!isActive()) {
    useJobApplyEvents.getState().announce({ jobId, jobTitle, outcome: 'applied', sprintEligible: false });
    return;
  }
  if (!pending) {
    showSnackbar('Application submitted ✓');
  } else {
    showSnackbar('Application submitted ✓. Your Job Readiness Sprint is still waiting.', {
      actionLabel: 'Finish',
      onAction: async () => {
        await openSprint(pending.jobId, pending.jobTitle);
        await onSprintStateChanged?.();
      },
    });
  }
  await onSprintStateChanged?.();
}

/**
 * Resume gate — fails CLOSED: a resume is required before applying (the
 * sprint builds its plan from it).
 */
async function ensureResumeReady(): Promise<boolean> {
  const user = authManager.currentUser;
  const userId = user ? (user.id ? user.id : user.userId) : '';
  if (!userId) {
    showSnackbar('Please sign in again to apply.', { isError: true });
    return false;
  }
  let hasResume: boolean;
  try {
    hasResume = await resumeRepository.hasResumeFile(userId);
  } catch (e) {
    showSnackbar(e instanceof RepositoryException ? e.message : "Couldn't check your resume. Please try again.", { isError: true });
    return false;
  }
  if (hasResume) return true;
  const wantsUpload = await showResumeGateSheet();
  if (wantsUpload !== true) return false;
  const uploaded = await pushForResult<boolean>(RouteNames.resumeUpload);
  return uploaded === true;
}
