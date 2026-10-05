import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { isoYearMonth, tryParseDate } from '@/core/helpers/dates';
import { monthShortNames } from '@/core/helpers/relativeTime';
import { serverMessage, statusOf, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { canonicalCurrentCompany, sortEducationsNewestFirst, sortExperiencesNewestFirst } from './experienceOrdering';
import {
  makeProfileEntry,
  makeUserProfile,
  profileLinksFromWorkDetails,
  type LanguageEntry,
  type ProfileEdit,
  type ProfileEntry,
  type ProfileProject,
  type UserProfile,
} from './profileModels';

const nonEmpty = (v: unknown): string | undefined => {
  const s = v == null ? '' : String(v).trim();
  return s ? s : undefined;
};
const dataOf = (body: any): Record<string, any> | undefined =>
  body && typeof body === 'object' && body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : undefined;
const nameOf = (ref: unknown): string => (ref && typeof ref === 'object' ? String((ref as any).name ?? '') : ref == null ? '' : String(ref));
const idOf = (m: Record<string, any>) => nonEmpty(m.id ?? m._id ?? m.experienceId ?? m.educationId);
const parseDate = (iso: unknown) => (iso == null || String(iso) === '' ? undefined : tryParseDate(String(iso)));

function mapList<T>(raw: unknown, map: (m: Record<string, any>) => T | undefined): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object') {
      const v = map(item);
      if (v !== undefined) out.push(v);
    }
  }
  return out;
}

const stringList = (raw: unknown) => (Array.isArray(raw) ? raw.map((e) => (e == null ? '' : String(e))).filter(Boolean) : []);

function stringMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k).trim().toUpperCase();
    const val = v == null ? '' : String(v).trim();
    if (key && val) out[key] = val;
  }
  return out;
}

function monthYear(iso: unknown): string | undefined {
  const ym = isoYearMonth(iso);
  return ym ? `${monthShortNames[ym.month - 1]} ${ym.year}` : undefined;
}

/** "May 2026 – Present" / "Sep 2024 – Jun 2025". */
function formatRange(start: unknown, end: unknown, currently: boolean): string | undefined {
  const from = monthYear(start);
  const to = currently ? 'Present' : monthYear(end);
  if (!from && !to) return undefined;
  if (!from) return to;
  if (!to) return from;
  return `${from} – ${to}`;
}

function locationIdOf(m: Record<string, any>): string | undefined {
  const flat = nonEmpty(m.locationId);
  if (flat) return flat;
  const loc = m.location;
  if (loc && typeof loc === 'object') return nonEmpty(loc.id);
  return undefined;
}

function locationLabelOf(m: Record<string, any>): string | undefined {
  const loc = m.location;
  if (typeof loc === 'string') return loc.trim() || undefined;
  if (loc && typeof loc === 'object') {
    const label = nonEmpty(loc.label);
    if (label) return label;
    const parts = [loc.city, loc.state, loc.country].map((e) => (e == null ? '' : String(e))).filter(Boolean).join(', ');
    return parts || undefined;
  }
  return undefined;
}

function mapExperience(e: Record<string, any>): ProfileEntry | undefined {
  const title = String(e.jobTitle ?? '');
  const company = String(e.companyName ?? '');
  if (!title && !company) return undefined;
  const currently = e.currentlyWorking === true;
  const desc = String(e.jobDescription ?? '').trim();
  return makeProfileEntry({
    title,
    subtitle: company,
    meta: formatRange(e.startMonthYear, e.endMonthYear, currently),
    trailingBadge: currently ? 'Now' : undefined,
    bullets: desc ? [desc] : [],
    id: idOf(e),
    startDate: parseDate(e.startMonthYear),
    endDate: currently ? undefined : parseDate(e.endMonthYear),
    currentlyWorking: currently,
    accentColorHex: e.accentColor?.toString(),
    locationId: locationIdOf(e),
    locationLabel: locationLabelOf(e),
    workMode: e.workMode?.toString(),
    locationType: e.locationType?.toString(),
    description: desc,
  });
}

