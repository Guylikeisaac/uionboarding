// Post Service API models (live subset).

export type InteractionType = 'LIKE' | 'LOVE' | 'WOW' | 'SAD' | 'ANGRY' | 'SMILE';
export const interactionTypes: InteractionType[] = ['LIKE', 'LOVE', 'WOW', 'SAD', 'ANGRY', 'SMILE'];

const s = (v: unknown, f = '') => (v == null ? f : String(v));
const os = (v: unknown) => (v == null ? undefined : String(v));
const n = (v: unknown, f = 0) => (typeof v === 'number' ? Math.trunc(v) : f);
const map = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : {});

export interface PostUser {
  id: string;
  name: string;
  userId: string;
  profilePic?: string;
  userTitle?: string;
}

export function postUserFromJson(j: Record<string, any>): PostUser {
  return { id: s(j.id), name: s(j.name), userId: s(j.userId), profilePic: os(j.profilePic), userTitle: os(j.userTitle) };
}

export interface Media {
  id: string;
  type: string;
  url: string;
  awsId?: string;
  fileName?: string;
  mimeType?: string;
}

export function mediaFromJson(j: Record<string, any>): Media {
  return { id: s(j.id), type: s(j.type), url: s(j.url), awsId: os(j.awsId), fileName: os(j.fileName), mimeType: os(j.mimeType) };
}

export interface Interactions {
  like: number;
  love: number;
  wow: number;
  sad: number;
  angry: number;
  smile: number;
}

export function interactionsFromJson(j: Record<string, any>): Interactions {
  return { like: n(j.LIKE), love: n(j.LOVE), wow: n(j.WOW), sad: n(j.SAD), angry: n(j.ANGRY), smile: n(j.SMILE) };
}

export interface Post {
  id: string;
  content: string;
  media: Media[];
  author: PostUser;
  interactions: Interactions;
  commentCount: number;
  userInteractionType?: string;
  interacted?: boolean;
  interactedType?: string;
  createdAt: string;
  updatedAt: string;
}

export function postFromJson(j: Record<string, any>): Post {
  return {
    id: s(j.id),
    content: s(j.content),
    media: Array.isArray(j.media) ? j.media.map((e: any) => mediaFromJson(map(e))) : [],
    author: postUserFromJson(map(j.author)),
    // Live `/post/get-all` sends `interactionCounts`; older docs `interactions`.
    interactions: interactionsFromJson(map(j.interactionCounts ?? j.interactions)),
    commentCount: n(j.commentCount),
    userInteractionType: os(j.userInteractionType),
    interacted: typeof j.interacted === 'boolean' ? j.interacted : undefined,
    interactedType: os(j.interactedType),
    createdAt: s(j.createdAt),
    updatedAt: s(j.updatedAt),
  };
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function paginationFromJson(j: Record<string, any>): Pagination {
  return {
    currentPage: n(j.page ?? j.currentPage, 1),
    totalPages: n(j.totalPages),
    totalPosts: n(j.total ?? j.totalPosts),
    hasNextPage: j.hasNextPage === true,
    hasPrevPage: j.hasPrevPage === true,
  };
}

export interface PostResponse {
  posts: Post[];
  pagination?: Pagination;
  hasMore?: boolean;
  nextPage?: number;
}

export function postResponseFromJson(j: Record<string, any>): PostResponse {
  return {
    posts: Array.isArray(j.posts) ? j.posts.map((e: any) => postFromJson(map(e))) : [],
    pagination: j.pagination ? paginationFromJson(map(j.pagination)) : undefined,
    hasMore: typeof j.hasMore === 'boolean' ? j.hasMore : undefined,
    nextPage: typeof j.nextPage === 'number' ? j.nextPage : undefined,
  };
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: PostUser;
  parent?: Comment;
  repliedToUser?: PostUser;
  replies: Comment[];
  liked?: boolean;
  likes?: number;
  hasReply?: boolean;
  parentId?: string;
  repliedToUserId?: string;
}

export function commentFromJson(j: Record<string, any>): Comment {
  return {
    id: s(j.id),
    postId: s(j.postId),
    content: s(j.content),
    authorId: s(j.authorId),
    createdAt: s(j.createdAt),
    updatedAt: s(j.updatedAt),
    author: postUserFromJson(map(j.author)),
    parent: j.parent ? commentFromJson(map(j.parent)) : undefined,
    repliedToUser: j.repliedToUser ? postUserFromJson(map(j.repliedToUser)) : undefined,
    replies: Array.isArray(j.replies) ? j.replies.map((e: any) => commentFromJson(map(e))) : [],
    liked: typeof j.liked === 'boolean' ? j.liked : undefined,
    likes: typeof j.likes === 'number' ? j.likes : undefined,
    hasReply: typeof j.hasReply === 'boolean' ? j.hasReply : undefined,
    parentId: os(j.parentId),
    repliedToUserId: os(j.repliedToUserId),
  };
}

export interface CommentResponse {
  comments: Comment[];
  hasMore: boolean;
  nextPage?: number;
  page: number;
}

export function commentResponseFromJson(j: Record<string, any>): CommentResponse {
  return {
    comments: Array.isArray(j.comments) ? j.comments.map((e: any) => commentFromJson(map(e))) : [],
    hasMore: j.hasMore === true,
    nextPage: typeof j.nextPage === 'number' ? j.nextPage : undefined,
    page: n(j.page, 1),
  };
}

export interface CommentLikeResponse {
  liked: boolean;
  likes: number;
}

// ── Activity ─────────────────────────────────────────────────────────────────

/** Tolerant: an unknown activity degrades to a generic row. */
export interface Activity {
  id: string;
  userId: string;
  type: string;
  action: string;
  description: string;
  targetType: string;
  targetId: string;
  targetTitle: string;
  metadata: Record<string, any>;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  user: PostUser;
}

export function activityFromJson(j: Record<string, any>): Activity {
  return {
    id: s(j.id),
    userId: s(j.userId),
    type: s(j.type),
    action: s(j.action),
    description: s(j.description),
    targetType: s(j.targetType),
    targetId: s(j.targetId),
    targetTitle: s(j.targetTitle),
    metadata: map(j.metadata),
    visibility: s(j.visibility),
    createdAt: s(j.createdAt),
    updatedAt: s(j.updatedAt),
    user: postUserFromJson(map(j.user)),
  };
}

export interface ActivityPagination {
  currentPage: number;
  totalPages: number;
  totalActivities: number;
  hasMore: boolean;
  nextPage?: number;
}

export interface ActivityResponse {
  activities: Activity[];
  pagination: ActivityPagination;
}

export function activityResponseFromJson(j: Record<string, any>): ActivityResponse {
  const p = map(j.pagination);
  return {
    activities: Array.isArray(j.activities)
      ? j.activities.filter((e: unknown) => e && typeof e === 'object').map((e: any) => activityFromJson(e))
      : [],
    pagination: {
      currentPage: n(p.currentPage, 1),
      totalPages: n(p.totalPages),
      totalActivities: n(p.totalActivities),
      hasMore: p.hasMore === true,
      nextPage: typeof p.nextPage === 'number' ? Math.trunc(p.nextPage) : undefined,
    },
  };
}

// ── Composer ─────────────────────────────────────────────────────────────────

export type PostVisibility = 'everyone' | 'connections';

/** What the composer sends to the repository to create a post. */
export interface PostDraft {
  text: string;
  mediaPaths: string[];
  visibility: PostVisibility;
}

export interface CreatedPost {
  id: string;
}
