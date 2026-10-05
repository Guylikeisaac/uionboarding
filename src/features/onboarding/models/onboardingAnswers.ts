import { tryParseDate } from '@/core/helpers/dates';
import { locationResultFromJson, type LocationResult } from '../data/models/locationResult';

/** First fork — what the user came for. */
export type OnboardingIntent = 'activelyLooking' | 'passivelyOpen' | 'hireOrNetwork';
export const onboardingIntents: OnboardingIntent[] = ['activelyLooking', 'passivelyOpen', 'hireOrNetwork'];

/** Second fork, candidates only. */
export type CandidateProfileType = 'fresher' | 'experienced';

/** Both "actively looking" and "passively open" run the candidate path. */
export const intentIsCandidate = (i: OnboardingIntent) => i !== 'hireOrNetwork';

export function intentLabel(i: OnboardingIntent): string {
  switch (i) {
    case 'activelyLooking':
      return "I'm actively looking for a job";
    case 'passivelyOpen':
      return "I'm passively open to offers";
    case 'hireOrNetwork':
      return "I'm here to hire / network";
  }
}

/** Lenient ISO-8601 read — a malformed date restores as undefined. */
export function parseDraftDate(value: unknown): Date | undefined {
  return tryParseDate(value);
}

const iso = (d?: Date) => (d ? d.toISOString() : undefined);
const s = (v: unknown, f = '') => (v == null ? f : String(v));
const os = (v: unknown) => (v == null ? undefined : String(v));
const map = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : {});

// ── ExperienceEntry ──────────────────────────────────────────────────────────

/** One work-history record (experienced branch). */
export interface ExperienceEntry {
  jobTitle: string;
  company: string;
  department?: string;
  industry?: string;
  employmentType?: string;
  from?: Date;
  to?: Date;
  currentlyWorkHere: boolean;
}

export const emptyExperience: ExperienceEntry = { jobTitle: '', company: '', currentlyWorkHere: false };

export function experienceIsComplete(e: ExperienceEntry): boolean {
  return (
    e.jobTitle.trim().length > 0 &&
    e.company.trim().length > 0 &&
    e.department != null &&
    e.industry != null &&
    e.employmentType != null &&
    e.from != null &&
    (e.currentlyWorkHere || e.to != null)
  );
}

function experienceToJson(e: ExperienceEntry) {
  return {
    jobTitle: e.jobTitle,
    company: e.company,
    ...(e.department != null ? { department: e.department } : {}),
    ...(e.industry != null ? { industry: e.industry } : {}),
    ...(e.employmentType != null ? { employmentType: e.employmentType } : {}),
    ...(e.from ? { from: iso(e.from) } : {}),
    ...(e.to ? { to: iso(e.to) } : {}),
    currentlyWorkHere: e.currentlyWorkHere,
  };
}

function experienceFromJson(j: Record<string, any>): ExperienceEntry {
  return {
    jobTitle: s(j.jobTitle),
    company: s(j.company),
    department: os(j.department),
    industry: os(j.industry),
    employmentType: os(j.employmentType),
    from: parseDraftDate(j.from),
    to: parseDraftDate(j.to),
    currentlyWorkHere: j.currentlyWorkHere === true,
  };
}

// ── EducationEntry ───────────────────────────────────────────────────────────

/** Academic record (fresher branch). */
export interface EducationEntry {
  degree: string;
  specialization: string;
  college: string;
  /** Combined graduation year / in-progress status ("2026", "Currently studying"). */
  yearOrStatus?: string;
}

export const emptyEducation: EducationEntry = { degree: '', specialization: '', college: '' };

export function educationIsComplete(e: EducationEntry): boolean {
  return (
    e.degree.trim().length > 0 &&
    e.specialization.trim().length > 0 &&
    e.college.trim().length > 0 &&
    e.yearOrStatus != null
  );
}

// ── InternshipEntry ──────────────────────────────────────────────────────────

/** Single internship record — v1 allows exactly one. */
export interface InternshipEntry {
  company: string;
  role: string;
  from?: Date;
  to?: Date;
  description: string;
}

export const emptyInternship: InternshipEntry = { company: '', role: '', description: '' };

export function internshipIsComplete(e: InternshipEntry): boolean {
  return (
    e.company.trim().length > 0 &&
    e.role.trim().length > 0 &&
    e.from != null &&
    e.to != null &&
    e.description.trim().length > 0
  );
}

