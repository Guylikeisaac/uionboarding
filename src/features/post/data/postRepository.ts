import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { basename } from '@/core/files/pickedFile';
import { serverMessage, statusOf, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { putFileToS3 } from '@/core/network/s3Uploader';
import {
  commentResponseFromJson,
  postFromJson,
  postResponseFromJson,
  type CommentLikeResponse,
  type CommentResponse,
  type CreatedPost,
  type Post,
  type PostDraft,
  type PostResponse,
  type PostVisibility,
} from './postModels';

/** Default feed topic sent on create until the composer has a topic picker. */
const kDefaultTopics = ['networking'];

function extensionOf(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot === -1 || dot === name.length - 1 ? 'jpg' : name.substring(dot + 1).toLowerCase();
}

function imageMime(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/** First present value from a map, supporting one level of dot.notation. */
function pick(m: Record<string, any> | null, paths: string[]): string | null {
  if (!m) return null;
  for (const p of paths) {
    let v: any = m;
    for (const seg of p.split('.')) v = v && typeof v === 'object' ? v[seg] : undefined;
    const sv = v?.toString();
    if (sv) return sv;
  }
  return null;
}

const visibilityOf = (v: PostVisibility) => (v === 'connections' ? 'CONNECTIONS' : 'ANYONE');

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Plain composer text → the HTML `content` the backend stores. */
function toHtml(raw: string): string {
  if (!raw) return '<p></p>';
  return raw
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * API-backed posts repository: feed read, create (+ S3 image upload),
 * reactions, bookmarks, comments and replies.
 */
export class PostRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  async getFeed(page = 1, limit = 10): Promise<PostResponse> {
    try {
      const res = await this.client.get(ApiConstants.post(ApiConstants.postGetAll), { params: { page, limit } });
      const data = res.data?.data;
      if (!data || typeof data !== 'object') throw new RepositoryException("Couldn't load the feed.");
      return postResponseFromJson(data);
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      const msg =
        statusOf(e) === 401
          ? serverMessage(e) ?? 'Please sign in again to see your feed.'
          : serverMessage(e) ?? "Couldn't load the feed. Check your connection and try again.";
      throw new RepositoryException(msg, { cause: e });
    }
  }

  async createPost(draft: PostDraft): Promise<CreatedPost> {
    const raw = draft.text.trim();
    const media: Record<string, unknown>[] = [];
    for (const path of draft.mediaPaths) media.push(await this.uploadImageMedia(path));
    try {
      const res = await this.client.post(ApiConstants.post(ApiConstants.postCreate), {
        data: {
          content: toHtml(raw),
          rawContent: raw,
          topics: kDefaultTopics,
          media,
          mentionedCompanyIds: [],
          visibility: visibilityOf(draft.visibility),
          commentControl: 'ANYONE',
        },
      });
      return { id: res.data?.data?.id?.toString() ?? '' };
    } catch (e) {
      const status = statusOf(e);
      const msg =
        status === 401
          ? serverMessage(e) ?? 'Please sign in again to post.'
          : status === 400
            ? serverMessage(e) ?? 'Your post is missing something required.'
            : serverMessage(e) ?? "Couldn't publish your post. Check your connection and try again.";
      throw new RepositoryException(msg, { cause: e });
    }
  }

  async addReaction(postId: string, type: string, userId: string) {
    try {
      await this.client.post(ApiConstants.post(ApiConstants.interactionAdd(postId, type)), { data: { userId } });
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't add your reaction.", { cause: e });
    }
  }

  async updateReaction(postId: string, type: string, userId: string) {
    try {
      await this.client.put(ApiConstants.post(ApiConstants.interactionUpdate(postId, type)), { data: { userId } });
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't change your reaction.", { cause: e });
    }
  }

  async removeReaction(postId: string, userId: string) {
    try {
      await this.client.delete(ApiConstants.post(ApiConstants.interactionRemove(postId)), { data: { userId } });
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't remove your reaction.", { cause: e });
    }
  }

  /** Toggles the bookmark; resolves the new bookmarked state. */
  async toggleBookmark(postId: string): Promise<boolean> {
    try {
      const res = await this.client.post(ApiConstants.auth(ApiConstants.userBookmarkToggle), { data: { postId } });
      const b = res.data?.data?.bookmarked;
      return typeof b === 'boolean' ? b : true;
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't update your saved posts.", { cause: e });
    }
  }

  async myBookmarkedPostIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();
    try {
      const res = await this.client.get(ApiConstants.auth(ApiConstants.userBookmarks(userId)));
      const list = res.data?.data?.bookMarkedPosts;
      if (!Array.isArray(list)) return new Set();
      return new Set(list.filter((e) => e != null && String(e)).map(String));
    } catch {
      return new Set();
    }
  }

  /** Full posts for ids (`POST /post/bulk`). Order not guaranteed. */
  async getPostsByIds(postIds: string[]): Promise<Post[]> {
    const ids = postIds.filter(Boolean);
    if (!ids.length) return [];
    try {
      const res = await this.client.post(ApiConstants.post(ApiConstants.postBulk), { data: { postIds: ids } });
      const data = res.data?.data;
      if (!Array.isArray(data)) return [];
      return data.filter((e) => e && typeof e === 'object').map(postFromJson);
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't load your saved posts.", { cause: e });
    }
  }

  async getComments(postId: string, page = 1, limit = 20): Promise<CommentResponse> {
    try {
      const res = await this.client.get(ApiConstants.post(ApiConstants.commentGetOnPost(postId)), { params: { page, limit } });
      const data = res.data?.data;
      if (!data || typeof data !== 'object') return { comments: [], hasMore: false, page };
      return commentResponseFromJson(data);
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't load comments.", { cause: e });
    }
  }

  async addComment(postId: string, content: string) {
    try {
      await this.client.post(ApiConstants.post(ApiConstants.commentOnPost(postId)), {
        data: { content, mentionedUsers: [] },
      });
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't post your comment.", { cause: e });
    }
  }

  /** Edits the caller's own comment; resolves the server's stored content. */
  async updateComment(commentId: string, content: string): Promise<string> {
    try {
      const res = await this.client.put(ApiConstants.post(ApiConstants.commentUpdate(commentId)), { data: { content } });
      const serverContent = res.data?.data?.updatedComment?.content?.toString();
      return serverContent ? serverContent : content;
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't update your comment.", { cause: e });
    }
  }

  async toggleCommentLike(commentId: string): Promise<CommentLikeResponse> {
    try {
      const res = await this.client.post(ApiConstants.post(ApiConstants.commentToggleLike(commentId)));
      const d = res.data?.data ?? {};
      return { liked: d.liked === true, likes: typeof d.likes === 'number' ? d.likes : 0 };
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't update the like.", { cause: e });
    }
  }

  async getReplies(commentId: string, page = 1, limit = 20): Promise<CommentResponse> {
    try {
      const res = await this.client.get(ApiConstants.post(ApiConstants.commentReplies(commentId)), { params: { page, limit } });
      const data = res.data?.data;
      if (!data || typeof data !== 'object') return { comments: [], hasMore: false, page };
      const m = { ...data };
      if (m.comments == null && Array.isArray(m.replies)) m.comments = m.replies;
      return commentResponseFromJson(m);
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't load replies.", { cause: e });
    }
  }

  async addReply(commentId: string, content: string, repliedUserId: string) {
    try {
      await this.client.post(ApiConstants.post(ApiConstants.commentReply(commentId)), { data: { content, repliedUserId } });
    } catch (e) {
      throw new RepositoryException(serverMessage(e) ?? "Couldn't post your reply.", { cause: e });
    }
  }

  async uploadMedia(filePath: string): Promise<string> {
    return (await this.uploadImageMedia(filePath)).url as string;
  }

  /** Presigns, PUTs the image to S3, and returns the create `media[]` item. */
  private async uploadImageMedia(filePath: string): Promise<Record<string, unknown>> {
    const mime = imageMime(extensionOf(filePath));
    const fileName = basename(filePath);
    try {
      const res = await this.client.get(ApiConstants.post(ApiConstants.postAwsSignedUploadUrl), {
        params: { originalName: fileName, type: mime },
      });
      const m = res.data?.data && typeof res.data.data === 'object' ? res.data.data : null;
      const uploadUrl = pick(m, ['uploadUrl.url', 'url', 'uploadUrl']);
      const publicUrl = pick(m, ['publicUrl', 'uploadUrl.url', 'url']);
      const key = pick(m, ['uploadUrl.key', 'key']);
      if (!uploadUrl || !publicUrl) throw new RepositoryException("Couldn't prepare the image upload.");
      await putFileToS3({ uploadUrl, filePath, contentType: mime });
      return {
        type: 'IMAGE',
        ...(key ? { awsId: key } : {}),
        url: publicUrl,
        fileName,
        mimeType: mime,
      };
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(serverMessage(e) ?? "Couldn't upload the image.", { cause: e });
    }
  }
}

export const postRepository = new PostRepository();
