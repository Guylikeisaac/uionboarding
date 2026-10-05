import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { htmlToPlainText } from '@/core/helpers/htmlText';
import { serverMessage, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { activityFromJson, activityResponseFromJson, type Activity, type ActivityResponse } from '@/features/post/data/postModels';

/** Server cap on `limit` is 50; the profile pages in small chunks. */
export const kActivityPageSize = 10;

const dataOf = (body: any): Record<string, any> =>
  body && typeof body === 'object' && body.data && typeof body.data === 'object' ? body.data : {};
const msg = (e: unknown) => serverMessage(e)?.trim() || undefined;

/** Activity feed (post-service). [userUuid] is the internal UUID; pages are 1-indexed. */
export class ActivityRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async loadUserActivities(p: { userUuid: string; page: number; limit?: number; type?: string }): Promise<ActivityResponse> {
    try {
      const res = await this.client.get(ApiConstants.post(ApiConstants.activityByUser(p.userUuid)), {
        params: { page: p.page, limit: p.limit ?? kActivityPageSize, ...(p.type?.trim() ? { type: p.type.trim() } : {}) },
      });
      return activityResponseFromJson(dataOf(res.data));
    } catch (e) {
      throw new RepositoryException(msg(e) ?? "We couldn't load this activity.", { cause: e });
    }
  }

  async deleteActivity(activityId: string) {
    try {
      await this.client.delete(ApiConstants.post(ApiConstants.activityDelete(activityId)));
    } catch (e) {
      throw new RepositoryException(msg(e) ?? "Couldn't delete this activity.", { cause: e });
    }
  }

  async setActivityVisibility(activityId: string, visibility: string): Promise<Activity> {
    try {
      const res = await this.client.patch(ApiConstants.post(ApiConstants.activityUpdateVisibility(activityId)), { data: { visibility } });
      const a = dataOf(res.data).activity;
      return activityFromJson(a && typeof a === 'object' ? a : {});
    } catch (e) {
      throw new RepositoryException(msg(e) ?? "Couldn't update this activity.", { cause: e });
    }
  }
}

export const activityRepository = new ActivityRepository();

// ── Presentation ─────────────────────────────────────────────────────────────

/** The only activity `type` used as a request filter today (Posts tab). */
export const kActivityTypePostCreated = 'POST_CREATED';

const humanize = (raw: string) =>
  raw.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Human-readable action line ("created a post"). */
export function activityActionLabel(a: Activity): string {
  switch (a.type.trim().toUpperCase()) {
    case 'POST_CREATED':
      return 'created a post';
    case 'POST_COMMENTED':
      return 'commented on a post';
    case 'POST_LIKED':
      return 'liked a post';
    case 'JOB_APPLIED':
      return 'applied for a job';
    case 'CONNECTION_CREATED':
      return 'connected with someone';
  }
  return humanize(a.action) || humanize(a.type);
}

export const activityTargetLabel = (a: Activity) => htmlToPlainText(a.targetTitle);
export const activityDescriptionLabel = (a: Activity) => htmlToPlainText(a.description);
/** Unknown visibility is treated as NOT public. */
export const activityIsPublic = (a: Activity) => a.visibility.trim().toUpperCase() === 'PUBLIC';
