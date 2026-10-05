/**
 * The subset of `GET /resume/get-parsed-resume-data` the onboarding
 * questionnaire can prefill. Every field is optional and defensively read.
 */
export interface ParsedEducation {
  school?: string;
  degree?: string;
  fieldOfStudy?: string;
  endYear?: number;
}

export interface ParsedExperience {
  company?: string;
  jobTitle?: string;
  from?: Date;
  to?: Date;
  currentlyWorking: boolean;
}

export interface ParsedResume {
  fullName?: string;
  headline?: string;
  skills: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  education?: ParsedEducation;
  experience?: ParsedExperience;
  /** Free-text city — only seeds the location search box. */
  locationText?: string;
}

const links = (r: ParsedResume) => [r.linkedinUrl, r.githubUrl, r.twitterUrl, r.websiteUrl];

export function parsedResumeIsEmpty(r: ParsedResume): boolean {
  return r.skills.length === 0 && !r.education && !r.experience && links(r).every((l) => !l);
}

/** Human list of what was actually filled in. */
export function parsedResumeFilledSummary(r: ParsedResume): string[] {
  const out: string[] = [];
  if (r.education) out.push('education');
  if (r.experience) out.push('work experience');
  if (r.skills.length) out.push('skills');
  if (links(r).some((l) => !!l)) out.push('links');
  return out;
}

function asMap(v: unknown): Record<string, any> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : undefined;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

export function parsedResumeFromJson(json: Record<string, any>): ParsedResume {
  const root = asMap(json.resumeData) ?? json;
  const basics = asMap(root.basics) ?? asMap(root.personalInfo) ?? root;
  const l = asMap(root.profileLinks) ?? asMap(root.links) ?? asMap(root.socialLinks) ?? root;
  return {
    fullName: str(basics.name ?? basics.fullName),
    headline: str(basics.headline ?? basics.title ?? basics.jobTitle),
    locationText: str(basics.location ?? basics.city),
    skills: skillsOf(root.skills ?? root.keySkills),
    linkedinUrl: str(l.linkedin ?? l.linkedinUrl),
    githubUrl: str(l.github ?? l.githubUrl),
    twitterUrl: str(l.twitter ?? l.twitterUrl),
    websiteUrl: str(l.website ?? l.personalWebsite ?? l.portfolio),
    education: parsedEducationFromAny(root.education),
    experience: parsedExperienceFromAny(root.experience ?? root.workExperience ?? root.employment),
  };
}

/** Skills arrive as `["Dart"]`, `[{name: "Dart"}]` or a comma-joined string. */
function skillsOf(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return raw
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => {
      if (typeof e === 'string') return e.trim();
      const m = asMap(e);
      if (m) return str(m.name ?? m.skill ?? m.title) ?? '';
      return '';
    })
    .filter(Boolean);
}

function firstMap(raw: unknown): Record<string, any> | undefined {
  if (Array.isArray(raw)) {
    for (const e of raw) {
      const m = asMap(e);
      if (m) return m;
    }
    return undefined;
  }
  return asMap(raw);
}

export function parsedEducationFromAny(raw: unknown): ParsedEducation | undefined {
  const m = firstMap(raw);
  if (!m) return undefined;
  const e: ParsedEducation = {
    school: str(m.school ?? m.institution ?? m.college),
    degree: str(m.degreeName ?? m.degree),
    fieldOfStudy: str(m.fieldOfStudyName ?? m.fieldOfStudy ?? m.specialization),
    endYear: yearOf(m.endDate ?? m.endYear ?? m.graduationYear),
  };
  return e.school == null && e.degree == null ? undefined : e;
}

const endOf = (r: Record<string, any>) => r.endMonthYear ?? r.endDate ?? r.to;
const startOf = (r: Record<string, any>) => r.startMonthYear ?? r.startDate ?? r.from;
const isCurrentRow = (r: Record<string, any>) =>
  r.currentlyWorking === true || r.isCurrent === true || str(endOf(r)) == null;

/** Current role first, then latest end, then latest start. */
function mostRecent(raw: unknown): Record<string, any> | undefined {
  if (!Array.isArray(raw)) return asMap(raw);
  const rows = raw.map(asMap).filter((m): m is Record<string, any> => !!m);
  if (!rows.length) return undefined;
  const newestFirst = (a?: Date, b?: Date) => {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return b.getTime() - a.getTime();
  };
  rows.sort((a, b) => {
    const ac = isCurrentRow(a);
    const bc = isCurrentRow(b);
    if (ac !== bc) return ac ? -1 : 1;
    const byEnd = newestFirst(parseLooseDate(endOf(a)), parseLooseDate(endOf(b)));
    if (byEnd !== 0) return byEnd;
    return newestFirst(parseLooseDate(startOf(a)), parseLooseDate(startOf(b)));
  });
  return rows[0];
}

export function parsedExperienceFromAny(raw: unknown): ParsedExperience | undefined {
  const m = mostRecent(raw);
  if (!m) return undefined;
  const endRaw = endOf(m);
  const current = m.currentlyWorking === true || m.isCurrent === true || str(endRaw) == null;
  const e: ParsedExperience = {
    company: str(m.companyName ?? m.company ?? m.organization),
    jobTitle: str(m.jobTitle ?? m.title ?? m.role),
    from: parseLooseDate(startOf(m)),
    to: current ? undefined : parseLooseDate(endRaw),
    currentlyWorking: current,
  };
  return e.company == null && e.jobTitle == null ? undefined : e;
}

/**
 * Parses the date shapes this payload uses: ISO, `MM/YYYY` / `MM-YYYY`, or a
 * bare year.
 */
export function parseLooseDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}(-\d{2})?([T ].*)?$/.test(s)) {
    const t = Date.parse(s.length === 7 ? `${s}-01` : s);
    if (!Number.isNaN(t)) {
      // Date-only ISO strings parse as UTC; rebuild as a local calendar date.
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) {
        const [y, mo, d] = s.split('-').map(Number);
        return new Date(y, mo - 1, d || 1);
      }
      return new Date(t);
    }
  }
  const my = /^(\d{1,2})[/-](\d{4})$/.exec(s);
  if (my) {
    const month = parseInt(my[1], 10);
    const year = parseInt(my[2], 10);
    if (month >= 1 && month <= 12) return new Date(year, month - 1, 1);
  }
  if (/^\d+$/.test(s)) {
    const year = parseInt(s, 10);
    if (year > 1900 && year < 2200) return new Date(year, 0, 1);
  }
  return undefined;
}

function yearOf(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') {
    const n = Math.trunc(v);
    return n > 1900 && n < 2200 ? n : undefined;
  }
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n > 1900 && n < 2200) return n;
  }
  return parseLooseDate(s)?.getFullYear();
}
