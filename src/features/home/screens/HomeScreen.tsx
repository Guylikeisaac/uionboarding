import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/core/auth/authManager';
import { ApiConstants } from '@/core/constants/apiConstants';
import { errorMessage } from '@/core/data/repositoryException';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { ShareMessages } from '@/core/helpers/shareMessageBuilder';
import { go, push, pushWithExtra } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { grey, textPrimary, themeColor } from '@/core/theme/colors';
import type { NetworkPerson } from '@/features/network/data/networkModels';
import { peopleNetworkActions, usePeopleNetwork } from '@/features/network/providers/networkProviders';
import { showPostCommentsSheet } from '@/features/post/widgets/PostCommentsSheet';
import { Icon } from '@/shared/ui/Icon';
import { showSnackbar } from '@/shared/ui/snackbar';
import { Text } from '@/shared/ui/Text';
import type { FeedPost, GreetingBannerData, PersonSuggestion } from '../data/homeModels';
import { loadMockHome } from '../data/mockHomeRepository';
import { homeFeedActions, useHomeFeed } from '../providers/homeFeed';
import { homeJobItemOf, useHomeJobs } from '../providers/homeJobs';
import { welcomeSheetController } from '../providers/welcomeSheet';
import { FeedPostCard } from '../widgets/FeedPostCard';
import { GreetingBanner } from '../widgets/GreetingBanner';
import { HomeAppBar } from '../widgets/HomeAppBar';
import { HomeColors, homeCardShadow } from '../widgets/homePrimitives';
import { JobsModule } from '../widgets/JobsModule';
import { PeopleModule } from '../widgets/PeopleModule';
import { showWelcomeSheet } from '../widgets/WelcomeSheet';

const content = loadMockHome();

async function runAction(action: () => Promise<void>) {
  try {
    await action();
  } catch (e) {
    showSnackbar(errorMessage(e), { isError: true });
  }
}

/** Skill overlap must never read as "mutual". */
function compactMetricOf(p: NetworkPerson): string {
  if (p.skillMetric) {
    if (p.mutualCount <= 0) return 'Suggested for you';
    return p.mutualCount === 1 ? '1 shared skill' : `${p.mutualCount} shared skills`;
  }
  return `${p.mutualCount}${p.mutualCapped ? '+' : ''} mutual`;
}

function homePersonOf(p: NetworkPerson): PersonSuggestion {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    role: p.title,
    company: p.company,
    avatarAsset: p.avatarUrl ? p.avatarUrl : p.avatarAsset,
    mutualCount: p.mutualCount,
    mutualLabel: compactMetricOf(p),
    connected: p.status === 'requested',
  };
}

function realGreeting(base: GreetingBannerData, fullName: string): GreetingBannerData {
  const name = fullName.trim();
  const first = name ? name.split(/\s+/)[0] : '';
  const hour = new Date().getHours();
  const prefix = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return { ...base, greetingPrefix: prefix, firstName: first };
}

async function sharePost(postId: string) {
  if (!postId) return;
  const url = ApiConstants.postShareUrl(postId);
  await Share.share({ message: ShareMessages.post(url), title: ShareMessages.postSubject }, { subject: ShareMessages.postSubject });
}

function openComments(post: FeedPost) {
  showPostCommentsSheet(post.id, {
    initialCount: post.commentsCount,
    onCommentAdded: () => homeFeedActions.bumpCommentCount(post.id, 1),
  });
}

type Item = { key: string; render: () => React.ReactElement };