function mapEducation(e: Record<string, any>): ProfileEntry | undefined {
  const school = String(e.school ?? '');
  if (!school) return undefined;
  const degree = nameOf(e.degree) || String(e.degreeName ?? '');
  const field = nameOf(e.fieldOfStudy) || String(e.fieldOfStudyName ?? '');
  const grade = e.grade?.toString();
  return makeProfileEntry({
    title: school,
    subtitle: [degree, field].filter(Boolean).join(' · '),
    meta: formatRange(e.startDate, e.endDate, false),
    trailingBadge: grade ? grade : undefined,
    id: idOf(e),
    startDate: parseDate(e.startDate),
    endDate: parseDate(e.endDate),
    accentColorHex: e.accentColor?.toString(),
    locationId: locationIdOf(e),
    locationLabel: locationLabelOf(e),
    degreeName: degree,
    fieldOfStudyName: field,
    grade,
    description: e.description?.toString(),
  });
}

/** Proficiency level → bar fill. */
export function progressForLevel(level: string): number {
  switch (level.trim().toLowerCase()) {
    case 'native':
      return 1.0;
    case 'fluent':
      return 0.85;
    case 'professional':
      return 0.8;
    case 'intermediate':
      return 0.6;
    case 'conversational':
      return 0.45;
    default:
      return 0.55;
  }
}

function mapLanguage(l: Record<string, any>): LanguageEntry | undefined {
  const name = String(l.name ?? l.language ?? '');
  if (!name) return undefined;
  const level = String(l.level ?? l.proficiency ?? '');
  return { name, level, progress: typeof l.progress === 'number' ? l.progress : progressForLevel(level) };
}

/** Groups `skills[]` into `{CATEGORY: [names]}`. */
function groupSkills(raw: unknown): Record<string, string[]> {
  if (!Array.isArray(raw)) return {};
  const grouped: Record<string, string[]> = {};
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const name = String((item as any).name ?? '');
    if (!name) continue;
    const cat = String((item as any).categoryName ?? '').trim().toUpperCase();
    const key = cat || 'OTHER';
    (grouped[key] ??= []).push(name);
  }
  return grouped;
}

function coverAttachment(p: Record<string, any>): Record<string, any> | undefined {
  const atts = p.attachments;
  if (!Array.isArray(atts) || !atts.length) return undefined;
  const cover = atts.find((a) => a && typeof a === 'object' && a.isCover === true);
  if (cover) return cover;
  return atts[0] && typeof atts[0] === 'object' ? atts[0] : undefined;
}

function coverUrlOf(p: Record<string, any>): string | undefined {
  const direct = nonEmpty(p.imageUrl) ?? nonEmpty(p.coverUrl);
  if (direct) return direct;
  const c = coverAttachment(p);
  return c ? nonEmpty(c.imageUrl) ?? nonEmpty(c.url) ?? nonEmpty(c.signedUrl) : undefined;
}

/** Attachment keys, cover first. */
function attachmentKeys(p: Record<string, any>): string[] {
  const out: string[] = [];
  if (Array.isArray(p.attachments)) {
    const sorted = p.attachments
      .filter((a: unknown) => a && typeof a === 'object')
      .sort((a: any, b: any) => (b.isCover === true ? 1 : 0) - (a.isCover === true ? 1 : 0));
    for (const a of sorted) {
      const k = nonEmpty(a.imageKey) ?? nonEmpty(a.key);
      if (k) out.push(k);
    }
  }
  if (!out.length && Array.isArray(p.attachmentKeys)) {
    for (const k of p.attachmentKeys) {
      const s = nonEmpty(k);
      if (s) out.push(s);
    }
  }
  return out;
}

function hostOf(url: string): string | undefined {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url);
  return m ? m[1] : undefined;
}

function projectSubtitle(start: Date | undefined, end: Date | undefined, currently: boolean, linkUrl?: string): string {
  if (start) {
    const endLabel = currently ? 'Present' : end ? `${end.getFullYear()}` : '';
    return endLabel ? `${start.getFullYear()}–${endLabel}` : `${start.getFullYear()}`;
  }
  if (linkUrl) {
    const host = hostOf(linkUrl);
    if (host) return host.replace('www.', '');
  }
  return 'Project';
}

export function mapProject(p: Record<string, any>): ProfileProject | undefined {
  const title = String(p.title ?? '');
  if (!title) return undefined;
  const start = parseDate(p.startMonthYear);
  const end = parseDate(p.endMonthYear);
  const currently = p.currentlyWorking === true;
  const linkUrl = nonEmpty(p.linkUrl);
  return {
    title,
    subtitle: projectSubtitle(start, end, currently, linkUrl),
    id: idOf(p) ?? nonEmpty(p.projectId),
    description: nonEmpty(p.description),
    linkUrl,
    coverUrl: coverUrlOf(p),
    attachmentKeys: attachmentKeys(p),
    currentlyWorking: currently,
    startDate: start,
    endDate: end,
    experienceId: nonEmpty(p.experienceId),
    sortOrder: typeof p.sortOrder === 'number' ? Math.trunc(p.sortOrder) : undefined,
  };
}

