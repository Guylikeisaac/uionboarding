import type { CatalogOption } from './models/catalogOption';
import type { LocationResult } from './models/locationResult';
import { OnboardingCatalog } from './onboardingFlowCatalog';
import type { OnboardingDraft } from './onboardingDraftStore';
import { onboardingRepository, type OnboardingRepository } from './onboardingRepository';
import { SavedRecord } from './savedRecord';
import { parseDraftDate, type OnboardingAnswers, type ProjectEntry } from '../models/onboardingAnswers';

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return !s || s === 'null' ? undefined : s;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (v == null) return undefined;
  const n = Number(String(v));
  return String(v).trim() !== '' && Number.isFinite(n) ? n : undefined;
}

const idOf = (row: Record<string, any>) =>
  str(row.id ?? row._id ?? row.educationId ?? row.experienceId ?? row.projectId);

/** `12.0` reads as `12`; `12.5` keeps its decimal. */
const trimNumber = (v: number) => (v === Math.round(v) ? String(Math.trunc(v)) : String(v));

function stringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => (e && typeof e === 'object' ? str((e as any).name ?? (e as any).value) : str(e)))
    .filter((s): s is string => !!s);
}

/** Newest first; a null date ("open ended") outranks any real date. */
function compareDesc(a?: Date, b?: Date): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return b.getTime() - a.getTime();
}

const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function mostRecentEducation(rows: Record<string, any>[]): Record<string, any> | undefined {
  if (!rows.length) return undefined;
  return [...rows].sort((a, b) => {
    const byEnd = compareDesc(parseDraftDate(a.endDate), parseDraftDate(b.endDate));
    if (byEnd) return byEnd;
    const byStart = compareDesc(parseDraftDate(a.startDate), parseDraftDate(b.startDate));
    if (byStart) return byStart;
    return cmpStr(idOf(a) ?? '', idOf(b) ?? '');
  })[0];
}

/** Picks the row "most recent experience" is actually about — never list order. */
export function mostRecentExperience(rows: Record<string, any>[]): Record<string, any> | undefined {
  if (!rows.length) return undefined;
  return [...rows].sort((a, b) => {
    const ac = a.currentlyWorking === true;
    const bc = b.currentlyWorking === true;
    if (ac !== bc) return ac ? -1 : 1;
    if (!ac) {
      const byEnd = compareDesc(parseDraftDate(a.endMonthYear), parseDraftDate(b.endMonthYear));
      if (byEnd) return byEnd;
    }
    const byStart = compareDesc(parseDraftDate(a.startMonthYear), parseDraftDate(b.startMonthYear));
    if (byStart) return byStart;
    return cmpStr(idOf(a) ?? '', idOf(b) ?? '');
  })[0];
}

/** `row[key].name`, falling back to the flat `<key>Name` spelling. */
function nestedName(row: Record<string, any>, key: string): string | undefined {
  const rel = row[key];
  if (rel && typeof rel === 'object') {
    const n = str(rel.name);
    if (n) return n;
  }
  return str(row[`${key}Name`]);
}

function location(raw: unknown): LocationResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const map = raw as Record<string, any>;
  const source = map.location && typeof map.location === 'object' ? map.location : map;
  const id = str(source.id ?? source.locationId);
  if (!id) return undefined;
  const city = str(source.city) ?? '';
  const state = str(source.state) ?? '';
  const country = str(source.country) ?? '';
  const label = str(source.label) ?? [city, state, country].filter(Boolean).join(', ');
  return { id, city, state, country, label };
}

function locationFromIdAndLabel(id: unknown, label: unknown): LocationResult | undefined {
  const locationId = str(id);
  if (!locationId) return undefined;
  const text = str(label) ?? '';
  const parts = text.split(',').map((p) => p.trim());
  return { id: locationId, city: parts[0] ?? '', state: parts[1] ?? '', country: parts[2] ?? '', label: text };
}

function yearOrStatus(endDate: unknown): string | undefined {
  const d = parseDraftDate(endDate);
  if (!d) return undefined;
  const y = String(d.getFullYear());
  return OnboardingCatalog.educationYearOrStatus.includes(y) ? y : undefined;
}

async function guard<T>(label: string, fetch: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fetch();
  } catch (e) {
    if (__DEV__) console.log(`ℹ️ onboarding hydration: ${label} unavailable`, e);
    return undefined;
  }
}

/**
 * Reconciles a local draft with what the account already has on the server:
 * adopts existing row ids (so re-walks PUT instead of POST) and prefills empty
 * answers. Every fetch is best-effort. [serverWins] flips the conflict rule
 * right after a resume parse.
 */
