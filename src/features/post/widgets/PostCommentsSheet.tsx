import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, useWindowDimensions, View, type TextInput as RNTextInput } from 'react-native';

import { authManager } from '@/core/auth/authManager';
import { errorMessage } from '@/core/data/repositoryException';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { relativeTimeFromIso } from '@/core/helpers/relativeTime';
import { bgMain, grey, stroke, textPrimary, themeColor } from '@/core/theme/colors';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { showAppBottomSheet, showAppDialog } from '@/shared/ui/overlay';
import { showSnackbar } from '@/shared/ui/snackbar';
import { Text, TextInput } from '@/shared/ui/Text';
import { useAndroidKeyboardInset } from '@/shared/ui/useKeyboardInset';
import type { Comment } from '../data/postModels';
import { postRepository } from '../data/postRepository';

/**
 * Opens the comments sheet for a post: a paged list (per-comment likes,
 * threaded replies) plus an inline composer. [onCommentAdded] fires once per
 * successfully-posted top-level comment.
 */
export function showPostCommentsSheet(postId: string, opts: { initialCount?: number; onCommentAdded?: () => void } = {}) {
  return showAppBottomSheet<void>(() => <PostCommentsSheet postId={postId} {...opts} />, {
    showHandle: false,
    sheetStyle: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  });
}

type Like = { liked: boolean; likes: number };
type ReplyTarget = { commentId: string; name: string; userUuid: string };

const PAGE_SIZE = 20;