// ── ProjectEntry ─────────────────────────────────────────────────────────────

/** Portfolio entry, keyed by a stable client-side [localId]. */
export interface ProjectEntry {
  localId: string;
  title: string;
  description: string;
  link: string;
  start?: Date;
  end?: Date;
  ongoing: boolean;
  /** S3 keys of already-uploaded images. */
  imageKeys: string[];
}

let localIdSeq = 0;
const descriptionMinLength = 20;

export function blankProject(): ProjectEntry {
  return { localId: `p${localIdSeq++}`, title: '', description: '', link: '', ongoing: false, imageKeys: [] };
}

/** Pushes the blank-block counter past a restored `p<n>` id. */
export function reserveLocalId(localId: string) {
  if (!localId.startsWith('p')) return;
  const n = parseInt(localId.substring(1), 10);
  if (!Number.isNaN(n) && n >= localIdSeq) localIdSeq = n + 1;
}

export function projectIsComplete(p: ProjectEntry): boolean {
  return (
    p.title.trim().length > 0 &&
    p.description.trim().length >= descriptionMinLength &&
    p.start != null &&
    (p.ongoing || (p.end != null && p.end.getTime() >= p.start.getTime()))
  );
}

function projectFromJson(j: Record<string, any>): ProjectEntry {
  const id = j.localId?.toString();
  const localId = id ? id : `p${localIdSeq++}`;
  reserveLocalId(localId);
  return {
    localId,
    title: s(j.title),
    description: s(j.description),
    link: s(j.link),
    start: parseDraftDate(j.start),
    end: parseDraftDate(j.end),
    ongoing: j.ongoing === true,
    imageKeys: Array.isArray(j.imageKeys) ? j.imageKeys.map(String).filter(Boolean) : [],
  };
}

// ── OnboardingAnswers ────────────────────────────────────────────────────────

/** Everything the questionnaire collects, across all branches. */
export interface OnboardingAnswers {
  intent?: OnboardingIntent;
  resumeFileName?: string;
  /** Whether the upload also *parsed*. */
  resumeParsed: boolean;
  /** One-shot merge guard for parsed resume prefill. */
  resumePrefillApplied: boolean;
  currentLocation?: LocationResult;
  preferredLocations: LocationResult[];
  profileType?: CandidateProfileType;
  experience: ExperienceEntry;
  rolesOpenTo: string[];
  currentCtc: string;
  noticePeriod: string;
  education: EducationEntry;
  didInternship?: boolean;
  internship: InternshipEntry;
  projects: ProjectEntry[];
  dreamRole?: string;
  joinAvailability: string;
  expectedCtc: string;
  skills: string[];
  linkedinUrl: string;
  twitterUrl: string;
  githubUrl: string;
  websiteUrl: string;
  companyName: string;
  recruiterRole?: string;
  aboutOneLiner: string;
  currentlyHiring?: boolean;
  /** Backend interest **values** (lowercase). */
  interests: string[];
  gender?: string;
}

export const emptyAnswers: OnboardingAnswers = {
  resumeParsed: false,
  resumePrefillApplied: false,
  preferredLocations: [],
  experience: emptyExperience,
  rolesOpenTo: [],
  currentCtc: '',
  noticePeriod: '',
  education: emptyEducation,
  internship: emptyInternship,
  projects: [],
  joinAvailability: '',
  expectedCtc: '',
  skills: [],
  linkedinUrl: '',
  twitterUrl: '',
  githubUrl: '',
  websiteUrl: '',
  companyName: '',
  aboutOneLiner: '',
  interests: [],
};

/** Wipes everything captured after the intent fork. */
export function clearedAfterIntent(a: OnboardingAnswers): OnboardingAnswers {
  return { ...emptyAnswers, intent: a.intent };
}

