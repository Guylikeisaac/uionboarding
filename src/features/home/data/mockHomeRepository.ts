import type { HomeContent } from './homeModels';

/**
 * In-memory Home chrome (banner + Jobs/People module headers). The jobs and
 * people lists are deliberately empty — real data comes from live providers.
 */
export function loadMockHome(): HomeContent {
  return {
    banner: {
      greetingPrefix: 'Good morning',
      firstName: 'Alex',
      emoji: '☀️',
      headline: 'Explore jobs matched to your profile',
      ctaLabel: 'View Jobs',
      ctaTarget: 'jobs',
      showGridTexture: true,
    },
    posts: [],
    jobs: { title: 'Jobs for you', seeAllLabel: 'See all', seeAllTarget: 'jobs', jobs: [] },
    people: { title: 'People you may know', seeAllLabel: 'See all', seeAllTarget: 'network', people: [] },
  };
}