export class OnboardingHydrationService {
  constructor(private readonly repo: OnboardingRepository = onboardingRepository) {}

  async hydrate(local: OnboardingDraft, opts: { serverWins?: boolean } = {}): Promise<OnboardingDraft> {
    const serverWins = opts.serverWins ?? false;
    const records: Record<string, string> = { ...local.savedRecords };
    let answers = local.answers;

    const [wd, education, experience, projects] = await Promise.all([
      guard('work-details', () => this.repo.fetchWorkDetails()),
      guard('education', () => this.repo.fetchEducation()),
      guard('experience', () => this.repo.fetchExperience()),
      guard('projects', () => this.repo.fetchProjects()),
    ]);

    answers = this.adoptEducation(education ?? [], records, answers, serverWins);
    answers = this.adoptExperience(experience ?? [], records, answers, serverWins);
    answers = this.adoptProjects(projects ?? [], records, answers);
    answers = this.applyWorkDetails(wd ?? {}, answers, serverWins);
    answers = await this.applyDepartmentIndustry(wd ?? {}, answers);

    return { answers, index: local.index, savedRecords: records, pendingDeletions: local.pendingDeletions };
  }

  private adoptEducation(
    rows: Record<string, any>[],
    records: Record<string, string>,
    answers: OnboardingAnswers,
    serverWins: boolean,
  ): OnboardingAnswers {
    if (!rows.length) return answers;
    const row = mostRecentEducation(rows);
    if (!row) return answers;
    const id = idOf(row);
    if (id) records[SavedRecord.education] = id;
    if (!serverWins && answers.education.college.trim()) return answers;
    return {
      ...answers,
      education: {
        college: str(row.school) ?? '',
        degree: nestedName(row, 'degree') ?? '',
        specialization: nestedName(row, 'fieldOfStudy') ?? '',
        yearOrStatus: yearOrStatus(row.endDate),
      },
    };
  }

  private adoptExperience(
    rows: Record<string, any>[],
    records: Record<string, string>,
    answers: OnboardingAnswers,
    serverWins: boolean,
  ): OnboardingAnswers {
    if (!rows.length) return answers;
    const jobs: Record<string, any>[] = [];
    const internships: Record<string, any>[] = [];
    for (const r of rows) (str(r.workMode)?.toLowerCase() === 'internship' ? internships : jobs).push(r);
    const job = mostRecentExperience(jobs);
    const internship = mostRecentExperience(internships);
    let next = answers;

    if (job) {
      const id = idOf(job);
      if (id) records[SavedRecord.experience] = id;
      if (serverWins || !next.experience.jobTitle.trim()) {
        const isCurrent = job.currentlyWorking === true;
        next = {
          ...next,
          experience: {
            jobTitle: str(job.jobTitle) ?? '',
            company: str(job.companyName) ?? '',
            department: next.experience.department,
            industry: next.experience.industry,
            employmentType: OnboardingCatalog.workModeToEmploymentType[str(job.workMode)?.toLowerCase() ?? ''],
            from: parseDraftDate(job.startMonthYear),
            to: isCurrent ? undefined : parseDraftDate(job.endMonthYear),
            currentlyWorkHere: isCurrent,
          },
        };
      }
    }

    if (internship) {
      const id = idOf(internship);
      if (id) records[SavedRecord.internship] = id;
      if (serverWins || !next.internship.company.trim()) {
        next = {
          ...next,
          didInternship: next.didInternship ?? true,
          internship: {
            company: str(internship.companyName) ?? '',
            role: str(internship.jobTitle) ?? '',
            from: parseDraftDate(internship.startMonthYear),
            to: parseDraftDate(internship.endMonthYear),
            description: str(internship.jobDescription) ?? '',
          },
        };
      }
    }
    return next;
  }

  private adoptProjects(
    rows: Record<string, any>[],
    records: Record<string, string>,
    answers: OnboardingAnswers,
  ): OnboardingAnswers {
    if (!rows.length) return answers;
    const unmatched = [...rows];
    const local: ProjectEntry[] = [...answers.projects];

    for (const entry of local) {
      const title = entry.title.trim().toLowerCase();
      if (!title) continue;
      const i = unmatched.findIndex((r) => (str(r.title) ?? '').trim().toLowerCase() === title);
      if (i === -1) continue;
      const row = unmatched.splice(i, 1)[0];
      const id = idOf(row);
      if (id) records[SavedRecord.project(entry.localId)] = id;
    }

    for (const row of unmatched) {
      const title = str(row.title);
      if (!title) continue;
      const entry: ProjectEntry = {
        localId: `srv_${idOf(row) ?? local.length}`,
        title,
        description: str(row.description) ?? '',
        link: str(row.linkUrl) ?? '',
        start: parseDraftDate(row.startMonthYear),
        end: parseDraftDate(row.endMonthYear),
        ongoing: row.currentlyWorking === true,
        imageKeys: Array.isArray(row.attachmentKeys) ? row.attachmentKeys.map(String).filter(Boolean) : [],
      };
      const id = idOf(row);
      const key = SavedRecord.project(entry.localId);
      if (id && records[key] == null) records[key] = id;
      local.push(entry);
    }
    return { ...answers, projects: local };
  }

