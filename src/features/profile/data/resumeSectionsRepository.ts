import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { utcMidnightIso } from '@/core/helpers/dates';
import { serverMessage, statusOf, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { putFileToS3 } from '@/core/network/s3Uploader';
import { notifySprintOfProfileUpdate } from '@/features/readinessSprint/providers/sprintProviders';

export interface SkillInput {
  name: string;
  category: string;
}

/** proficiency ∈ Native · Professional · Intermediate · Conversational */
export interface LanguageInput {
  name: string;
  proficiency: string;
}

export interface LocationOption {
  id: string;
  label: string;
}

/** UTC midnight of the same Y/M/D so a month-year choice round-trips. */
export const isoDateOnly = utcMidnightIso;

export interface ExperienceInput {
  jobTitle: string;
  companyName: string;
  workMode: string;
  locationType: string;
  startDate?: Date;
  endDate?: Date;
  currentlyWorking: boolean;
  jobDescription?: string;
  accentColorHex?: string;
  locationId?: string;
}

export function experienceInputToJson(i: ExperienceInput): Record<string, unknown> {
  return {
    jobTitle: i.jobTitle,
    companyName: i.companyName,
    workMode: i.workMode,
    locationType: i.locationType,
    currentlyWorking: i.currentlyWorking,
    ...(i.startDate ? { startMonthYear: isoDateOnly(i.startDate) } : {}),
    ...(!i.currentlyWorking && i.endDate ? { endMonthYear: isoDateOnly(i.endDate) } : {}),
    ...(i.jobDescription?.trim() ? { jobDescription: i.jobDescription.trim() } : {}),
    ...(i.accentColorHex != null ? { accentColor: i.accentColorHex } : {}),
    ...(i.locationId ? { locationId: i.locationId } : {}),
  };
}

export interface EducationInput {
  school: string;
  degreeName?: string;
  fieldOfStudyName?: string;
  startDate?: Date;
  endDate?: Date;
  grade?: string;
  description?: string;
  accentColorHex?: string;
  locationId?: string;
}

/** Update payload: only filled keys. */
export function educationInputToJson(i: EducationInput): Record<string, unknown> {
  return {
    school: i.school,
    ...(i.degreeName?.trim() ? { degreeName: i.degreeName.trim() } : {}),
    ...(i.fieldOfStudyName?.trim() ? { fieldOfStudyName: i.fieldOfStudyName.trim() } : {}),
    ...(i.startDate ? { startDate: isoDateOnly(i.startDate) } : {}),
    ...(i.endDate ? { endDate: isoDateOnly(i.endDate) } : {}),
    ...(i.grade?.trim() ? { grade: i.grade.trim() } : {}),
    ...(i.description?.trim() ? { description: i.description.trim() } : {}),
    ...(i.accentColorHex != null ? { accentColor: i.accentColorHex } : {}),
    ...(i.locationId ? { locationId: i.locationId } : {}),
  };
}

const orNull = (v?: string) => (v == null || !v.trim() ? null : v.trim());

/** Create payload: all seven keys on the wire, explicit nulls included. */
export function educationInputToCreateJson(i: EducationInput): Record<string, unknown> {
  return {
    school: i.school,
    degreeName: orNull(i.degreeName),
    fieldOfStudyName: orNull(i.fieldOfStudyName),
    grade: orNull(i.grade),
    description: orNull(i.description),
    startDate: i.startDate ? isoDateOnly(i.startDate) : null,
    endDate: i.endDate ? isoDateOnly(i.endDate) : null,
    ...(i.accentColorHex != null ? { accentColor: i.accentColorHex } : {}),
    ...(i.locationId ? { locationId: i.locationId } : {}),
  };
}

function newId(body: any): string | null {
  const data = body && typeof body === 'object' ? (body.data && typeof body.data === 'object' ? body.data : body) : null;
  if (!data) return null;
  const id = data.id ?? data._id ?? data.experienceId ?? data.educationId;
  const s = id?.toString();
  return s ? s : null;
}

function messageFor(e: unknown, action: string): string {
  if (statusOf(e) === 401) return `Please sign in again to ${action}.`;
  return serverMessage(e) ?? `Couldn't ${action}. Check your connection and try again.`;
}

/**
 * Write paths for the structured profile sections (skills, languages,
 * experience, education, links, theme, intro media). Hiring-relevant edits
 * re-arm the Job Readiness Sprint.
 */
export class ResumeSectionsRepository {
  constructor(
    private readonly client: ApiClient = apiClient,
    private readonly onHiringSignalChanged: () => void = notifySprintOfProfileUpdate,
  ) {}

  private hiringSignalChanged() {
    try {
      this.onHiringSignalChanged();
    } catch {
      // never break the edit
    }
  }

  async searchSkillCategories(query: string): Promise<string[]> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.skillCategories), { params: { category: query } });
      const data = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data.data : res.data;
      return Array.isArray(data) ? data.map((e) => (e == null ? '' : String(e))).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  async searchLocations(query: string, limit = 12): Promise<LocationOption[]> {
    if (!query.trim()) return [];
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.resumeLocations), { params: { q: query.trim(), limit } });
      const data = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data.data : res.data;
      if (!Array.isArray(data)) return [];
      const out: LocationOption[] = [];
      for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        const id = String(item.id ?? '');
        if (!id) continue;
        const label = String(item.label ?? '').trim()
          ? String(item.label)
          : [item.city, item.state, item.country].map((e: unknown) => (e == null ? '' : String(e))).filter(Boolean).join(', ');
        out.push({ id, label: label || id });
      }
      return out;
    } catch {
      return [];
    }
  }

  async createExperience(input: ExperienceInput): Promise<string | null> {
    try {
      const res = await this.client.post(ApiConstants.resume(ApiConstants.experienceCreate), { data: experienceInputToJson(input) });
      this.hiringSignalChanged();
      return newId(res.data);
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'add this experience'), { cause: e });
    }
  }

  async updateExperience(id: string, input: ExperienceInput) {
    try {
      await this.client.put(ApiConstants.resume(ApiConstants.experienceUpdate(id)), { data: experienceInputToJson(input) });
      this.hiringSignalChanged();
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'save this experience'), { cause: e });
    }
  }

  async deleteExperience(id: string) {
    try {
      await this.client.delete(ApiConstants.resume(ApiConstants.experienceDelete(id)));
      this.hiringSignalChanged();
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'remove this experience'), { cause: e });
    }
  }

  async createEducation(input: EducationInput): Promise<string | null> {
    try {
      const res = await this.client.post(ApiConstants.resume(ApiConstants.educationCreate), { data: educationInputToCreateJson(input) });
      return newId(res.data);
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'add this education'), { cause: e });
    }
  }

  async updateEducation(id: string, input: EducationInput) {
    try {
      await this.client.put(ApiConstants.resume(ApiConstants.educationUpdate(id)), { data: educationInputToJson(input) });
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'save this education'), { cause: e });
    }
  }

  async deleteEducation(id: string) {
    try {
      await this.client.delete(ApiConstants.resume(ApiConstants.educationDelete(id)));
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'remove this education'), { cause: e });
    }
  }

  async addSkills(skills: SkillInput[]) {
    if (!skills.length) return;
    try {
      await this.client.post(ApiConstants.resume(ApiConstants.resumeCreateSkillBatch), {
        data: { skills: skills.map((s) => ({ name: s.name, category: s.category })) },
      });
      this.hiringSignalChanged();
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'add your skills'), { cause: e });
    }
  }

  async deleteSkills(names: string[]) {
    if (!names.length) return;
    try {
      await this.client.post(ApiConstants.resume(ApiConstants.resumeDeleteSkillBatch), { data: { names } });
      this.hiringSignalChanged();
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'remove a skill'), { cause: e });
    }
  }

  /** Partial update; explicit null clears a link. */
  async updateProfileLinks(fields: Record<string, string | null>) {
    if (!Object.keys(fields).length) return;
    try {
      await this.client.put(ApiConstants.resume(ApiConstants.resumeProfileLinks), { data: fields });
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'save your links'), { cause: e });
    }
  }

  async updateProfileBannerColor(hex: string) {
    try {
      await this.client.put(ApiConstants.resume(ApiConstants.resumeProfileTheme), { data: { profileBannerColor: hex } });
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'save your cover colour'), { cause: e });
    }
  }

  async updateSkillCategoryColors(colors: Record<string, string>) {
    if (!Object.keys(colors).length) return;
    try {
      await this.client.put(ApiConstants.resume(ApiConstants.resumeProfileTheme), { data: { skillCategoryAccentColors: colors } });
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'save your skill colours'), { cause: e });
    }
  }

  /** Presign → S3 → save. Resolves the saved media URL. */
  async uploadIntroMedia(p: { filePath: string; mediaType: string; extension: string; contentType: string; isPublic?: boolean }): Promise<string> {
    try {
      const presign = await this.client.get(ApiConstants.resume(ApiConstants.resumeIntroMediaUploadUrl), {
        params: { mediaType: p.mediaType, extension: p.extension, contentType: p.contentType },
      });
      const map = presign.data?.data && typeof presign.data.data === 'object' ? presign.data.data : null;
      const uploadUrl = (map?.uploadUrl ?? map?.url ?? map?.signedUrl)?.toString();
      if (!uploadUrl) throw new RepositoryException("Couldn't prepare the media upload.");
      await putFileToS3({ uploadUrl, filePath: p.filePath, contentType: p.contentType });
      const saved = (map?.publicUrl ?? map?.fileUrl ?? map?.key)?.toString() ?? uploadUrl.split('?')[0];
      await this.client.put(ApiConstants.resume(ApiConstants.resumeIntroMedia), {
        data: { introMediaUrl: saved, introMediaType: p.mediaType, introMediaPublic: p.isPublic ?? false },
      });
      return saved;
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(messageFor(e, 'upload your intro video'), { cause: e });
    }
  }

  async deleteIntroMedia() {
    try {
      await this.client.delete(ApiConstants.resume(ApiConstants.resumeIntroMedia));
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'remove your intro video'), { cause: e });
    }
  }

  async setIntroMediaVisibility(isPublic: boolean) {
    try {
      await this.client.patch(ApiConstants.resume(ApiConstants.resumeIntroMediaVisibility), { data: { introMediaPublic: isPublic } });
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'update your intro video visibility'), { cause: e });
    }
  }

  /** Whole-list PUT. */
  async replaceLanguages(languages: LanguageInput[]) {
    try {
      await this.client.put(ApiConstants.resume(ApiConstants.resumeLanguages), {
        data: { languages: languages.map((l) => ({ name: l.name, proficiency: l.proficiency })) },
      });
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'save your languages'), { cause: e });
    }
  }
}

export const resumeSectionsRepository = new ResumeSectionsRepository();
