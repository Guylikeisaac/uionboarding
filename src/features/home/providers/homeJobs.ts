import { useQuery } from '@tanstack/react-query';

import { jobSearchQuery, type JobSummary } from '@/features/jobs/data/jobsModels';
import { jobsSearchRepository } from '@/features/jobs/data/jobsRepositories';
import type { JobItem } from '../data/homeModels';

/** A few real jobs for the Home "Jobs for you" module. */
export function useHomeJobs() {
  return useQuery<JobSummary[]>({
    queryKey: ['homeJobs'],
    queryFn: async () => (await jobsSearchRepository.searchJobs(jobSearchQuery({ page: 1, limit: 4 }))).jobs,
    gcTime: 0,
  });
}

export function homeJobItemOf(j: JobSummary): JobItem {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    logoAsset: j.companyLogo ? j.companyLogo : j.logoAsset,
    location: j.location,
    employmentType: j.employmentType,
    salaryRange: j.salaryRange,
    savedByMe: j.isSaved,
  };
}