  private applyWorkDetails(wd: Record<string, any>, answers: OnboardingAnswers, serverWins: boolean): OnboardingAnswers {
    if (!Object.keys(wd).length) return answers;
    let next = { ...answers };
    const takeServer = (localIsEmpty: boolean) => serverWins || localIsEmpty;

    const skills = stringList(wd.keySkills ?? wd.skills);
    if (takeServer(next.skills.length === 0) && skills.length) {
      next.skills = skills.slice(0, OnboardingCatalog.maxSkills);
    }

    const interests = stringList(wd.interests ?? wd.interest);
    if (next.interests.length === 0 && interests.length) {
      const allowed = new Set(OnboardingCatalog.interests.map((i) => i.value));
      next.interests = interests.filter((i) => allowed.has(i));
    }

    const pickLink = (local: string, server: unknown) => {
      const incoming = str(server);
      return takeServer(!local) && incoming != null ? incoming : local;
    };
    next.linkedinUrl = pickLink(next.linkedinUrl, wd.linkedinUrl);
    next.githubUrl = pickLink(next.githubUrl, wd.githubUrl);
    next.twitterUrl = pickLink(next.twitterUrl, wd.twitterUrl);
    next.websiteUrl = pickLink(next.websiteUrl, wd.personalWebsite);

    // Fill-gaps ALWAYS: the parser writes stale employers into currentCompany.
    if (!next.companyName) next.companyName = str(wd.currentCompany) ?? '';

    if (takeServer(next.rolesOpenTo.length === 0)) {
      const role = str(wd.jobRole);
      if (role) next.rolesOpenTo = [role];
    }

    // A zero salary is the backend's "never set" default.
    if (takeServer(!next.currentCtc)) {
      const v = num(wd.currentSalaryInLPA);
      if (v != null && v > 0) next.currentCtc = trimNumber(v);
    }
    if (takeServer(!next.expectedCtc)) {
      const v = num(wd.preferredSalaryInLPA);
      if (v != null && v > 0) next.expectedCtc = trimNumber(v);
    }

    const days = num(wd.noticePeriodDays);
    if (days != null) {
      const label = OnboardingCatalog.daysToNoticePeriod[Math.trunc(days)];
      if (label) {
        if (!next.noticePeriod) next.noticePeriod = label;
        if (!next.joinAvailability && OnboardingCatalog.joinAvailability.includes(label)) next.joinAvailability = label;
      }
    }

    if (!next.currentLocation) {
      const loc =
        location(wd.currentLocationDetails) ??
        location(wd.currentLocation) ??
        location(wd.location) ??
        locationFromIdAndLabel(wd.currentLocationId, wd.currentLocation);
      if (loc) next.currentLocation = loc;
    }
    if (next.preferredLocations.length === 0) {
      const raw = wd.preferredLocations ?? wd.preferredLocation;
      if (Array.isArray(raw)) {
        const locs = raw.map(location).filter((l): l is LocationResult => !!l);
        if (locs.length) next.preferredLocations = locs;
      }
    }
    return next;
  }

  /** Resolves `departmentId` / `industryId` back into dropdown labels. */
  private async applyDepartmentIndustry(wd: Record<string, any>, answers: OnboardingAnswers): Promise<OnboardingAnswers> {
    const depId = num(wd.departmentId);
    const indId = num(wd.industryId);
    if (depId == null && indId == null) return answers;
    if (answers.experience.department != null && answers.experience.industry != null) return answers;
    const catalogs = await guard('catalogs', () => this.repo.fetchExperienceCatalogs());
    if (!catalogs) return answers;
    const nameFor = (options: CatalogOption[], id?: number) =>
      id == null ? undefined : options.find((o) => o.id === Math.trunc(id))?.name;
    return {
      ...answers,
      experience: {
        ...answers.experience,
        department: answers.experience.department ?? nameFor(catalogs.departments, depId),
        industry: answers.experience.industry ?? nameFor(catalogs.industries, indId),
      },
    };
  }
}

export const onboardingHydrationService = new OnboardingHydrationService();
