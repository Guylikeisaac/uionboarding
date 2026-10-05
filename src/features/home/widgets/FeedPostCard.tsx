import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiConstants } from '@/core/constants/apiConstants';
import { accentPurpleLight, grey, textPrimary, themeColor } from '@/core/theme/colors';
import { AppNetworkImage } from '@/shared/ui/AppNetworkImage';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { measureInWindow, showAppPopover } from '@/shared/ui/overlay';
import { showSnackbar } from '@/shared/ui/snackbar';
import { Text } from '@/shared/ui/Text';
import { feedPostHasImage, feedPostHasNetworkImage, type FeedPost } from '../data/homeModels';
import { HomeAvatar, HomeColors, homeCardShadow, MediaPlaceholder } from './homePrimitives';
import { reactionOf, showReactionPicker } from './reactionPicker';

export type FeedPostMenuAction = 'save' | 'copy' | 'notInterested' | 'unfollow' | 'report';
export const kDefaultFeedPostMenu: FeedPostMenuAction[] = ['save', 'copy', 'notInterested', 'unfollow', 'report'];

/** "role @ company · time" with the parts the author actually has. */
function byline(post: FeedPost): string {
  const who = [post.author.role.trim(), post.author.company.trim()].filter(Boolean).join(' @ ');
  return who ? `${who} · ${post.timeAgo}` : post.timeAgo;
}

/**
 * Post card: author header + overflow, body, media, reaction summary,
 * divider, and the Like / Comment / Share / Save action row.
 */
export function FeedPostCard({
  post,
  onLike,
  onReact,
  onComment,
  onShare,
  onSave,
  onAuthorTap,
  menuActions = kDefaultFeedPostMenu,
}: {
  post: FeedPost;
  onLike: () => void;
  onReact: (type: string) => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onAuthorTap?: () => void;
  menuActions?: FeedPostMenuAction[];
}) {
  return (
    <View style={[styles.card, homeCardShadow]}>
      <View style={styles.header}>
        <Pressable onPress={onAuthorTap} disabled={!onAuthorTap} style={styles.authorRow}>
          <HomeAvatar name={post.author.name} assetPath={post.author.avatarAsset} size={42} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: textPrimary }}>{post.author.name}</Text>
            <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: grey[600] }}>
              {byline(post)}
            </Text>
          </View>
        </Pressable>
        <OverflowMenu postId={post.id} saved={post.savedByMe} onSave={onSave} actions={menuActions} />
      </View>

      {post.text ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <ExpandablePostText text={post.text} />
        </View>
      ) : null}

      {feedPostHasNetworkImage(post) ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <PostMedia urls={post.imageUrls} />
        </View>
      ) : feedPostHasImage(post) ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <MediaPlaceholder height={200} />
        </View>
      ) : null}

      <View style={styles.summary}>
        <ReactionEmojis emojis={post.topEmojis} />
        <Text style={{ marginLeft: 10, fontSize: 13.5, color: grey[600] }}>
          {post.reactionTotal} · {post.commentsCount} comments
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: HomeColors.divider, marginHorizontal: 12 }} />

      <View style={styles.actions}>
        <ReactionActionButton myType={post.myReactionType} onTap={onLike} onReact={onReact} />
        <ActionButton icon="mode-comment" label="Comment" onTap={onComment} />
        <ActionButton icon="share" label="Share" onTap={onShare} />
        <ActionButton
          icon={post.savedByMe ? 'bookmark' : 'bookmark-border'}
          label="Save"
          active={post.savedByMe}
          activeColor={themeColor}
          onTap={onSave}
        />
      </View>
    </View>
  );
}

const bodyStyle = { fontSize: 14.5, lineHeight: 19.6, color: '#1C1F2A' };
const COLLAPSED_LINES = 6;

