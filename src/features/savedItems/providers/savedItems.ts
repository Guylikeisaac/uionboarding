import { useQuery } from '@tanstack/react-query';

import { authManager } from '@/core/auth/authManager';
import { queryClient } from '@/core/query/queryClient';
import type { FeedPost } from '@/features/home/data/homeModels';
import { feedPostFromApiPost, homeFeedActions, topReactionEmojis } from '@/features/home/providers/homeFeed';
import { jobIsExternal, type JobSummary } from '@/features/jobs/data/jobsModels';
import { jobsSaveRepository } from '@/features/jobs/data/jobsRepositories';
import { useJobsContent } from '@/features/jobs/providers/jobsContent';
import { postRepository } from '@/features/post/data/postRepository';

export type SavedItemsTab = 'posts' | 'jobs';

const postsKey = ['savedPosts'] as const;
const jobsKey = ['savedJobs'] as const;

async function loadSavedPosts(): Promise<FeedPost[]> {
  const userId = authManager.currentUser?.userId ?? '';
  const ids = await postRepository.myBookmarkedPostIds(userId);
  if (!ids.size) return [];
  const posts = await postRepository.getPostsByIds([...ids]);
  return posts.map((p) => feedPostFromApiPost(p, true));
}

/** Saved posts: bookmark ids → `POST /post/bulk` → FeedPost (autoDispose). */
export function useSavedPosts() {
  return useQuery<FeedPost[]>({ queryKey: postsKey, queryFn: loadSavedPosts, gcTime: 0 });
}

const getPosts = () => queryClient.getQueryData<FeedPost[]>(postsKey);
const setPosts = (v: FeedPost[]) => queryClient.setQueryData(postsKey, v);
const patch = (postId: string, fn: (p: FeedPost) => FeedPost) => {
  const cur = getPosts();
  if (cur) setPosts(cur.map((p) => (p.id === postId ? fn(p) : p)));
};
const applyReaction = (postId: string, counts: Record<string, number>, myType?: string) =>
  patch(postId, (p) => ({
    ...p,
    reactionCounts: counts,
    reactionTotal: Object.values(counts).reduce((a, b) => a + b, 0),
    topEmojis: topReactionEmojis(counts),
    myReactionType: myType,
  }));

export const savedPostsActions = {
  refresh: () => queryClient.resetQueries({ queryKey: postsKey }),

  toggleLike(postId: string): Promise<void> {
    const t = getPosts()?.find((p) => p.id === postId);
    if (!t) return Promise.resolve();
    return t.myReactionType != null ? savedPostsActions.removeReaction(postId) : savedPostsActions.setReaction(postId, 'LIKE');
  },

  async setReaction(postId: string, type: string) {
    const before = getPosts();
    const userId = authManager.currentUser?.id ?? '';
    if (!before || !userId) return;
    const target = before.find((p) => p.id === postId);
    if (!target) return;
    const previous = target.myReactionType;
    if (previous === type) return savedPostsActions.removeReaction(postId);
    const counts = { ...target.reactionCounts };
    if (previous != null) counts[previous] = (counts[previous] ?? 1) - 1;
    counts[type] = (counts[type] ?? 0) + 1;
    applyReaction(postId, counts, type);
    try {
      if (previous == null) await postRepository.addReaction(postId, type, userId);
      else await postRepository.updateReaction(postId, type, userId);
    } catch (e) {
      setPosts(before);
      throw e;
    }
  },

  async removeReaction(postId: string) {
    const before = getPosts();
    const userId = authManager.currentUser?.id ?? '';
    if (!before || !userId) return;
    const target = before.find((p) => p.id === postId);
    if (!target || target.myReactionType == null) return;
    const counts = { ...target.reactionCounts };
    counts[target.myReactionType] = (counts[target.myReactionType] ?? 1) - 1;
    applyReaction(postId, counts, undefined);
    try {
      await postRepository.removeReaction(postId, userId);
    } catch (e) {
      setPosts(before);
      throw e;
    }
  },

  /** Un-save: drop the card, persist, sync the Home feed. */
  async unsave(postId: string) {
    const before = getPosts();
    if (!before) return;
    setPosts(before.filter((p) => p.id !== postId));
    try {
      const stillSaved = await postRepository.toggleBookmark(postId);
      homeFeedActions.setSavedLocally(postId, stillSaved);
      if (stillSaved) setPosts(before);
    } catch (e) {
      setPosts(before);
      throw e;
    }
  },

  bumpCommentCount(postId: string, added: number) {
    if (added <= 0) return;
    patch(postId, (p) => ({ ...p, commentsCount: p.commentsCount + added }));
  },
};

/** Saved jobs (`job/save/list`), autoDispose. */
export function useSavedJobs() {
  return useQuery<JobSummary[]>({ queryKey: jobsKey, queryFn: () => jobsSaveRepository.loadSavedJobs(), gcTime: 0 });
}

export const savedJobsActions = {
  refresh: () => queryClient.resetQueries({ queryKey: jobsKey }),
  async unsave(job: JobSummary) {
    const before = queryClient.getQueryData<JobSummary[]>(jobsKey);
    if (!before) return;
    queryClient.setQueryData(
      jobsKey,
      before.filter((j) => j !== job),
    );
    try {
      await jobsSaveRepository.toggleSave({
        jobId: jobIsExternal(job) ? undefined : job.id || undefined,
        externalJob: job.externalJob,
      });
      if (!jobIsExternal(job) && job.id) useJobsContent.getState().markUnsaved(job.id);
    } catch (e) {
      queryClient.setQueryData(jobsKey, before);
      throw e;
    }
  },
};
