import { useQuery } from '@tanstack/react-query';

import { authManager } from '@/core/auth/authManager';
import { queryClient } from '@/core/query/queryClient';
import { prefs } from '@/core/storage/storage';
import type { User } from '@/features/auth/data/authModels';
import { experienceIsComplete, intentIsCandidate, type OnboardingAnswers } from '../models/onboardingAnswers';

/**
 * Profile strength: how complete the candidate's profile is (0–100). This is
 * NOT identity verification — only Aadhaar verification grants "verified".
 */
export interface StrengthItem {
  id: string;
  label: string;
  weight: number;
  done: boolean;
}

export interface Level {
  n: number;
  name: string;
}

export interface ProfileStrength {
  score: number;
  items: StrengthItem[];
  level: Level;
  complete: boolean;
}

export function levelOf(score: number): Level {
  if (score >= 100) return { n: 4, name: 'All-star' };
  if (score >= 70) return { n: 3, name: 'Strong' };
  if (score >= 35) return { n: 2, name: 'Rising' };
  return { n: 1, name: 'Starter' };
}

/** Weights add up to 100 on both the candidate and recruiter paths. */
export function computeProfileStrength(a: OnboardingAnswers, user: User | null): ProfileStrength {
  const account: StrengthItem[] = [
    { id: 'phone', label: 'Phone number', weight: 10, done: !!user && (user.phoneVerified || !!user.phone) },
    { id: 'email', label: 'Email address', weight: 10, done: !!user && (user.emailVerified || !!user.email) },
    { id: 'intent', label: 'Goal selected', weight: 5, done: a.intent != null },
  ];
  const candidate = a.intent == null || intentIsCandidate(a.intent);
  const rest: StrengthItem[] = candidate
    ? [
        { id: 'resume', label: 'Resume', weight: 15, done: !!a.resumeFileName },
        { id: 'location', label: 'Location', weight: 10, done: a.currentLocation != null },
        { id: 'profileType', label: 'Experience level', weight: 5, done: a.profileType != null },
        {
          id: 'background',
          label: a.profileType === 'experienced' ? 'Work experience' : 'Education',
          weight: 15,
          done: a.profileType === 'experienced' ? experienceIsComplete(a.experience) : a.education.college.trim().length > 0,
        },
        { id: 'skills', label: 'Skills', weight: 10, done: a.skills.length >= 3 },
        { id: 'links', label: 'Work links', weight: 10, done: [a.linkedinUrl, a.githubUrl, a.twitterUrl, a.websiteUrl].some((l) => l.trim().length > 0) },
        { id: 'interests', label: 'Interests', weight: 5, done: a.interests.length > 0 },
        { id: 'gender', label: 'Gender', weight: 5, done: a.gender != null },
      ]
    : [
        { id: 'work', label: 'Company and title', weight: 20, done: a.companyName.trim().length > 0 && a.recruiterRole != null },
        { id: 'hiring', label: 'Hiring status', weight: 10, done: a.currentlyHiring != null },
        { id: 'location', label: 'Location', weight: 15, done: a.currentLocation != null },
        { id: 'interests', label: 'Interests', weight: 15, done: a.interests.length > 0 },
        { id: 'gender', label: 'Gender', weight: 15, done: a.gender != null },
      ];
  const items = [...account, ...rest];
  const score = Math.min(100, items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0));
  return { score, items, level: levelOf(score), complete: score >= 100 };
}

// ── Persisted score (shown outside onboarding, e.g. the profile drawer) ─────

const keyFor = (userId: string) => `profile_strength_${userId}`;
const queryKey = ['profileStrength'] as const;

export async function saveProfileStrength(score: number) {
  const id = authManager.currentUser?.id;
  if (!id) return;
  await prefs.setInt(keyFor(id), score);
  void queryClient.invalidateQueries({ queryKey });
}

export function useStoredProfileStrength() {
  return useQuery<number | null>({
    queryKey,
    queryFn: async () => {
      const id = authManager.currentUser?.id;
      return id ? prefs.getInt(keyFor(id)) : null;
    },
  });
}
