import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage, statusOf, isHttpError, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { parsedResumeFromJson, type ParsedResume } from '@/features/onboarding/data/models/parsedResume';
import { resumeFileFromJson, type ResumeFile } from './resumeFile';

/** Async parse state of the latest uploaded resume. */
export type ResumeParseStatus = 'parsing' | 'ready' | 'failed' | 'unknown';

/** A parse poll: the state, plus the payload when it has resolved. */
export interface ResumeParseResult {
  status: ResumeParseStatus;
  data?: ParsedResume;
}

export interface ResumeUploadResult {
  resumeId: string;
}

function messageFor(e: unknown): string {
  const status = statusOf(e);
  const msg = serverMessage(e);
  if (status === 401) return msg ?? 'Please sign in again to upload your resume.';
  if (status === 400) return msg ?? 'That file could not be uploaded. Use a PDF, DOC or DOCX under 5 MB.';
  return msg ?? 'Upload failed. Check your connection and try again.';
}

function mimeFor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

/**
 * API-backed resume repository. Multipart field name is exactly `resume`;
 * `update=true` replaces an existing resume. Parsing runs asynchronously.
 */
export class ResumeRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async upload(p: { fileUri: string; fileName: string; mimeType?: string; update?: boolean }): Promise<ResumeUploadResult> {
    try {
      const form = new FormData();
      form.append('resume', { uri: p.fileUri, name: p.fileName, type: p.mimeType ?? mimeFor(p.fileName) } as any);
      const res = await this.client.post(ApiConstants.resume(ApiConstants.resumeUpload), {
        data: form,
        params: { update: p.update ?? false },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });
      const id = res.data?.data?.resumeDetailsId?.toString();
      return { resumeId: id ?? '' };
    } catch (e) {
      throw new RepositoryException(messageFor(e), { cause: e });
    }
  }

  async hasUploadedResume(): Promise<boolean> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.resumeParsedData));
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async hasResumeFile(userId: string): Promise<boolean> {
    return (await this.latestResumeFile(userId)) != null;
  }

  /** Latest uploaded resume FILE (`uploadedOnly=true`), or null when none. */
  async latestResumeFile(userId: string): Promise<ResumeFile | null> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.resumeUserLatest(userId)), {
        params: { uploadedOnly: true },
      });
      const data = res.data?.data;
      if (!data || typeof data !== 'object') return null;
      const file = resumeFileFromJson(data);
      return !file.id && !file.resumeKey ? null : file;
    } catch (e) {
      throw new RepositoryException(messageFor(e), { cause: e });
    }
  }

  /** Short-lived presigned URL for viewing/downloading. */
  async resumeDownloadUrl(resumeKey: string): Promise<string> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.resumeDownload), { params: { resumeKey } });
      const url = res.data?.data?.downloadUrl?.toString() ?? '';
      if (!url) throw new RepositoryException("Couldn't open your resume. Please try again.");
      return url;
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(serverMessage(e) ?? "Couldn't open your resume. Please try again.", { cause: e });
    }
  }

  async deleteResume(resumeId: string): Promise<void> {
    try {
      await this.client.delete(ApiConstants.resume(ApiConstants.resumeDelete(resumeId)));
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't delete your resume. Please try again.", { cause: e });
    }
  }

  /** Current parse state of the latest upload, with payload once ready. */
  async parseStatus(): Promise<ResumeParseResult> {
    try {
      const res = await this.client.get(ApiConstants.resume(ApiConstants.resumeParsedData));
      const map = res.data?.data;
      if (!map || typeof map !== 'object') return { status: 'unknown' };
      const status = String(map.status ?? '').toLowerCase();
      const rd = map.resumeData;
      const hasData = rd && typeof rd === 'object' && Object.keys(rd).length > 0;
      if (status.includes('fail') || status.includes('error')) return { status: 'failed' };
      if (
        hasData ||
        status.includes('complet') ||
        status.includes('success') ||
        status.includes('ready') ||
        status.includes('done')
      ) {
        let parsed: ParsedResume | undefined;
        try {
          parsed = parsedResumeFromJson(map);
        } catch {
          // degrade to "ready, nothing to prefill"
        }
        return { status: 'ready', data: parsed };
      }
      return { status: 'parsing' };
    } catch (e) {
      if (isHttpError(e)) return { status: 'unknown' };
      return { status: 'unknown' };
    }
  }
}

export const resumeRepository = new ResumeRepository();
