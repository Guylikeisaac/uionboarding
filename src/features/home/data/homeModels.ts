/** Content models the Home UI renders (not backend DTOs). */

export interface GreetingBannerData {
  greetingPrefix: string;
  firstName: string;
  emoji: string;
  headline: string;
  ctaLabel: string;
  ctaTarget: string;
  showGridTexture: boolean;
}

export interface PostAuthor {
  name: string;
  role: string;
  company: string;
  avatarAsset: string;
  /** Public handle for opening the author's profile. */
  handle: string;
}

export interface FeedPost {
  id: string;
  author: PostAuthor;
  timeAgo: string;
  text: string;
  imageAsset?: string;
  /** Network media URLs, in order; more than one renders a carousel. */
  imageUrls: string[];
  reactionTotal: number;
  topEmojis: string[];
  /** Per-type reaction counts by backend enum. */
  reactionCounts: Record<string, number>;
  /** The signed-in user's reaction type, or undefined. */
  myReactionType?: string;
  commentsCount: number;
  savedByMe: boolean;
}

export const feedPostHasNetworkImage = (p: FeedPost) => p.imageUrls.length > 0;
export const feedPostHasImage = (p: FeedPost) => feedPostHasNetworkImage(p) || !!p.imageAsset;
export const feedPostReactedByMe = (p: FeedPost) => p.myReactionType != null;

export interface JobItem {
  id: string;
  title: string;
  company: string;
  logoAsset: string;
  location: string;
  employmentType: string;
  salaryRange: string;
  savedByMe: boolean;
}

export interface JobsModuleData {
  title: string;
  seeAllLabel: string;
  seeAllTarget: string;
  jobs: JobItem[];
}

export interface PersonSuggestion {
  id: string;
  /** Public handle used to open the person's profile. */
  userId: string;
  name: string;
  role: string;
  company: string;
  avatarAsset: string;
  mutualCount: number;
  /** Pre-built relationship metric ("12 mutual", "3 shared skills"). */
  mutualLabel?: string;
  connected: boolean;
}

export interface PeopleModuleData {
  title: string;
  seeAllLabel: string;
  seeAllTarget: string;
  people: PersonSuggestion[];
}

export interface HomeContent {
  banner: GreetingBannerData;
  posts: FeedPost[];
  jobs: JobsModuleData;
  people: PeopleModuleData;
}