function buildProfile(
  u: Record<string, any>,
  wd: Record<string, any> | undefined,
  projects: ProfileProject[],
  opts: { banner?: string; overrideName?: string; overrideTitle?: string } = {},
): UserProfile {
  const slug = String(u.userId ?? '');
  const experiences = sortExperiencesNewestFirst(mapList(wd?.experience, mapExperience));
  const educations = sortEducationsNewestFirst(mapList(wd?.education, mapEducation));
  return makeUserProfile({
    id: String(u.id ?? ''),
    userId: slug,
    name: opts.overrideName ?? String(u.name ?? ''),
    title: opts.overrideTitle ?? String(u.userTitle ?? ''),
    profilePic: String(u.profilePic ?? ''),
    banner: opts.banner ?? nonEmpty(u.banner),
    location: wd?.currentLocation?.toString(),
    company: canonicalCurrentCompany(experiences, String(wd?.currentCompany ?? '')),
    department: nameOf(wd?.department),
    industry: nameOf(wd?.industry),
    handle: slug ? `@${slug}` : '',
    website: String(wd?.personalWebsite ?? ''),
    about: String(u.bio ?? ''),
    openToWork: wd?.jobSeekingStatus?.toString() === 'active',
    impressionCount: typeof u.impressionCount === 'number' ? Math.trunc(u.impressionCount) : 0,
    experiences,
    educations,
    skills: stringList(wd?.keySkills),
    categorizedSkills: groupSkills(wd?.skills),
    languages: mapList(wd?.languages, mapLanguage),
    technicalSkills: [],
    projects,
    links: profileLinksFromWorkDetails(wd),
    bannerColor: nonEmpty(wd?.profileBannerColor),
    skillCategoryColors: stringMap(wd?.skillCategoryAccentColors),
    introMediaUrl: nonEmpty(wd?.introMediaUrl),
    introMediaType: nonEmpty(wd?.introMediaType),
    introMediaPublic: wd?.introMediaPublic === true,
  });
}

function messageFor(e: unknown): string {
  const msg = serverMessage(e);
  if (statusOf(e) === 401) return msg ?? 'Please sign in again to see your profile.';
  return msg ?? 'Could not load your profile. Check your connection and try again.';
}

/**
 * API-backed profile repository: `/auth/session` identity + `work-details/me`
 * + projects. Updates write only changed fields with documented routes.
 */