/**
 * Home tab: fixed header above one scrolling feed (real posts, paged),
 * with "Jobs for you" after the 3rd post and "People you may know" after the 5th.
 * Drives the one-time welcome sheet on first visit.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuth((a) => a.currentUser);
  const feed = useHomeFeed();
  const realJobs = useHomeJobs().data;
  const realPeopleTab = usePeopleNetwork().data;

  const userName = user?.name ?? content.banner.firstName;
  const avatarUrl = sanitizeAvatarUrl(user?.profilePic);

  // One-time welcome sheet (marked at show-time so a kill mid-display can't re-trigger).
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    void (async () => {
      if (!(await welcomeSheetController.shouldShowForCurrentUser())) return;
      await welcomeSheetController.markShownForCurrentUser();
      await showWelcomeSheet();
    })();
  }, []);

  const items = useMemo<Item[]>(() => {
    const posts = feed.posts;
    const hasRealJobs = !!realJobs && realJobs.length > 0;
    const jobsData = hasRealJobs ? { ...content.jobs, jobs: realJobs.map(homeJobItemOf) } : content.jobs;
    const jobs: Item = {
      key: 'jobs',
      render: () => (
        <JobsModule
          data={jobsData}
          onSeeAll={() => go(RouteNames.jobs)}
          onTapJob={(jobId) => {
            if (!hasRealJobs) return go(RouteNames.jobs);
            const summary = realJobs.find((j) => j.id === jobId);
            pushWithExtra(RouteNames.jobDetailPath(jobId), summary);
          }}
          onToggleSave={() => showSnackbar('Open the Jobs tab to save jobs.')}
        />
      ),
    };

    const realPeople = [...(realPeopleTab?.peopleYouMayKnow ?? []), ...(realPeopleTab?.suggestions ?? [])];
    const hasRealPeople = realPeople.length > 0;
    const peopleData = hasRealPeople ? { ...content.people, people: realPeople.slice(0, 10).map(homePersonOf) } : content.people;
    const people: Item = {
      key: 'people',
      render: () => (
        <PeopleModule
          data={peopleData}
          onSeeAll={() => go(RouteNames.network)}
          onTapPerson={hasRealPeople ? (p) => push(RouteNames.profilePublic, { userId: p.userId }) : undefined}
          onToggleConnect={(id) => {
            if (hasRealPeople) void runAction(() => peopleNetworkActions.toggleConnect(id));
          }}
        />
      ),
    };

    const postItem = (p: FeedPost): Item => ({
      key: `post-${p.id}`,
      render: () => (
        <FeedPostCard
          post={p}
          onLike={() => void runAction(() => homeFeedActions.toggleLike(p.id))}
          onReact={(type) => void runAction(() => homeFeedActions.setReaction(p.id, type))}
          onSave={() => void runAction(() => homeFeedActions.toggleSave(p.id))}
          onComment={() => openComments(p)}
          onAuthorTap={p.author.handle ? () => push(RouteNames.profilePublic, { userId: p.author.handle }) : undefined}
          onShare={() => void sharePost(p.id)}
        />
      ),
    });

    const out: Item[] = [
      {
        key: 'banner',
        render: () => <GreetingBanner data={realGreeting(content.banner, user?.name ?? '')} onTapCta={() => go(RouteNames.jobs)} />,
      },
    ];
    if (posts.length === 0) {
      out.push({ key: 'empty', render: () => <EmptyFeedCard /> }, jobs, people);
    } else {
      posts.forEach((p, i) => {
        out.push(postItem(p));
        if (i === 2) out.push(jobs);
        if (i === 4) out.push(people);
      });
      if (posts.length <= 2) out.push(jobs);
      if (posts.length <= 4) out.push(people);
      if (feed.isFetchingNextPage) {
        out.push({
          key: 'more',
          render: () => (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={themeColor} />
            </View>
          ),
        });
      } else if (!feed.hasNextPage) {
        out.push({
          key: 'end',
          render: () => <Text style={{ paddingVertical: 18, textAlign: 'center', fontSize: 13, color: grey[500] }}>{"You're all caught up"}</Text>,
        });
      }
    }
    return out;
  }, [feed.posts, feed.isFetchingNextPage, feed.hasNextPage, realJobs, realPeopleTab, user?.name]);

  return (
    <View style={{ flex: 1, backgroundColor: HomeColors.page, paddingTop: insets.top }}>
      <HomeAppBar userName={userName} avatarUrl={avatarUrl} />
      {feed.isPending ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={themeColor} />
        </View>
      ) : feed.isError && feed.posts.length === 0 ? (
        <FeedErrorView message={errorMessage(feed.error)} onRetry={() => void feed.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.key}
          renderItem={({ item }) => item.render()}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 96 }}
          onEndReachedThreshold={0.5}
          onEndReached={feed.loadMore}
          refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={themeColor} colors={[themeColor]} />}
        />
      )}
    </View>
  );
}

function FeedErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Icon name="cloud-off" size={44} color={grey[400]} />
      <Text style={{ marginTop: 14, textAlign: 'center', fontSize: 14, color: grey[600] }}>{message}</Text>
      <Pressable onPress={onRetry} style={{ marginTop: 18, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: themeColor }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyFeedCard() {
  return (
    <View style={[{ marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 20, paddingVertical: 28, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center' }, homeCardShadow]}>
      <Icon name="dynamic-feed" size={40} color={grey[400]} />
      <Text style={{ marginTop: 12, fontSize: 15.5, fontWeight: '700', color: textPrimary }}>No posts yet</Text>
      <Text style={{ marginTop: 4, textAlign: 'center', fontSize: 13.5, color: grey[600] }}>Be the first to share something with your network.</Text>
    </View>
  );
}