/** Body text that collapses past 6 lines with an inline Read more / Read less. */
export function ExpandablePostText({ text }: { text: string }) {
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
    setOverflows(false);
  }, [text]);
  return (
    <View>
      {/* Hidden full-text measurement to decide whether "Read more" is needed. */}
      <Text
        style={[bodyStyle, { position: 'absolute', opacity: 0, left: 0, right: 0 }]}
        onTextLayout={(e) => setOverflows(e.nativeEvent.lines.length > COLLAPSED_LINES)}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {text}
      </Text>
      <Text style={bodyStyle} numberOfLines={overflows && !expanded ? COLLAPSED_LINES : undefined}>
        {text}
      </Text>
      {overflows ? (
        <Pressable onPress={() => setExpanded(!expanded)} style={{ marginTop: 4, paddingVertical: 2, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: themeColor }}>{expanded ? 'Read less' : 'Read more'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const danger = HomeColors.likeRed;
const dangerTile = '#FDECEA';

function OverflowMenu({
  postId,
  saved,
  onSave,
  actions,
}: {
  postId: string;
  saved: boolean;
  onSave: () => void;
  actions: FeedPostMenuAction[];
}) {
  const ref = useRef<View>(null);

  const handle = async (value: FeedPostMenuAction) => {
    switch (value) {
      case 'save':
        onSave();
        break;
      case 'copy':
        await Clipboard.setStringAsync(ApiConstants.postShareUrl(postId));
        showSnackbar('Link copied');
        break;
      default:
        showSnackbar("This isn't available yet.");
    }
  };

  const rowFor = (a: FeedPostMenuAction): { icon: IconName; title: string; subtitle: string; destructive?: boolean } => {
    switch (a) {
      case 'save':
        return saved
          ? { icon: 'bookmark', title: 'Unsave post', subtitle: 'Remove from your saved posts' }
          : { icon: 'bookmark-border', title: 'Save post', subtitle: 'Read it later' };
      case 'copy':
        return { icon: 'link', title: 'Copy link', subtitle: 'Share this post' };
      case 'notInterested':
        return { icon: 'visibility-off', title: 'Not interested', subtitle: 'See less like this' };
      case 'unfollow':
        return { icon: 'person-remove', title: 'Unfollow', subtitle: 'Hide their posts' };
      case 'report':
        return { icon: 'outlined-flag', title: 'Report post', subtitle: 'Flag as inappropriate', destructive: true };
    }
  };

  const open = async () => {
    const frame = await measureInWindow(ref);
    if (!frame) return;
    const width = 296;
    const left = Math.max(12, frame.x + frame.width - width);
    const picked = await showAppPopover<FeedPostMenuAction>((close) => (
      <View style={[styles.menu, { left, top: frame.y + 44, width }]}>
        {actions.map((a) => {
          const r = rowFor(a);
          const accent = r.destructive ? danger : themeColor;
          return (
            <Pressable key={a} onPress={() => close(a)} style={styles.menuRow}>
              <View style={[styles.menuTile, { backgroundColor: r.destructive ? dangerTile : accentPurpleLight }]}>
                <Icon name={r.icon} size={20} color={accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '600', color: r.destructive ? danger : textPrimary }}>{r.title}</Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: grey[600] }}>{r.subtitle}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    ));
    if (picked) void handle(picked);
  };

  return (
    <View ref={ref} collapsable={false}>
      <Pressable onPress={open} accessibilityLabel="More" style={{ padding: 8 }}>
        <Icon name="more-horiz" color={grey[600]} />
      </Pressable>
    </View>
  );
}

const MEDIA_HEIGHT = 200;

/** One image directly; several as a swipeable carousel with dots + counter. */
function PostMedia({ urls }: { urls: string[] }) {
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const img = (url: string) => (
    <AppNetworkImage url={url} width={width || '100%'} height={MEDIA_HEIGHT} error={<MediaPlaceholder height={MEDIA_HEIGHT} />} />
  );
  if (urls.length === 1) return <View style={{ borderRadius: 12, overflow: 'hidden' }}>{img(urls[0])}</View>;
  return (
    <View style={{ borderRadius: 12, overflow: 'hidden', height: MEDIA_HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {urls.map((u, i) => (
            <View key={`${u}-${i}`} style={{ width }}>
              {img(u)}
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.counter}>
        <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '600' }}>
          {page + 1}/{urls.length}
        </Text>
      </View>
      <View style={styles.dots}>
        {urls.map((_, i) => (
          <View
            key={i}
            style={{
              marginHorizontal: 2.5,
              width: i === page ? 8 : 6,
              height: i === page ? 8 : 6,
              borderRadius: 4,
              backgroundColor: i === page ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

function ReactionEmojis({ emojis }: { emojis: string[] }) {
  const shown = emojis.slice(0, 3);
  const d = 24;
  const step = 16;
  if (!shown.length) return null;
  return (
    <View style={{ width: d + step * (shown.length - 1), height: d }}>
      {shown.map((e, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * step,
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: HomeColors.control,
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 12 }}>{e}</Text>
        </View>
      ))}
    </View>
  );
}

/** Tap toggles; long-press opens the reaction bar. */
function ReactionActionButton({ myType, onTap, onReact }: { myType?: string; onTap: () => void; onReact: (t: string) => void }) {
  const ref = useRef<View>(null);
  const active = reactionOf(myType);
  const color = active?.color ?? HomeColors.actionGrey;
  return (
    <View ref={ref} collapsable={false}>
      <Pressable
        onPress={onTap}
        onLongPress={async () => {
          const frame = await measureInWindow(ref);
          if (frame) showReactionPicker(frame, onReact);
        }}
        style={styles.actionBtn}
      >
        {active ? <Text style={{ fontSize: 18 }}>{active.emoji}</Text> : <Icon name="favorite-border" size={20} color={color} />}
        <Text style={{ marginLeft: 6, fontSize: 14, color, fontWeight: '500' }}>{active?.label ?? 'Like'}</Text>
      </Pressable>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onTap,
  active = false,
  activeColor = HomeColors.likeRed,
}: {
  icon: IconName;
  label: string;
  onTap: () => void;
  active?: boolean;
  activeColor?: string;
}) {
  const color = active ? activeColor : HomeColors.actionGrey;
  return (
    <Pressable onPress={onTap} style={styles.actionBtn}>
      <Icon name={icon} size={20} color={color} />
      <Text style={{ marginLeft: 6, fontSize: 14, color, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 14, paddingRight: 8, paddingTop: 14 },
  authorRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  summary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  menu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  menuTile: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)' },
  dots: { position: 'absolute', left: 0, right: 0, bottom: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
