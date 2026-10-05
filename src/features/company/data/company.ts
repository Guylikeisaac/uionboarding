import { useQuery } from '@tanstack/react-query';

import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage, statusOf } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';

const str = (v: unknown) => (v == null ? '' : String(v).trim());
const int = (v: unknown) => (typeof v === 'number' ? Math.trunc(v) : 0);
const map = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : {});

export interface CompanyLocation {
  id: string;
  city: string;
  state: string;
  country: string;
  label: string;
}

export function companyLocationFromJson(j: Record<string, any>): CompanyLocation {
  return { id: str(j.id), city: str(j.city), state: str(j.state), country: str(j.country), label: str(j.label) };
}

export const locationDisplay = (l: CompanyLocation) => (l.label ? l.label : [l.city, l.state, l.country].filter(Boolean).join(', '));

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  location: string;
  companySize: string;
  logoUrl: string;
  industryName: string;
}

export function companySummaryFromJson(j: Record<string, any>): CompanySummary {
  const loc = locationDisplay(companyLocationFromJson(map(j.locationDetails)));
  return {
    id: str(j.id),
    name: str(j.name),
    slug: str(j.slug),
    tagline: str(j.tagline),
    location: loc || str(j.location),
    companySize: str(j.companySize),
    logoUrl: str(j.logoUrl),
    industryName: str(map(j.industry).name),
  };
}

export interface CompanySearchPage {
  companies: CompanySummary[];
  page: number;
  total: number;
  totalPages: number;
}

export interface CompanyStats {
  followersCount: number;
  employeesCount: number;
  adminsCount: number;
  jobsCount: number;
  viewsCount: number;
}

export interface CompanyViewerContext {
  isFollowing: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
}

export interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  overview: string;
  about: string;
  location: string;
  companySize: string;
  logoUrl: string;
  bannerUrl: string;
  website: string;
  linkedInUrl: string;
  youtubeUrl: string;
  twitterUsername: string;
  instagramUsername: string;
  facebookUsername: string;
  industryName: string;
  officeLocations: string[];
  stats: CompanyStats;
  viewer: CompanyViewerContext;
}

export function companyDetailFromJson(j: Record<string, any>): CompanyDetail {
  const loc = locationDisplay(companyLocationFromJson(map(j.locationDetails)));
  const offices: string[] = [];
  if (Array.isArray(j.officeLocationDetails)) {
    for (const e of j.officeLocationDetails) {
      if (e && typeof e === 'object') {
        const label = locationDisplay(companyLocationFromJson(e));
        if (label && !offices.includes(label)) offices.push(label);
      }
    }
  }
  if (!offices.length && Array.isArray(j.officeLocations)) {
    for (const e of j.officeLocations) {
      const label = str(e);
      if (label && !offices.includes(label)) offices.push(label);
    }
  }
  const s = map(j.stats);
  const u = map(j.userContext);
  return {
    id: str(j.id),
    name: str(j.name),
    slug: str(j.slug),
    tagline: str(j.tagline),
    overview: str(j.overview),
    about: str(j.about),
    location: loc || str(j.location),
    companySize: str(j.companySize),
    logoUrl: str(j.logoUrl),
    bannerUrl: str(j.bannerUrl),
    website: str(j.website),
    linkedInUrl: str(j.linkedInUrl),
    youtubeUrl: str(j.youtubeUrl),
    twitterUsername: str(j.twitterUsername),
    instagramUsername: str(j.instagramUsername),
    facebookUsername: str(j.facebookUsername),
    industryName: str(map(j.industry).name),
    officeLocations: offices,
    stats: {
      followersCount: int(s.followersCount),
      employeesCount: int(s.employeesCount),
      adminsCount: int(s.adminsCount),
      jobsCount: int(s.jobsCount),
      viewsCount: int(s.viewsCount),
    },
    viewer: { isFollowing: u.isFollowing === true, isAdmin: u.isAdmin === true, isEmployee: u.isEmployee === true },
  };
}

/** A dead/renamed slug. */
export class CompanyNotFoundException extends RepositoryException {
  constructor() {
    super('This company could not be found.');
  }
}

const dataMap = (body: any) => map(body?.data);
const msg = (e: unknown) => serverMessage(e)?.trim() || undefined;

export const companyRepository = {
  async searchCompanies(query: string, page = 1, limit = 10): Promise<CompanySearchPage> {
    try {
      const res = await apiClient.get(ApiConstants.company(ApiConstants.companySearch), { params: { search: query, page, limit } });
      const d = dataMap(res.data);
      const p = map(d.pagination);
      return {
        companies: Array.isArray(d.companies)
          ? d.companies.filter((e: unknown) => e && typeof e === 'object').map((e: any) => companySummaryFromJson(e))
          : [],
        page: int(p.page),
        total: int(p.total),
        totalPages: int(p.totalPages),
      };
    } catch (e) {
      throw new RepositoryException(msg(e) ?? "Couldn't load companies.", { cause: e });
    }
  },

  async getCompany(slug: string): Promise<CompanyDetail> {
    let res;
    try {
      res = await apiClient.get(ApiConstants.company(ApiConstants.companyBySlug(slug)));
    } catch (e) {
      if (statusOf(e) === 404) throw new CompanyNotFoundException();
      throw new RepositoryException(msg(e) ?? "Couldn't load this company.", { cause: e });
    }
    const detail = companyDetailFromJson(map(dataMap(res.data).company));
    if (!detail.name && !detail.slug) throw new CompanyNotFoundException();
    return detail;
  },
};

/** Company profile for one slug (autoDispose, no auto retry). */
export function useCompanyDetail(slug: string) {
  return useQuery<CompanyDetail>({ queryKey: ['companyDetail', slug], queryFn: () => companyRepository.getCompany(slug), gcTime: 0, enabled: !!slug });
}
