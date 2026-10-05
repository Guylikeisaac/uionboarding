import { useQuery } from '@tanstack/react-query';

import { queryClient } from '@/core/query/queryClient';
import type { ExperienceCatalogs } from '../data/models/catalogOption';
import { onboardingRepository } from '../data/onboardingRepository';

const key = ['experienceCatalogs'] as const;

const options = {
  queryKey: key,
  queryFn: () => onboardingRepository.fetchExperienceCatalogs(),
  staleTime: Infinity,
};

/** `experienceCatalogsProvider` — fetched once, cached for the session. */
export function useExperienceCatalogs() {
  return useQuery<ExperienceCatalogs>(options);
}

export function fetchExperienceCatalogs(): Promise<ExperienceCatalogs> {
  return queryClient.fetchQuery<ExperienceCatalogs>(options);
}
