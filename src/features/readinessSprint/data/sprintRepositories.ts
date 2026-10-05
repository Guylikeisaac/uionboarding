import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { isHttpError, serverMessage, statusOf, type ApiClient, type ApiResponse } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { putFileToS3 } from '@/core/network/s3Uploader';
import { prefs } from '@/core/storage/storage';
import {
  introMediaTicketFromJson,
  jobLocationFromJson,
  sprintSnapshotFromJson,
  type IntroMediaTicket,
  type JobLocation,
  type SprintIntroMediaType,
  type SprintSessionSnapshot,
} from './sprintModels';

/** A stored sessionId no longer resolves server-side (404). */
export class SprintSessionGoneException extends RepositoryException {}

/** LLM-backed calls (start / messages) outlive the default 30s timeout. */
const LLM_TIMEOUT = 120_000;

/** Client timeout or gateway proxy timeout (502/503/504). */
function isTimeoutFailure(e: unknown): boolean {
  if (isHttpError(e) && (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT')) return true;
  const s = statusOf(e);
  return s === 502 || s === 503 || s === 504;
}

function dataOf(res: ApiResponse): Record<string, any> {
  const data = res.data?.data;
  if (!data || typeof data !== 'object') throw new RepositoryException('Unexpected response from the sprint service.');
  return data;
}

/** Job Readiness Sprint chatbot (interview-service). */
export class SprintRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  /** CONTRACT WARNING: supersedes ANY prior in-progress sprint for the user. */
  async startSession(jobId: string): Promise<SprintSessionSnapshot> {
    try {
      const res = await this.client.post(ApiConstants.interview(ApiConstants.chatbotStart), {
        data: { jobId },
        timeout: LLM_TIMEOUT,
      });
      return sprintSnapshotFromJson(dataOf(res));
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      if (isTimeoutFailure(e)) {
        throw new RepositoryException('Preparing your sprint is taking longer than usual. Please try again.', { cause: e });
      }
      throw new RepositoryException(serverMessage(e) ?? "Couldn't start the sprint. Please try again.", { cause: e });
    }
  }

  /** Throws SprintSessionGoneException on 404. */
  async getSession(sessionId: string): Promise<SprintSessionSnapshot> {
    try {
      const res = await this.client.get(ApiConstants.interview(ApiConstants.chatbotSession(sessionId)));
      return sprintSnapshotFromJson(dataOf(res));
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      if (statusOf(e) === 404) throw new SprintSessionGoneException('This sprint session has expired.', { cause: e });
      throw new RepositoryException(serverMessage(e) ?? "Couldn't load the sprint. Please try again.", { cause: e });
    }
  }

  /** Exactly one of [message] / [locationIds]. */
  async sendAnswer(sessionId: string, answer: { message?: string; locationIds?: string[] }): Promise<SprintSessionSnapshot> {
    try {
      const res = await this.client.post(ApiConstants.interview(ApiConstants.chatbotMessages(sessionId)), {
        data: answer.locationIds != null ? { locationIds: answer.locationIds } : { message: answer.message },
        timeout: LLM_TIMEOUT,
      });
      return sprintSnapshotFromJson(dataOf(res));
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      if (isTimeoutFailure(e)) {
        throw new RepositoryException('Processing your answer is taking longer than usual. Please try again.', { cause: e });
      }
      throw new RepositoryException(serverMessage(e) ?? "Couldn't send your answer. Please try again.", { cause: e });
    }
  }

  async requestIntroMediaUploadUrl(
    sessionId: string,
    p: { mediaType: SprintIntroMediaType; extension: string; contentType: string },
  ): Promise<IntroMediaTicket> {
    try {
      const res = await this.client.post(ApiConstants.interview(ApiConstants.chatbotIntroMediaUploadUrl(sessionId)), {
        data: { mediaType: p.mediaType, extension: p.extension, contentType: p.contentType },
      });
      return introMediaTicketFromJson(dataOf(res));
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(serverMessage(e) ?? "Couldn't prepare the upload. Please try again.", { cause: e });
    }
  }

  async confirmIntroMedia(sessionId: string, s3Key: string, mediaType: SprintIntroMediaType): Promise<SprintSessionSnapshot> {
    try {
      const res = await this.client.post(ApiConstants.interview(ApiConstants.chatbotIntroMediaConfirm(sessionId)), {
        data: { s3Key, introMediaType: mediaType },
      });
      return sprintSnapshotFromJson(dataOf(res));
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(serverMessage(e) ?? "Couldn't save your intro. Please try again.", { cause: e });
    }
  }

  /** Ticket → S3 PUT (same contentType) → confirm. */
  async uploadIntroMedia(
    sessionId: string,
    p: { mediaType: SprintIntroMediaType; filePath: string; extension: string; contentType: string },
  ): Promise<SprintSessionSnapshot> {
    const ticket = await this.requestIntroMediaUploadUrl(sessionId, p);
    await putFileToS3({ uploadUrl: ticket.uploadUrl, filePath: p.filePath, contentType: p.contentType });
    return this.confirmIntroMedia(sessionId, ticket.s3Key, p.mediaType);
  }

  async skipIntroMedia(sessionId: string): Promise<SprintSessionSnapshot> {
    try {
      const res = await this.client.post(ApiConstants.interview(ApiConstants.chatbotIntroMediaSkip(sessionId)));
      return sprintSnapshotFromJson(dataOf(res));
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(serverMessage(e) ?? "Couldn't finish the sprint. Please try again.", { cause: e });
    }
  }
}

/** `GET /job-service/locations` — LOCATION_* answers must submit these ids. */
export class SprintLocationsRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async searchLocations(query = '', limit = 20): Promise<JobLocation[]> {
    const q = query.trim();
    try {
      const res = await this.client.get(ApiConstants.job(ApiConstants.jobLocations), {
        params: { ...(q ? { q } : {}), limit },
      });
      const data = res.data?.data;
      if (!Array.isArray(data)) return [];
      return data.filter((j) => j && typeof j === 'object').map(jobLocationFromJson).filter((l) => l.id);
    } catch (e) {
      throw new RepositoryException("Couldn't load locations. Please try again.", { cause: e });
    }
  }
}