export class ProfileRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** Optimistic name/title overlay while `/auth/session` lags after `PUT /user`. */
  private pendingName?: string;
  private pendingTitle?: string;
  private staleNameBefore?: string;
  private staleTitleBefore?: string;
  private lastSessionName?: string;
  private lastSessionTitle?: string;
  /** Raw `currentCompany` as last read (drift repair on Save). */
  private serverCurrentCompany?: string;

  async getMyProfile(): Promise<UserProfile> {
    try {
      const session = await this.client.get(ApiConstants.auth(ApiConstants.authSession));
      const user = dataOf(session.data)?.user;
      if (!user || typeof user !== 'object') throw new RepositoryException('Could not load your profile.');
      const res = await this.client.get(ApiConstants.resume(ApiConstants.resumeWorkDetailsMe));
      const wd = dataOf(res.data);
      this.serverCurrentCompany = wd?.currentCompany?.toString() ?? '';
      const projects = await this.fetchProjects();
      const banner = nonEmpty(user.banner) ?? (await this.fetchBanner(String(user.userId ?? '')));
      const sessionName = String(user.name ?? '');
      const sessionTitle = String(user.userTitle ?? '');
      this.lastSessionName = sessionName;
      this.lastSessionTitle = sessionTitle;
      this.reconcilePendingIdentity(sessionName, sessionTitle);
      return buildProfile(user, wd, projects, { banner, overrideName: this.pendingName, overrideTitle: this.pendingTitle });
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(messageFor(e), { cause: e });
    }
  }

  /** Read-only profile of another user by their public handle. */
  async getPublicProfile(handle: string): Promise<UserProfile> {
    if (!handle) throw new RepositoryException('Could not load this profile.');
    try {
      const userRes = await this.client.get(ApiConstants.auth(ApiConstants.userPublicProfile(handle)));
      const data = dataOf(userRes.data);
      const u = data?.user && typeof data.user === 'object' ? data.user : data ?? {};
      if (!Object.keys(u).length) throw new RepositoryException('This profile could not be found.');
      let wd: Record<string, any> | undefined;
      try {
        const wdRes = await this.client.get(ApiConstants.resume(ApiConstants.resumeWorkDetailsPublic(handle)));
        wd = dataOf(wdRes.data);
      } catch {
        wd = undefined;
      }
      const projects = await this.fetchPublicProjects(handle);
      return buildProfile(u, wd, projects, { banner: nonEmpty(u.banner) });
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(messageFor(e), { cause: e });
    }
  }

  private async fetchPublicProjects(handle: string): Promise<ProfileProject[]> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.projectsAllByUser(handle)));
      const body = res.data;
      const raw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
      return mapList(raw, mapProject);
    } catch {
      return [];
    }
  }

  private async fetchBanner(slug: string): Promise<string | undefined> {
    if (!slug) return undefined;
    try {
      const res = await this.client.get(ApiConstants.auth(ApiConstants.userPublicProfile(slug)));
      const map = dataOf(res.data);
      if (!map) return undefined;
      const nested = map.user;
      return nonEmpty(map.banner ?? (nested && typeof nested === 'object' ? nested.banner : undefined));
    } catch {
      return undefined;
    }
  }

  private async fetchProjects(): Promise<ProfileProject[]> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.projectsAll));
      const body = res.data;
      const raw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
      return mapList(raw, mapProject);
    } catch {
      return [];
    }
  }

  async updateProfile(edit: ProfileEdit): Promise<UserProfile> {
    const current = await this.getMyProfile();
    const failures: string[] = [];
    const putField = async (path: string, body: Record<string, unknown>, label: string) => {
      try {
        await this.client.put(path, { data: body });
      } catch {
        failures.push(label);
      }
    };

    if (edit.name !== current.name || edit.headline !== current.title) {
      const before = failures.length;
      await putField(
        ApiConstants.auth(ApiConstants.userUpdate),
        { name: edit.name, userTitle: edit.headline, profilePic: current.profilePic },
        'Name/Title',
      );
      if (failures.length === before) {
        this.pendingName = edit.name;
        this.pendingTitle = edit.headline;
        this.staleNameBefore = this.lastSessionName ?? current.name;
        this.staleTitleBefore = this.lastSessionTitle ?? current.title;
      }
    }
    if (edit.about !== current.about) {
      await putField(ApiConstants.auth(ApiConstants.userUpdateBio), { bio: edit.about }, 'Bio');
    }
    if (edit.company.trim() !== (this.serverCurrentCompany ?? current.company).trim()) {
      const before = failures.length;
      await putField(ApiConstants.resume(ApiConstants.resumeUpdateCurrentCompany), { currentCompany: edit.company }, 'Company');
      if (failures.length === before) this.serverCurrentCompany = edit.company;
    }
    if (edit.website !== current.website) {
      await putField(ApiConstants.resume(ApiConstants.resumePersonalWebsite), { personalWebsite: edit.website }, 'Website');
    }
    if (edit.openToWork !== current.openToWork) {
      await putField(
        ApiConstants.resume(ApiConstants.resumeUpdateJobSeekingStatus),
        { jobSeekingStatus: edit.openToWork ? 'active' : 'inactive' },
        'Open to Work',
      );
    }
    if (edit.locationId) {
      await putField(ApiConstants.resume(ApiConstants.resumeCurrentLocation), { locationId: edit.locationId }, 'Location');
    }
    if (failures.length) throw new RepositoryException(`Could not save: ${failures.join(', ')}.`);
    return this.getMyProfile();
  }

  private reconcilePendingIdentity(sessionName: string, sessionTitle: string) {
    if (this.pendingName != null) {
      if (sessionName === this.pendingName || (this.staleNameBefore != null && sessionName !== this.staleNameBefore)) {
        this.pendingName = undefined;
        this.staleNameBefore = undefined;
      }
    }
    if (this.pendingTitle != null) {
      if (sessionTitle === this.pendingTitle || (this.staleTitleBefore != null && sessionTitle !== this.staleTitleBefore)) {
        this.pendingTitle = undefined;
        this.staleTitleBefore = undefined;
      }
    }
  }
}

export const profileRepository = new ProfileRepository();
