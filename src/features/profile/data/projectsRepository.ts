import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage, statusOf, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { putFileToS3 } from '@/core/network/s3Uploader';
import { isoDateOnly } from './resumeSectionsRepository';

export interface ProjectInput {
  title: string;
  description?: string;
  attachmentKeys: string[];
  linkUrl?: string;
  currentlyWorking: boolean;
  startDate?: Date;
  endDate?: Date;
  experienceId?: string;
  sortOrder?: number;
}

export function projectInputToJson(i: ProjectInput): Record<string, unknown> {
  return {
    title: i.title,
    ...(i.description?.trim() ? { description: i.description.trim() } : {}),
    attachmentKeys: i.attachmentKeys,
    ...(i.linkUrl?.trim() ? { linkUrl: i.linkUrl.trim() } : {}),
    currentlyWorking: i.currentlyWorking,
    ...(i.startDate ? { startMonthYear: isoDateOnly(i.startDate) } : {}),
    ...(!i.currentlyWorking && i.endDate ? { endMonthYear: isoDateOnly(i.endDate) } : {}),
    ...(i.experienceId ? { experienceId: i.experienceId } : {}),
    ...(i.sortOrder != null ? { sortOrder: i.sortOrder } : {}),
  };
}

/** Pulls `{uploadUrl, key}` from a presign response (tolerant of spellings). */
function parseUpload(body: unknown): { uploadUrl: string; key: string } | null {
  const maps: Record<string, any>[] = [];
  const collect = (raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const m = raw as Record<string, any>;
    maps.push(m);
    if (m.data && typeof m.data === 'object') collect(m.data);
    if (m.result && typeof m.result === 'object') collect(m.result);
  };
  collect(body);
  for (const d of maps) {
    const url = (d.uploadUrl ?? d.uploadURL ?? d.url ?? d.signedUrl ?? d.signedURL ?? d.presignedUrl ?? d.presignedURL)?.toString();
    const key = (
      d.key ??
      d.s3Key ??
      d.fileKey ??
      d.attachmentKey ??
      d.objectKey ??
      d.mediaKey ??
      d.projectMediaKey ??
      d.projectImageKey ??
      d.projectCoverKey ??
      d.coverKey ??
      d.fileName
    )?.toString();
    if (url && key) return { uploadUrl: url, key };
  }
  return null;
}

function newId(body: any): string | null {
  const data = body && typeof body === 'object' ? (body.data && typeof body.data === 'object' ? body.data : body) : null;
  const id = data?.id ?? data?._id ?? data?.projectId;
  const s = id?.toString();
  return s ? s : null;
}

/** Zod-style `{attachmentKeys: {_errors: [...]}}` gateway messages. */
function decodeGatewayMessage(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return undefined;
    const pickFirst = (arr: unknown) =>
      Array.isArray(arr) ? arr.map((e) => (e == null ? '' : String(e).trim())).find(Boolean) : undefined;
    const a = d.attachmentKeys && typeof d.attachmentKeys === 'object' ? pickFirst(d.attachmentKeys._errors) : undefined;
    if (a) return a;
    return pickFirst(d._errors);
  } catch {
    return undefined;
  }
}

function messageFor(e: unknown, action: string): string {
  const msg = serverMessage(e);
  if (statusOf(e) === 401) return `Please sign in again to ${action}.`;
  return decodeGatewayMessage(msg) ?? msg ?? `Couldn't ${action}. Check your connection and try again.`;
}

/** Profile Projects create/update/delete + S3 cover upload. */
export class ProjectsRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** Presign → S3 → resolves the stored key for `attachmentKeys`. */
  async uploadCover(filePath: string, extension: string, contentType: string): Promise<string> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.projectsMediaUploadUrl), { params: { extension, contentType } });
      const target = parseUpload(res.data);
      if (!target) throw new RepositoryException("Couldn't prepare the image upload.");
      await putFileToS3({ uploadUrl: target.uploadUrl, filePath, contentType });
      return target.key;
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(messageFor(e, 'upload the cover image'), { cause: e });
    }
  }

  async createProject(input: ProjectInput): Promise<string | null> {
    try {
      const res = await this.client.post(ApiConstants.resume(ApiConstants.projectsCreate), { data: projectInputToJson(input) });
      return newId(res.data);
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'add this project'), { cause: e });
    }
  }

  async updateProject(id: string, input: ProjectInput) {
    try {
      await this.client.put(ApiConstants.resume(ApiConstants.projectUpdate(id)), { data: projectInputToJson(input) });
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'save this project'), { cause: e });
    }
  }

  async deleteProject(id: string) {
    try {
      await this.client.delete(ApiConstants.resume(ApiConstants.projectDelete(id)));
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'remove this project'), { cause: e });
    }
  }
}

export const projectsRepository = new ProjectsRepository();