// ── Local `{jobId → sessionId}` pointers ─────────────────────────────────────

const SESSION_PREFIX = 'readiness_sprint_session_';
const SESSION_INDEX = 'readiness_sprint_session_index';

async function indexIds(): Promise<string[]> {
  return (await prefs.getStringList(SESSION_INDEX)) ?? [];
}

async function setIndex(ids: string[]) {
  await prefs.setStringList(SESSION_INDEX, [...new Set(ids)]);
}

/** The only way back into an in-progress sprint (no active-session lookup). */
export const sprintSessionStore = {
  async saveSession(jobId: string, sessionId: string) {
    await prefs.setString(`${SESSION_PREFIX}${jobId}`, sessionId);
    await setIndex([...(await indexIds()), jobId]);
  },
  async sessionFor(jobId: string): Promise<string | null> {
    const v = await prefs.getString(`${SESSION_PREFIX}${jobId}`);
    return v ? v : null;
  },
  async clearSession(jobId: string) {
    await prefs.remove(`${SESSION_PREFIX}${jobId}`);
    await setIndex((await indexIds()).filter((id) => id !== jobId));
  },
  /** Some OTHER job that still holds a stored session. */
  async otherJobWithSession(jobId: string): Promise<string | null> {
    for (const other of await indexIds()) {
      if (other === jobId) continue;
      if (await sprintSessionStore.sessionFor(other)) return other;
    }
    return null;
  },
  /** Drops every stored pointer except [jobId]'s. */
  async clearAllExcept(jobId: string) {
    for (const other of await indexIds()) {
      if (other !== jobId) await prefs.remove(`${SESSION_PREFIX}${other}`);
    }
    await setIndex((await indexIds()).filter((id) => id === jobId));
  },
};

// ── Eligibility (device-local interim) ───────────────────────────────────────

/** The user's one owed sprint. */
export interface SprintPendingStatus {
  jobId: string;
  jobTitle?: string;
  since?: Date;
}

const PENDING_KEY = 'readiness_sprint_user_pending';
const COMPLETED_ONCE_KEY = 'readiness_sprint_completed_once';
const REARMED_KEY = 'readiness_sprint_rearmed';

function parsePending(raw: string): SprintPendingStatus | null {
  try {
    const m = JSON.parse(raw);
    if (!m || typeof m !== 'object') return null;
    const jobId = String(m.jobId ?? '');
    if (!jobId) return null;
    const title = m.jobTitle?.toString();
    const since = Date.parse(String(m.since ?? ''));
    return { jobId, jobTitle: title ? title : undefined, since: Number.isNaN(since) ? undefined : new Date(since) };
  } catch {
    return null;
  }
}

/**
 * Decides WHEN the sprint surfaces: first-ever apply on this device, and
 * again after relevant profile updates made on this device.
 */
export const sprintEligibility = {
  async shouldOpenSprintAfterApply(_jobId: string): Promise<boolean> {
    if ((await sprintEligibility.pendingStatus()) != null) return false;
    return !((await prefs.getBool(COMPLETED_ONCE_KEY)) ?? false);
  },
  async pendingStatus(): Promise<SprintPendingStatus | null> {
    const raw = await prefs.getString(PENDING_KEY);
    if (!raw) return null;
    const parsed = parsePending(raw);
    if (!parsed) await prefs.remove(PENDING_KEY); // self-heal
    return parsed;
  },
  async markSprintOwed(jobId: string, jobTitle?: string) {
    await prefs.setString(
      PENDING_KEY,
      JSON.stringify({ jobId, ...(jobTitle ? { jobTitle } : {}), since: new Date().toISOString() }),
    );
    await prefs.remove(REARMED_KEY);
  },
  async markSprintCompleted() {
    await prefs.remove(PENDING_KEY);
    await prefs.remove(REARMED_KEY);
    await prefs.setBool(COMPLETED_ONCE_KEY, true);
  },
  async resetEligibilityAfterProfileUpdate() {
    if ((await sprintEligibility.pendingStatus()) != null) return;
    if (!((await prefs.getBool(COMPLETED_ONCE_KEY)) ?? false)) return;
    await prefs.remove(COMPLETED_ONCE_KEY);
    await prefs.setBool(REARMED_KEY, true);
  },
  async sprintAvailableAgain(): Promise<boolean> {
    return (await prefs.getBool(REARMED_KEY)) ?? false;
  },
};

export const sprintRepository = new SprintRepository();
export const sprintLocationsRepository = new SprintLocationsRepository();