export function answersToJson(a: OnboardingAnswers): Record<string, unknown> {
  return {
    ...(a.intent ? { intent: a.intent } : {}),
    ...(a.resumeFileName != null ? { resumeFileName: a.resumeFileName } : {}),
    resumeParsed: a.resumeParsed,
    resumePrefillApplied: a.resumePrefillApplied,
    ...(a.currentLocation ? { currentLocation: a.currentLocation } : {}),
    preferredLocations: a.preferredLocations,
    ...(a.profileType ? { profileType: a.profileType } : {}),
    experience: experienceToJson(a.experience),
    rolesOpenTo: a.rolesOpenTo,
    currentCtc: a.currentCtc,
    noticePeriod: a.noticePeriod,
    education: {
      degree: a.education.degree,
      specialization: a.education.specialization,
      college: a.education.college,
      ...(a.education.yearOrStatus != null ? { yearOrStatus: a.education.yearOrStatus } : {}),
    },
    ...(a.didInternship != null ? { didInternship: a.didInternship } : {}),
    internship: {
      company: a.internship.company,
      role: a.internship.role,
      ...(a.internship.from ? { from: iso(a.internship.from) } : {}),
      ...(a.internship.to ? { to: iso(a.internship.to) } : {}),
      description: a.internship.description,
    },
    projects: a.projects.map((p) => ({
      localId: p.localId,
      title: p.title,
      description: p.description,
      link: p.link,
      ...(p.start ? { start: iso(p.start) } : {}),
      ...(p.end ? { end: iso(p.end) } : {}),
      ongoing: p.ongoing,
      imageKeys: p.imageKeys,
    })),
    ...(a.dreamRole != null ? { dreamRole: a.dreamRole } : {}),
    joinAvailability: a.joinAvailability,
    expectedCtc: a.expectedCtc,
    skills: a.skills,
    linkedinUrl: a.linkedinUrl,
    twitterUrl: a.twitterUrl,
    githubUrl: a.githubUrl,
    websiteUrl: a.websiteUrl,
    companyName: a.companyName,
    ...(a.recruiterRole != null ? { recruiterRole: a.recruiterRole } : {}),
    aboutOneLiner: a.aboutOneLiner,
    ...(a.currentlyHiring != null ? { currentlyHiring: a.currentlyHiring } : {}),
    interests: a.interests,
    ...(a.gender != null ? { gender: a.gender } : {}),
  };
}

function enumOf<T extends string>(values: readonly T[], v: unknown): T | undefined {
  return values.includes(v as T) ? (v as T) : undefined;
}

export function answersFromJson(j: Record<string, any>): OnboardingAnswers {
  const strings = (k: string) => (Array.isArray(j[k]) ? (j[k] as unknown[]).map(String) : []);
  return {
    intent: enumOf(onboardingIntents, j.intent),
    resumeFileName: os(j.resumeFileName),
    resumeParsed: j.resumeParsed === true,
    resumePrefillApplied: j.resumePrefillApplied === true,
    currentLocation: j.currentLocation && typeof j.currentLocation === 'object' ? locationResultFromJson(j.currentLocation) : undefined,
    preferredLocations: Array.isArray(j.preferredLocations)
      ? j.preferredLocations.filter((e: unknown) => e && typeof e === 'object').map((e: any) => locationResultFromJson(e))
      : [],
    profileType: enumOf(['fresher', 'experienced'] as const, j.profileType),
    experience: experienceFromJson(map(j.experience)),
    rolesOpenTo: strings('rolesOpenTo'),
    currentCtc: s(j.currentCtc),
    noticePeriod: s(j.noticePeriod),
    education: {
      degree: s(map(j.education).degree),
      specialization: s(map(j.education).specialization),
      college: s(map(j.education).college),
      yearOrStatus: os(map(j.education).yearOrStatus),
    },
    didInternship: typeof j.didInternship === 'boolean' ? j.didInternship : undefined,
    internship: {
      company: s(map(j.internship).company),
      role: s(map(j.internship).role),
      from: parseDraftDate(map(j.internship).from),
      to: parseDraftDate(map(j.internship).to),
      description: s(map(j.internship).description),
    },
    projects: Array.isArray(j.projects)
      ? j.projects.filter((e: unknown) => e && typeof e === 'object').map((e: any) => projectFromJson(e))
      : [],
    dreamRole: os(j.dreamRole),
    joinAvailability: s(j.joinAvailability),
    expectedCtc: s(j.expectedCtc),
    skills: strings('skills'),
    linkedinUrl: s(j.linkedinUrl),
    twitterUrl: s(j.twitterUrl),
    githubUrl: s(j.githubUrl),
    websiteUrl: s(j.websiteUrl),
    companyName: s(j.companyName),
    recruiterRole: os(j.recruiterRole),
    aboutOneLiner: s(j.aboutOneLiner),
    currentlyHiring: typeof j.currentlyHiring === 'boolean' ? j.currentlyHiring : undefined,
    interests: strings('interests'),
    gender: os(j.gender),
  };
}
