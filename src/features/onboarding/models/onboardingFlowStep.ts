import { intentIsCandidate, type OnboardingAnswers } from './onboardingAnswers';

/** Every screen in the questionnaire. */
export type OnboardingFlowStep =
  | 'intent'
  | 'resume'
  | 'location'
  | 'profileType'
  | 'experience'
  | 'rolesOpenTo'
  | 'currentAndExpectedCtc'
  | 'noticePeriod'
  | 'education'
  | 'internshipQuestion'
  | 'internshipDetails'
  | 'projects'
  | 'expectedCtc'
  | 'joinAvailability'
  | 'skills'
  | 'workLinks'
  | 'recruiterWork'
  | 'hiring'
  | 'interests'
  | 'gender';

/**
 * `lastStep` values for `PATCH /user/onboarding-progress` — a whitelisted UI
 * path. Steps without a documented path return null (no marker).
 */
export function progressPath(step: OnboardingFlowStep): string | null {
  switch (step) {
    case 'intent':
      return '/profile/what-brings-you';
    case 'location':
      return '/profile/preferred-location';
    case 'profileType':
      return '/profile/experience-level';
    case 'experience':
      return '/profile/recent-experience';
    case 'rolesOpenTo':
      return '/profile/jobquestions';
    case 'currentAndExpectedCtc':
    case 'expectedCtc':
      return '/profile/job-ctc';
    case 'noticePeriod':
    case 'joinAvailability':
      return '/profile/notice-period';
    case 'skills':
      return '/profile/key-skills';
    case 'workLinks':
      return '/profile/work-links';
    case 'interests':
      return '/profile/preferences';
    case 'gender':
      return '/profile/gender';
    default:
      return null;
  }
}

/** The screen's actual path in this app (rides in `meta.uiPath`). */
export function uiPath(step: OnboardingFlowStep): string {
  switch (step) {
    case 'intent':
      return '/profile/what-brings-you';
    case 'resume':
      return '/profile/resume';
    case 'location':
      return '/profile/preferred-location';
    case 'profileType':
      return '/profile/experience-level';
    case 'experience':
      return '/profile/recent-experience';
    case 'rolesOpenTo':
      return '/profile/jobquestions';
    case 'currentAndExpectedCtc':
    case 'expectedCtc':
      return '/profile/job-ctc';
    case 'noticePeriod':
    case 'joinAvailability':
      return '/profile/notice-period';
    case 'education':
      return '/profile/education';
    case 'internshipQuestion':
      return '/profile/internship';
    case 'internshipDetails':
      return '/profile/internship-details';
    case 'projects':
      return '/profile/projects';
    case 'skills':
      return '/profile/key-skills';
    case 'workLinks':
      return '/profile/work-links';
    case 'recruiterWork':
      return '/profile/hire-company';
    case 'hiring':
      return '/profile/hiring';
    case 'interests':
      return '/profile/preferences';
    case 'gender':
      return '/profile/gender';
  }
}

/**
 * The `lastStep` to send for [step]; falls back to the nearest **earlier**
 * documented path so the PATCH (and its `meta`) is never skipped.
 */
export function resolveLastStep(answers: OnboardingAnswers, step: OnboardingFlowStep): string | null {
  const direct = progressPath(step);
  if (direct) return direct;
  const sequence = resolveOnboardingSteps(answers);
  const position = sequence.indexOf(step);
  if (position <= 0) return null;
  for (let i = position - 1; i >= 0; i--) {
    const p = progressPath(sequence[i]);
    if (p) return p;
  }
  return null;
}

/** `branch` values accepted by `PATCH /user/onboarding-progress`. */
export const OnboardingBranch = {
  hire: 'hire',
  fresher: 'work_fresher',
  fresherStudent: 'work_fresher_student',
  fresherJobReady: 'work_fresher_jobready',
  experienced: 'work_experienced',

  /** Null until the branch is actually known. */
  forAnswers(a: OnboardingAnswers): string | null {
    if (a.intent == null) return null;
    if (!intentIsCandidate(a.intent)) return OnboardingBranch.hire;
    if (a.profileType === 'fresher') return OnboardingBranch.fresherBranch(a);
    if (a.profileType === 'experienced') return OnboardingBranch.experienced;
    return null;
  },

  /** Narrows a fresher to student vs job-ready from the education answer. */
  fresherBranch(a: OnboardingAnswers): string {
    const yearOrStatus = a.education.yearOrStatus;
    if (yearOrStatus == null) return OnboardingBranch.fresher;
    if (!/^\d+$/.test(yearOrStatus)) return OnboardingBranch.fresherStudent;
    const year = parseInt(yearOrStatus, 10);
    return year > new Date().getFullYear() ? OnboardingBranch.fresherStudent : OnboardingBranch.fresherJobReady;
  },
};

/**
 * Builds the ordered screen sequence for the answers given so far.
 * [assumeLongestPath] fills unanswered forks with their longest branch so the
 * progress total only ever shrinks.
 */
export function resolveOnboardingSteps(
  answers: OnboardingAnswers,
  opts: { assumeLongestPath?: boolean } = {},
): OnboardingFlowStep[] {
  const longest = opts.assumeLongestPath ?? false;
  const steps: OnboardingFlowStep[] = ['intent'];

  const intent = answers.intent;
  if (intent == null && !longest) return steps;
  const isCandidate = intent ? intentIsCandidate(intent) : true;

  if (!isCandidate) {
    steps.push('recruiterWork', 'hiring', 'location');
  } else {
    steps.push('resume', 'location', 'profileType');
    const profileType = answers.profileType;
    if (profileType == null && !longest) return steps;
    const isFresher = profileType !== 'experienced';
    if (isFresher) {
      steps.push('education', 'internshipQuestion');
      const did = answers.didInternship;
      if (did === true || (did == null && longest)) steps.push('internshipDetails');
      if (did == null && !longest) return steps;
      steps.push('projects', 'expectedCtc', 'joinAvailability');
    } else {
      steps.push('experience', 'rolesOpenTo', 'currentAndExpectedCtc', 'noticePeriod');
    }
    steps.push('skills', 'workLinks');
  }
  steps.push('interests', 'gender');
  return steps;
}
