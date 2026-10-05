import type { User } from '@/features/auth/data/authModels';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { intentIsCandidate, type OnboardingAnswers } from '../models/onboardingAnswers';

export type CardLink = 'linkedin' | 'github' | 'twitter' | 'website';

/** Everything the live profile card shows, derived from answers + account. */
export interface CandidateCardData {
  name: string;
  handle: string;
  photoUrl: string;
  /** "Open to work" etc. — from the first question. */
  goal?: string;
  era?: string;
  location?: string;
  /** Degree · college / title @ company. */
  background?: string;
  skills: string[];
  links: CardLink[];
  interests: string[];
  hasResume: boolean;
  isRecruiter: boolean;
  /** Ids of tags earned so far (see gamification `tagOf`), in earn order. */
  tags: string[];
}

/** Values that exist before onboarding (during signup), overriding the session user. */
export interface CardOverrides {
  name?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
}

const goalFor: Record<string, string> = {
  activelyLooking: 'Open to work',
  passivelyOpen: 'Open to offers',
  hireOrNetwork: 'Hiring & networking',
};

const clean = (s?: string | null) => (s ?? '').trim();

export function candidateCardFrom(a: OnboardingAnswers, user: User | null, o: CardOverrides = {}): CandidateCardData {
  const isRecruiter = a.intent != null && !intentIsCandidate(a.intent);
  let background: string | undefined;
  if (isRecruiter) {
    const role = clean(a.recruiterRole);
    const co = clean(a.companyName);
    background = role && co ? `${role} @ ${co}` : role || co || undefined;
  } else if (a.profileType === 'experienced') {
    const t = clean(a.experience.jobTitle);
    const c = clean(a.experience.company);
    background = t && c ? `${t} @ ${c}` : t || c || undefined;
  } else {
    const d = clean(a.education.degree);
    const c = clean(a.education.college);
    background = d && c ? `${d} · ${c}` : d || c || undefined;
  }
  const links: CardLink[] = [];
  if (clean(a.linkedinUrl)) links.push('linkedin');
  if (clean(a.githubUrl)) links.push('github');
  if (clean(a.twitterUrl)) links.push('twitter');
  if (clean(a.websiteUrl)) links.push('website');

  const phone = clean(o.phone ?? user?.phone);
  const email = clean(o.email ?? user?.email);
  // Same order the tags are earned in.
  const tags: string[] = [];
  if (phone) tags.push('phone');
  if (email) tags.push('email');
  if (a.intent) tags.push('intent');
  if (a.resumeFileName) tags.push('resume');
  if (a.currentLocation) tags.push('location');
  if (a.profileType) tags.push('profileType');
  if (background) tags.push(isRecruiter ? 'work' : 'background');
  if (a.skills.length >= 3) tags.push('skills');
  if (links.length) tags.push('links');
  if (a.interests.length) tags.push('interests');
  if (isRecruiter && a.currentlyHiring != null) tags.push('hiring');
  if (a.gender) tags.push('gender');

  return {
    name: clean(o.name ?? user?.name),
    handle: clean(user?.userId),
    photoUrl: o.photoUrl ?? sanitizeAvatarUrl(user?.profilePic),
    goal: a.intent ? goalFor[a.intent] : undefined,
    era: isRecruiter ? 'Recruiter' : a.profileType === 'experienced' ? 'Experienced' : a.profileType === 'fresher' ? 'Fresher' : undefined,
    location: a.currentLocation?.label || undefined,
    background,
    skills: a.skills.slice(0, 5),
    links,
    interests: a.interests.slice(0, 4),
    hasResume: !!a.resumeFileName,
    isRecruiter,
    tags,
  };
}

/** The most recently meaningful line for the compact card. */
export function cardTagline(c: CandidateCardData): string {
  return c.background ?? c.location ?? c.goal ?? 'Complete your profile';
}
