import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { dartLocalIso, utcMidnightIso } from '@/core/helpers/dates';
import type { ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { FormValidators } from '@/core/utils/formValidators';
import { catalogOptionFromJson, type CatalogOption, type ExperienceCatalogs } from './models/catalogOption';
import { locationResultFromJson, type LocationResult } from './models/locationResult';

/** Default category for onboarding skills (skill/create-batch needs one). */
export const kOnboardingSkillCategory = 'Top skills';

/**
 * Pulls the new record's id out of a create response — every plausible
 * spelling is tried; null is handled by the caller.
 */
export function createdRecordId(body: any): string | null {
  const data = body && typeof body === 'object' ? (body.data && typeof body.data === 'object' ? body.data : body) : null;
  if (!data) return null;
  const id = data.id ?? data._id ?? data.experienceId ?? data.educationId ?? data.projectId;
  const s = id?.toString();
  return s ? s : null;
}

export class OnboardingRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async searchLocations(query: string, limit = 10): Promise<LocationResult[]> {
    const res = await this.client.get(ApiConstants.resumeLocations, { params: { q: query, limit } });
    const data = res.data?.data;
    return Array.isArray(data) ? data.filter((e) => e && typeof e === 'object').map(locationResultFromJson) : [];
  }

  async searchJobTitles(query: string): Promise<string[]> {
    const res = await this.client.get(ApiConstants.resumeUserJobTitles, { params: { jobTitle: query } });
    const data = res.data?.data;
    return Array.isArray(data) ? data.filter((e): e is string => typeof e === 'string') : [];
  }

  async saveCurrentLocation(locationId: string) {
    await this.client.put(ApiConstants.resumeCurrentLocation, { data: { locationId } });
  }

  async savePreferredLocations(locationIds: string[]) {
    await this.client.put(ApiConstants.resumePreferredLocation, { data: { locationIds } });
  }

  async saveJobStatus(status: string) {
    await this.client.put(ApiConstants.resumeUpdateJobSeekingStatus, { data: { jobSeekingStatus: status } });
  }

  async saveJobRole(role: string) {
    await this.client.put(ApiConstants.resumeUpdateJobRole, { data: { jobRole: role } });
  }

  /** Fields can be sent individually or together. */
  async saveCompensation(p: { currentSalaryLPA?: number; preferredSalaryLPA?: number; noticePeriodDays?: number }) {
    const body: Record<string, unknown> = {};
    if (p.noticePeriodDays != null) body.noticePeriodDays = p.noticePeriodDays;
    if (p.currentSalaryLPA != null) body.currentSalaryInLPA = p.currentSalaryLPA;
    if (p.preferredSalaryLPA != null) body.preferredSalaryInLPA = p.preferredSalaryLPA;
    await this.client.put(ApiConstants.resumeCompensation, { data: body });
  }

  /** `PUT .../key-skills` — the flat top-5 list. */
  async saveKeySkills(skills: string[]) {
    await this.client.put(ApiConstants.resumeKeySkills, { data: { keySkills: skills } });
  }

  /** `POST .../skill/create-batch` — the SAME skills as categorised records. */
  async saveSkillRecords(skills: string[]) {
    if (!skills.length) return;
    await this.client.post(ApiConstants.resumeCreateSkillBatch, {
      data: { skills: skills.map((s) => ({ name: s, category: kOnboardingSkillCategory })) },
    });
  }

  async fetchExperienceCatalogs(): Promise<ExperienceCatalogs> {
    const dep = await this.client.get(ApiConstants.resumeDepartments);
    const ind = await this.client.get(ApiConstants.resumeIndustries);
    return {
      departments: extractCatalogOptions(dep.data, 'department'),
      industries: extractCatalogOptions(ind.data, 'industry'),
    };
  }

  async saveGender(gender: string) {
    await this.client.patch(ApiConstants.userGender, { data: { gender } });
  }

  /**
   * An EMPTY body NULLS every link server-side, so the call is skipped when
   * there's nothing to save. Spec spells `gitlabUrl` lowercase.
   */
  async saveProfileLinks(p: {
    linkedinUrl?: string;
    githubUrl?: string;
    twitterUrl?: string;
    personalWebsite?: string;
    stackOverflowUrl?: string;
    leetcodeUrl?: string;
    gitLabUrl?: string;
  }) {
    const body: Record<string, string> = {};
    if (p.linkedinUrl) body.linkedinUrl = p.linkedinUrl;
    if (p.githubUrl) body.githubUrl = p.githubUrl;
    if (p.twitterUrl) body.twitterUrl = p.twitterUrl;
    if (p.personalWebsite) body.personalWebsite = p.personalWebsite;
    if (p.stackOverflowUrl) body.stackOverflowUrl = p.stackOverflowUrl;
    if (p.leetcodeUrl) body.leetcodeUrl = p.leetcodeUrl;
    if (p.gitLabUrl) body.gitlabUrl = p.gitLabUrl;
    if (Object.keys(body).length === 0) return;
    await this.client.put(ApiConstants.resumeProfileLinks, { data: body });
  }

  /** `PATCH /user/onboarding-progress` — the resume marker. */
  async saveOnboardingProgress(p: { lastStep: string; branch?: string | null; meta?: Record<string, unknown> }) {
    await this.client.patch(ApiConstants.userOnboardingProgress, {
      data: {
        lastStep: p.lastStep,
        ...(p.branch != null ? { branch: p.branch } : {}),
        ...(p.meta && Object.keys(p.meta).length > 0 ? { meta: p.meta } : {}),
      },
    });
  }

  /** `PUT /user/open-to` — WORK or HIRE. */
  async saveOpenTo(openTo: string) {
    await this.client.put(ApiConstants.userUpdateOpenTo, { data: { openTo } });
  }

  /** `PUT .../onboarding-fresher` — a marker with **no body**. */
  async markOnboardingFresher() {
    await this.client.put(ApiConstants.resumeOnboardingFresher);
  }

  async saveUserTitle(userTitle: string) {
    await this.client.put(ApiConstants.userUpdate, { data: { userTitle } });
  }

  async saveBio(bio: string) {
    await this.client.put(ApiConstants.userUpdateBio, { data: { bio } });
  }

  async saveCurrentCompany(currentCompany: string) {
    await this.client.put(ApiConstants.resumeUpdateCurrentCompany, { data: { currentCompany } });
  }

  async saveInterests(interests: string[]) {
    await this.client.put(ApiConstants.resumeInterest, { data: { interests } });
  }

  /**
   * `POST /education` or `PUT /education/{id}`. The body mirrors the web
   * client's full seven-key shape (explicit nulls) — do not go back to
   * conditional inclusion.
   */
  async upsertEducation(p: {
    school: string;
    degreeName?: string;
    fieldOfStudyName?: string;
    yearOrStatus?: string;
    endDate?: Date;
    id?: string;
  }): Promise<string | null> {
    const orNull = (v?: string) => (v == null || !v.trim() ? null : v.trim());
    const status = orNull(p.yearOrStatus);
    const body: Record<string, unknown> = {
      school: p.school,
      degreeName: orNull(p.degreeName),
      fieldOfStudyName: orNull(p.fieldOfStudyName),
      grade: status,
      endDate: p.endDate ? utcMidnightIso(p.endDate) : null,
      description: status == null ? null : `Status: ${status}`,
    };
    if (p.id != null) {
      await this.client.put(ApiConstants.educationUpdate(p.id), { data: body });
      return p.id;
    }
    body.startDate = null;
    const res = await this.client.post(ApiConstants.educationCreate, { data: body });
    const saved = res.data?.data?.school?.toString();
    if (__DEV__ && saved && saved.trim().toLowerCase() !== p.school.trim().toLowerCase()) {
      console.log(`⚠️ education create ignored the body: sent "${p.school}", stored "${saved}".`);
    }
    return createdRecordId(res.data);
  }

  /** `POST /experience` — also used for the internship (`workMode: internship`). */
  async upsertExperience(p: {
    companyName: string;
    jobTitle: string;
    workMode: string;
    currentlyWorking: boolean;
    startMonthYear: Date;
    endMonthYear?: Date;
    jobDescription?: string;
    locationType?: string;
    id?: string;
  }): Promise<string | null> {
    const body: Record<string, unknown> = {
      companyName: p.companyName,
      jobTitle: p.jobTitle,
      workMode: p.workMode,
      locationType: p.locationType ?? 'onsite',
      currentlyWorking: p.currentlyWorking,
      startMonthYear: dartLocalIso(p.startMonthYear),
      ...(p.endMonthYear ? { endMonthYear: dartLocalIso(p.endMonthYear) } : {}),
      ...(p.jobDescription ? { jobDescription: p.jobDescription } : {}),
    };
    if (p.id != null) {
      await this.client.put(ApiConstants.experienceUpdate(p.id), { data: body });
      return p.id;
    }
    const res = await this.client.post(ApiConstants.experienceCreate, { data: body });
    return createdRecordId(res.data);
  }

  async saveDepartmentIndustry(departmentId: number, industryId: number) {
    await this.client.put(ApiConstants.resumeDepartmentIndustry, { data: { departmentId, industryId } });
  }

  /** `POST /projects` — `attachmentKeys` are already-uploaded S3 keys. */
  async upsertProject(p: {
    title: string;
    description?: string;
    linkUrl?: string;
    startMonthYear?: Date;
    endMonthYear?: Date;
    currentlyWorking?: boolean;
    attachmentKeys?: string[];
    id?: string;
  }): Promise<string | null> {
    const link = !p.linkUrl || !p.linkUrl.trim() ? null : FormValidators.normalizeUrl(p.linkUrl);
    const body: Record<string, unknown> = {
      title: p.title,
      attachmentKeys: p.attachmentKeys ?? [],
      ...(p.description ? { description: p.description } : {}),
      ...(link ? { linkUrl: link } : {}),
      currentlyWorking: p.currentlyWorking ?? false,
      ...(p.startMonthYear ? { startMonthYear: dartLocalIso(p.startMonthYear) } : {}),
      ...(p.endMonthYear ? { endMonthYear: dartLocalIso(p.endMonthYear) } : {}),
    };
    if (p.id != null) {
      await this.client.put(ApiConstants.projectUpdate(p.id), { data: body });
      return p.id;
    }
    const res = await this.client.post(ApiConstants.projectsCreate, { data: body });
    return createdRecordId(res.data);
  }

  /** Presigned S3 PUT for a project image → `{uploadUrl, key}`. */
  async projectImageUploadUrl(extension: string, contentType: string): Promise<{ uploadUrl: string; key: string } | null> {
    const res = await this.client.get(ApiConstants.projectsMediaUploadUrl, { params: { extension, contentType } });
    const data = res.data?.data;
    if (!data || typeof data !== 'object') return null;
    const url = (data.uploadUrl ?? data.url ?? data.signedUrl)?.toString();
    const key = (data.key ?? data.fileKey ?? data.objectKey)?.toString();
    if (!url || !key) return null;
    return { uploadUrl: url, key };
  }

  // ── Read-back (hydration) ──

  async fetchWorkDetails(): Promise<Record<string, any>> {
    const res = await this.client.get(ApiConstants.resumeWorkDetailsMe);
    const data = res.data?.data;
    return data && typeof data === 'object' ? data : {};
  }

  fetchEducation() {
    return this.fetchList(ApiConstants.educationAll);
  }

  fetchExperience() {
    return this.fetchList(ApiConstants.experienceAll);
  }

  fetchProjects() {
    return this.fetchList(ApiConstants.projectsAll);
  }

  private async fetchList(path: string): Promise<Record<string, any>[]> {
    const res = await this.client.get(path);
    const data = res.data?.data;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === 'object'
        ? (data.items ?? data.rows ?? data.results)
        : null;
    return Array.isArray(list) ? list.filter((e) => e && typeof e === 'object') : [];
  }

  // ── Deletes ──

  deleteEducation(id: string) {
    return this.client.delete(ApiConstants.educationDelete(id));
  }

  deleteExperience(id: string) {
    return this.client.delete(ApiConstants.experienceDelete(id));
  }

  deleteProject(id: string) {
    return this.client.delete(ApiConstants.projectDelete(id));
  }
}

function extractCatalogOptions(responseData: any, fieldLabel: string): CatalogOption[] {
  const raw = responseData && typeof responseData === 'object' ? responseData.data : null;
  if (!Array.isArray(raw)) {
    throw new RepositoryException(`Could not load ${fieldLabel} options right now. Please try again.`);
  }
  const items = raw.filter((i) => i && typeof i === 'object').map(catalogOptionFromJson).filter((i) => i.name);
  if (!items.length) {
    throw new RepositoryException(`Could not load any ${fieldLabel} options right now. Please try again.`);
  }
  return items;
}

export const onboardingRepository = new OnboardingRepository();
