import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { authManager } from '@/core/auth/authManager';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { relativeTimeFromIso } from '@/core/helpers/relativeTime';
import { queryClient } from '@/core/query/queryClient';
import { postRepository } from '@/features/post/data/postRepository';
import type { Media, Post, PostUser } from '@/features/post/data/postModels';
import type { FeedPost } from '../data/homeModels';

const PAGE_SIZE = 10;
export const homeFeedKey = ['homeFeed'] as const;

/** Post ids the user has bookmarked — seeds `savedByMe` on every page. */
let bookmarked = new Set<string>();

interface FeedPage {
  posts: FeedPost[];
  hasMore: boolean;
  page: number;
}

/** Reaction type → emoji, in the backend's enum order. */
const kReactionEmoji: Record<string, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
  SMILE: '😄',
};

/** The top-3 reaction emoji present in [counts], most-frequent first. */
export function topReactionEmojis(counts: Record<string, number>): string[] {
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => kReactionEmoji[k] ?? '');
}

const normalizeType = (t?: string) => {
  const u = (t ?? '').toUpperCase();
  return kReactionEmoji[u] ? u : 'LIKE';
};

/**
 * Post-service embeds a stock default pic for everyone; the signed-in user's
 * own posts use their real session photo instead.
 */
function authorAvatar(author: PostUser): string {
  const me = authManager.currentUser;
  const isMe = !!me && (author.userId === me.userId || author.id === me.id) && !!me.userId;
  if (isMe) {
    const mine = sanitizeAvatarUrl(me!.profilePic);
    if (mine) return mine;
  }
  return sanitizeAvatarUrl(author.profilePic);
}

/** Image attachment URLs in order; videos are skipped. */
function imageUrls(media: Media[]): string[] {
  return media.filter((m) => m.url && !`${m.type} ${m.mimeType ?? ''}`.toLowerCase().includes('video')).map((m) => m.url);
}

/** Strips the backend's HTML post body down to displayable plain text. */
export function postPlainText(html: string): string {
  let s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return s.trim();
}

/** Builds a display FeedPost from a backend post. */
export function feedPostFromApiPost(p: Post, savedByMe = false): FeedPost {
  const counts: Record<string, number> = {
    LIKE: p.interactions.like,
    LOVE: p.interactions.love,
    WOW: p.interactions.wow,
    SAD: p.interactions.sad,
    ANGRY: p.interactions.angry,
    SMILE: p.interactions.smile,
  };
  return {
    id: p.id,
    author: {
      name: p.author.name,
      role: p.author.userTitle ?? '',
      company: '',
      avatarAsset: authorAvatar(p.author),
      handle: p.author.userId,
    },
    timeAgo: relativeTimeFromIso(p.createdAt),
    text: postPlainText(p.content),
    imageUrls: imageUrls(p.media),
    reactionCounts: counts,
    reactionTotal: Object.values(counts).reduce((a, b) => a + b, 0),
    topEmojis: topReactionEmojis(counts),
    myReactionType: p.interacted === true ? normalizeType(p.interactedType) : undefined,
    commentsCount: p.commentCount,
    savedByMe,
  };
}

async function fetchPage(page: number): Promise<FeedPage> {
  if (page === 1) {
    bookmarked = await postRepository.myBookmarkedPostIds(authManager.currentUser?.userId ?? '');
  }
  const res = await postRepository.getFeed(page, PAGE_SIZE);
  return {
    posts: res.posts.map((p) => feedPostFromApiPost(p, bookmarked.has(p.id))),
    hasMore: res.pagination?.hasNextPage ?? res.posts.length >= PAGE_SIZE,
    page,
  };
}

type FeedData = { pages: FeedPage[]; pageParams: number[] };

/** Flattened, de-duplicated posts across loaded pages. */
export function flattenFeed(data?: FeedData): FeedPost[] {
  if (!data) return [];
  const seen = new Set<string>();
  const out: FeedPost[] = [];
  for (const pg of data.pages) {
    for (const p of pg.posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/** Home feed backed by the real posts service (paged). */
export function useHomeFeed() {
  const q = useInfiniteQuery({
    queryKey: homeFeedKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last: FeedPage) => (last.hasMore ? last.page + 1 : undefined),
    staleTime: 60_000,
  });
  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage && !q.isFetching) void q.fetchNextPage();
  }, [q]);
  return { ...q, posts: flattenFeed(q.data as FeedData | undefined), loadMore };
}