function PostCommentsSheet({ postId, initialCount, onCommentAdded }: { postId: string; initialCount?: number; onCommentAdded?: () => void }) {
  const { height } = useWindowDimensions();
  const kb = useAndroidKeyboardInset();
  const inputRef = useRef<RNTextInput>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | undefined>(initialCount);
  const [input, setInput] = useState('');

  const [likeOverrides, setLikeOverrides] = useState<Record<string, Like>>({});
  const likeBusy = useRef(new Set<string>());
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [repliesBusy, setRepliesBusy] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await postRepository.getComments(postId, 1, PAGE_SIZE);
      if (!mounted.current) return;
      setComments(res.comments);
      setHasMore(res.hasMore);
      setNextPage(res.nextPage ?? 2);
      setLikeOverrides({});
      if (!res.hasMore) setCount(res.comments.length);
      setLoading(false);
    } catch (e) {
      if (!mounted.current) return;
      setError(errorMessage(e));
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await postRepository.getComments(postId, nextPage, PAGE_SIZE);
      if (!mounted.current) return;
      const seen = new Set(comments.map((c) => c.id));
      const merged = [...comments, ...res.comments.filter((c) => !seen.has(c.id))];
      setComments(merged);
      setHasMore(res.hasMore);
      setNextPage(res.nextPage ?? nextPage + 1);
      if (!res.hasMore) setCount(merged.length);
    } catch (e) {
      showSnackbar(errorMessage(e), { isError: true });
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  };

  const refreshReplies = async (commentId: string, forceExpand = false) => {
    setRepliesBusy((s) => new Set(s).add(commentId));
    try {
      const res = await postRepository.getReplies(commentId, 1, 50);
      if (!mounted.current) return;
      setReplies((r) => ({ ...r, [commentId]: res.comments }));
      if (forceExpand) setExpanded((s) => new Set(s).add(commentId));
    } catch (e) {
      showSnackbar(errorMessage(e), { isError: true });
    } finally {
      if (mounted.current)
        setRepliesBusy((s) => {
          const n = new Set(s);
          n.delete(commentId);
          return n;
        });
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const target = replyingTo;
    try {
      if (target) {
        await postRepository.addReply(target.commentId, text, target.userUuid);
        setInput('');
        setReplyingTo(null);
        await refreshReplies(target.commentId, true);
      } else {
        await postRepository.addComment(postId, text);
        setInput('');
        setCount((c) => (c != null ? c + 1 : c));
        onCommentAdded?.();
        await load();
      }
    } catch (e) {
      showSnackbar(errorMessage(e), { isError: true });
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  const toggleReplies = (c: Comment) => {
    if (expanded.has(c.id)) {
      setExpanded((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
      return;
    }
    setExpanded((s) => new Set(s).add(c.id));
    if (!(c.id in replies)) void refreshReplies(c.id);
  };

  const startReply = (c: Comment) => {
    setReplyingTo({ commentId: c.id, name: c.author.name || 'User', userUuid: c.author.id });
    inputRef.current?.focus();
  };

  const likeStateOf = (c: Comment): Like => likeOverrides[c.id] ?? { liked: c.liked ?? false, likes: c.likes ?? 0 };

  const toggleLike = async (c: Comment) => {
    if (likeBusy.current.has(c.id)) return;
    const before = likeStateOf(c);
    likeBusy.current.add(c.id);
    setLikeOverrides((o) => ({ ...o, [c.id]: { liked: !before.liked, likes: before.liked ? before.likes - 1 : before.likes + 1 } }));
    try {
      const res = await postRepository.toggleCommentLike(c.id);
      if (mounted.current) setLikeOverrides((o) => ({ ...o, [c.id]: { liked: res.liked, likes: res.likes } }));
    } catch (e) {
      if (mounted.current) setLikeOverrides((o) => ({ ...o, [c.id]: before }));
      showSnackbar(errorMessage(e), { isError: true });
    } finally {
      likeBusy.current.delete(c.id);
    }
  };

  const isMine = (c: Comment) => {
    const me = authManager.currentUser;
    if (!me) return false;
    if (me.id && (c.authorId === me.id || c.author.id === me.id)) return true;
    return !!me.userId && c.author.userId === me.userId;
  };

  const applyContent = (id: string, content: string) => {
    setComments((list) => list.map((c) => (c.id === id ? { ...c, content } : c)));
    setReplies((r) => {
      const out: Record<string, Comment[]> = {};
      for (const [k, list] of Object.entries(r)) out[k] = list.map((x) => (x.id === id ? { ...x, content } : x));
      return out;
    });
  };

  const editComment = async (c: Comment) => {
    const edited = await showAppDialog<string>((close) => <EditCommentDialog initial={c.content} close={close} />);
    if (edited == null) return;
    const trimmed = edited.trim();
    if (!trimmed || trimmed === c.content.trim()) return;
    const previous = c.content;
    applyContent(c.id, trimmed);
    try {
      const saved = await postRepository.updateComment(c.id, trimmed);
      if (!mounted.current) return;
      applyContent(c.id, saved ? saved : trimmed);
      showSnackbar('Comment updated');
    } catch (e) {
      if (!mounted.current) return;
      applyContent(c.id, previous);
      showSnackbar(errorMessage(e), { isError: true });
    }
  };

  const title = !count ? 'Comments' : `Comments (${count})`;

  const renderComment = (c: Comment) => {
    const like = likeStateOf(c);
    const isOpen = expanded.has(c.id);
    const loaded = replies[c.id];
    const hasReplies = (c.hasReply ?? false) || (loaded?.length ?? 0) > 0;
    return (
      <View>
        <CommentRow
          comment={c}
          liked={like.liked}
          likes={like.likes}
          onToggleLike={() => void toggleLike(c)}
          onReply={() => startReply(c)}
          onEdit={isMine(c) ? () => void editComment(c) : undefined}
        />
        {hasReplies ? (
          <Pressable onPress={() => toggleReplies(c)} style={{ marginLeft: 46, marginTop: 6, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
            <Icon name={isOpen ? 'expand-less' : 'expand-more'} size={18} color={themeColor} />
            <Text style={{ marginLeft: 2, fontSize: 12.5, fontWeight: '600', color: themeColor }}>
              {isOpen ? 'Hide replies' : loaded ? `View ${loaded.length} ${loaded.length === 1 ? 'reply' : 'replies'}` : 'View replies'}
            </Text>
          </Pressable>
        ) : null}
        {isOpen ? (
          repliesBusy.has(c.id) && !loaded ? (
            <View style={{ marginLeft: 46, marginTop: 10, alignItems: 'flex-start' }}>
              <ActivityIndicator size="small" color={themeColor} />
            </View>
          ) : (
            <View style={{ marginLeft: 30, marginTop: 8 }}>
              {(loaded ?? []).map((r) => {
                const rl = likeStateOf(r);
                return (
                  <View key={r.id} style={{ marginBottom: 12 }}>
                    <CommentRow
                      comment={r}
                      liked={rl.liked}
                      likes={rl.likes}
                      onToggleLike={() => void toggleLike(r)}
                      onReply={() => startReply(c)}
                      onEdit={isMine(r) ? () => void editComment(r) : undefined}
                      dense
                    />
                  </View>
                );
              })}
            </View>
          )
        ) : null}
      </View>
    );
  };

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ textAlign: 'center', color: grey[600] }}>{error}</Text>
        <Pressable onPress={() => void load()} style={{ marginTop: 14, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, backgroundColor: themeColor }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (comments.length === 0) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="mode-comment" size={36} color={grey[400]} />
        <Text style={{ marginTop: 10, color: grey[600], fontSize: 14 }}>No comments yet. Be the first.</Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingVertical: 14 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={({ item }) => renderComment(item)}
        ListFooterComponent={
          hasMore ? (
            <View style={{ alignItems: 'center', marginTop: 16 }}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={themeColor} />
              ) : (
                <Pressable onPress={() => void loadMore()} style={{ padding: 8 }}>
                  <Text style={{ color: themeColor, fontWeight: '600' }}>View more comments</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <View style={{ height: height * 0.82, backgroundColor: bgMain, marginBottom: kb }}>
      <View style={{ alignSelf: 'center', marginTop: 8, marginBottom: 6, width: 36, height: 4, borderRadius: 2, backgroundColor: '#D9D9DE' }} />
      <Text style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10, fontSize: 17, fontWeight: '700', color: textPrimary }}>{title}</Text>
      <View style={{ height: 1, backgroundColor: stroke }} />
      <View style={{ flex: 1 }}>{body}</View>
      <View style={{ height: 1, backgroundColor: stroke }} />
      {replyingTo ? (
        <View style={{ paddingLeft: 16, paddingRight: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="reply" size={15} color={grey[600]} />
          <Text style={{ flex: 1, marginLeft: 6, fontSize: 12.5, color: grey[600] }}>Replying to {replyingTo.name}</Text>
          <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
            <Icon name="close" size={16} color={grey[600]} />
          </Pressable>
        </View>
      ) : null}
      <View style={{ paddingLeft: 14, paddingRight: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-end' }}>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          multiline
          placeholder={replyingTo ? 'Add a reply…' : 'Add a comment…'}
          placeholderTextColor={grey[500]}
          style={{ flex: 1, maxHeight: 100, minHeight: 42, borderRadius: 22, backgroundColor: '#F1F2F6', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: textPrimary }}
        />
        <Pressable onPress={() => void send()} disabled={sending} style={{ marginLeft: 6, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Send">
          {sending ? <ActivityIndicator size="small" color={themeColor} /> : <Icon name="send" color={themeColor} />}
        </Pressable>
      </View>
    </View>
  );
}

function CommentRow({
  comment,
  liked,
  likes,
  onToggleLike,
  onReply,
  onEdit,
  dense = false,
}: {
  comment: Comment;
  liked: boolean;
  likes: number;
  onToggleLike: () => void;
  onReply: () => void;
  onEdit?: () => void;
  dense?: boolean;
}) {
  const name = comment.author.name || 'User';
  const title = comment.author.userTitle?.trim() ?? '';
  const time = relativeTimeFromIso(comment.createdAt);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <CommentAvatar name={name} url={sanitizeAvatarUrl(comment.author.profilePic)} radius={dense ? 15 : 18} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 9, paddingBottom: 10, backgroundColor: '#F4F5F8', borderRadius: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: dense ? 13 : 13.5, fontWeight: '700', color: textPrimary }}>
              {name}
            </Text>
            {time ? <Text style={{ marginLeft: 6, fontSize: 12, color: grey[500] }}>· {time}</Text> : null}
          </View>
          {title && !dense ? (
            <Text numberOfLines={1} style={{ marginTop: 1, fontSize: 11.5, color: grey[600] }}>
              {title}
            </Text>
          ) : null}
          <Text style={{ marginTop: 4, fontSize: dense ? 13.5 : 14, lineHeight: (dense ? 13.5 : 14) * 1.35, color: '#1C1F2A' }}>{comment.content}</Text>
        </View>
        <View style={{ marginTop: 4, marginLeft: 6, flexDirection: 'row' }}>
          <MetaAction icon={liked ? 'favorite' : 'favorite-border'} label={likes > 0 ? `Like · ${likes}` : 'Like'} color={liked ? '#E3352A' : grey[600]} onTap={onToggleLike} />
          <MetaAction icon="reply" label="Reply" color={grey[600]} onTap={onReply} />
          {onEdit ? <MetaAction icon="edit" label="Edit" color={grey[600]} onTap={onEdit} /> : null}
        </View>
      </View>
    </View>
  );
}

function MetaAction({ icon, label, color, onTap }: { icon: IconName; label: string; color: string; onTap: () => void }) {
  return (
    <Pressable onPress={onTap} style={{ marginRight: 14, paddingHorizontal: 4, paddingVertical: 3, flexDirection: 'row', alignItems: 'center' }}>
      <Icon name={icon} size={15} color={color} />
      <Text style={{ marginLeft: 4, fontSize: 12.5, fontWeight: '600', color }}>{label}</Text>
    </Pressable>
  );
}

function CommentAvatar({ name, url, radius }: { name: string; url: string; radius: number }) {
  const [failed, setFailed] = useState(false);
  const d = radius * 2;
  if (url && !failed) {
    return <Image source={{ uri: url }} style={{ width: d, height: d, borderRadius: radius, backgroundColor: '#E0E3EB' }} cachePolicy="memory-disk" onError={() => setFailed(true)} />;
  }
  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?';
  return (
    <View style={{ width: d, height: d, borderRadius: radius, backgroundColor: themeColor, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: radius * 0.8 }}>{initial}</Text>
    </View>
  );
}

function EditCommentDialog({ initial, close }: { initial: string; close: (v?: string) => void }) {
  const [value, setValue] = useState(initial);
  const canSave = value.trim().length > 0;
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: textPrimary }}>Edit comment</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoFocus
        multiline
        placeholder="Edit your comment…"
        placeholderTextColor={grey[500]}
        style={{ marginTop: 16, maxHeight: 140, borderRadius: 14, backgroundColor: '#F1F2F6', paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: textPrimary }}
      />
      <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => close()} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: grey[700], fontWeight: '500' }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => canSave && close(value)}
          disabled={!canSave}
          style={{ marginLeft: 8, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: canSave ? themeColor : '#E0E0E0' }}
        >
          <Text style={{ color: canSave ? '#FFFFFF' : grey[500], fontWeight: '600' }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
