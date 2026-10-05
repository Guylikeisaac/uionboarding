import { create } from 'zustand';

import { errorMessage, type SubmitStatus } from '@/core/data/repositoryException';
import { homeFeedActions } from '@/features/home/providers/homeFeed';
import { invalidateHasCreatedPost, useFirstPostSession } from '@/features/home/providers/welcomeProgress';
import { invalidateActivityFeed } from '@/features/profile/providers/activityFeed';
import type { PostVisibility } from '../data/postModels';
import { postRepository } from '../data/postRepository';

/**
 * Shared post-created hook: refreshes every surface that renders the user's
 * posts (Home feed, profile Activity feeds, welcome "first post").
 */
export function refreshPostCreatedSurfaces() {
  useFirstPostSession.getState().markCreated();
  void homeFeedActions.invalidate();
  invalidateActivityFeed();
  void invalidateHasCreatedPost();
}

export interface PostComposerState {
  text: string;
  mediaPaths: string[];
  visibility: PostVisibility;
  status: SubmitStatus;
  error?: string;
}

const initial: PostComposerState = { text: '', mediaPaths: [], visibility: 'everyone', status: 'idle' };

export const composerCanSubmit = (s: PostComposerState) => s.status !== 'submitting' && (s.text.trim().length > 0 || s.mediaPaths.length > 0);

/** Composer draft; reset whenever the composer screen opens/closes (autoDispose). */
export const usePostComposer = create<
  PostComposerState & {
    reset: () => void;
    setText: (v: string) => void;
    setVisibility: (v: PostVisibility) => void;
    addMedia: (path: string) => void;
    removeMedia: (path: string) => void;
    submit: () => Promise<boolean>;
  }
>((set, get) => ({
  ...initial,
  reset: () => set({ ...initial }),
  setText: (text) => set({ text }),
  setVisibility: (visibility) => set({ visibility }),
  addMedia: (path) => set({ mediaPaths: [...get().mediaPaths, path] }),
  removeMedia: (path) => set({ mediaPaths: get().mediaPaths.filter((p) => p !== path) }),
  submit: async () => {
    if (!composerCanSubmit(get())) return false;
    set({ status: 'submitting', error: undefined });
    try {
      await postRepository.createPost({ text: get().text.trim(), mediaPaths: get().mediaPaths, visibility: get().visibility });
      refreshPostCreatedSurfaces();
      set({ status: 'success' });
      return true;
    } catch (e) {
      set({ status: 'error', error: errorMessage(e) });
      return false;
    }
  },
}));