// ── Mutations (optimistic, rollback on failure) ──────────────────────────────

function getData(): FeedData | undefined {
  return queryClient.getQueryData<FeedData>(homeFeedKey);
}

function setData(d: FeedData) {
  queryClient.setQueryData(homeFeedKey, d);
}

function find(postId: string): FeedPost | undefined {
  return flattenFeed(getData()).find((p) => p.id === postId);
}

function patch(postId: string, update: (p: FeedPost) => FeedPost) {
  const d = getData();
  if (!d) return;
  setData({ ...d, pages: d.pages.map((pg) => ({ ...pg, posts: pg.posts.map((p) => (p.id === postId ? update(p) : p)) })) });
}

function applyReaction(postId: string, counts: Record<string, number>, myType?: string) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  patch(postId, (p) => ({ ...p, reactionCounts: counts, reactionTotal: total, topEmojis: topReactionEmojis(counts), myReactionType: myType }));
}

export const homeFeedActions = {
  /** Primary Like: add LIKE if none, else remove the existing reaction. */
  toggleLike(postId: string): Promise<void> {
    const t = find(postId);
    if (!t) return Promise.resolve();
    return t.myReactionType != null ? homeFeedActions.removeReaction(postId) : homeFeedActions.setReaction(postId, 'LIKE');
  },

  /** Adds / changes / (same type again) removes the user's reaction. */
  async setReaction(postId: string, type: string): Promise<void> {
    const userId = authManager.currentUser?.id ?? '';
    if (!userId) return;
    const before = getData();
    const target = find(postId);
    if (!before || !target) return;
    const previous = target.myReactionType;
    if (previous === type) return homeFeedActions.removeReaction(postId);
    const counts = { ...target.reactionCounts };
    if (previous != null) counts[previous] = (counts[previous] ?? 1) - 1;
    counts[type] = (counts[type] ?? 0) + 1;
    applyReaction(postId, counts, type);
    try {
      if (previous == null) await postRepository.addReaction(postId, type, userId);
      else await postRepository.updateReaction(postId, type, userId);
    } catch (e) {
      setData(before);
      throw e;
    }
  },

  async removeReaction(postId: string): Promise<void> {
    const userId = authManager.currentUser?.id ?? '';
    if (!userId) return;
    const before = getData();
    const target = find(postId);
    if (!before || !target || target.myReactionType == null) return;
    const counts = { ...target.reactionCounts };
    const prev = target.myReactionType;
    counts[prev] = (counts[prev] ?? 1) - 1;
    applyReaction(postId, counts, undefined);
    try {
      await postRepository.removeReaction(postId, userId);
    } catch (e) {
      setData(before);
      throw e;
    }
  },

  /** Optimistically toggles the bookmark, reconciling with the server state. */
  async toggleSave(postId: string): Promise<void> {
    const before = getData();
    const target = find(postId);
    if (!before || !target) return;
    patch(postId, (p) => ({ ...p, savedByMe: !p.savedByMe }));
    try {
      const saved = await postRepository.toggleBookmark(postId);
      if (saved) bookmarked.add(postId);
      else bookmarked.delete(postId);
      patch(postId, (p) => ({ ...p, savedByMe: saved }));
    } catch (e) {
      setData(before);
      throw e;
    }
  },

  /** Local comment badge bump after commenting. */
  bumpCommentCount(postId: string, added: number) {
    if (added <= 0) return;
    patch(postId, (p) => ({ ...p, commentsCount: p.commentsCount + added }));
  },

  /** Reflect a save/unsave made elsewhere, without a backend call. */
  setSavedLocally(postId: string, saved: boolean) {
    if (saved) bookmarked.add(postId);
    else bookmarked.delete(postId);
    if (!find(postId)) return;
    patch(postId, (p) => ({ ...p, savedByMe: saved }));
  },

  invalidate() {
    return queryClient.invalidateQueries({ queryKey: homeFeedKey });
  },
};
