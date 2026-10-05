import type { IconName } from '@/shared/ui/Icon';
import { genzStepCopy } from '../vibe/vibeCopy';
import type { Vibe } from '../vibe/vibeStore';

/**
 * Dark monochrome Gen Z palette — black canvas, white type, grey surfaces.
 * `fg` is the foreground (text / icons / active fills); `onFg` is what sits
 * on top of an `fg` fill (the black label on a white pill).
 */
export const Genz = {
  bg: '#000000',
  surface: '#111111',
  surfaceHi: '#1B1B1B',
  stroke: '#2A2A2A',
  strokeHi: '#3D3D3D',
  fg: '#FFFFFF',
  onFg: '#000000',
  fgSoft: '#A1A1A1',
  fgFaint: '#626262',
  disabled: '#262626',
  disabledFg: '#5E5E5E',
  error: '#FF6B5E',
  errorSurface: '#2A1311',
  // Legacy aliases (pre-dark names) so nothing reads a missing key.
  ink: '#FFFFFF',
  inkSoft: '#A1A1A1',
  inkFaint: '#626262',
  page: '#000000',
  tint: '#1B1B1B',
  cardEdge: '#2E2E2E',
};

export interface GenzCopy {
  title: string;
  subtitle?: string;
  icon: IconName;
}

/**
 * Display copy for each questionnaire screen, keyed by the step's original
 * title. Presentation only — what's saved to the backend is unchanged.
 */
const copy: Record<string, GenzCopy> = {
  'What brings you here?': { title: 'What brings you to SyncUp?', subtitle: 'Choose what fits best. You can change it later.', icon: 'flag' },
  'Upload your resume': { title: 'Upload your resume', subtitle: "We'll use it to fill in your details automatically.", icon: 'description' },
  'Where are you based?': { title: 'Where are you based?', subtitle: "We'll show you opportunities nearby and remote roles.", icon: 'place' },
  'Which best describes you?': { title: 'Which best describes you?', subtitle: 'This helps us tailor your experience.', icon: 'timeline' },
  'Add your most recent experience': { title: 'Your most recent role', subtitle: "Add the role you're in now, or the last one you held.", icon: 'work-outline' },
  'What kind of role are you open to?': { title: 'Which roles interest you?', subtitle: 'Select all that apply.', icon: 'explore' },
  'What is your current and expected CTC?': { title: 'Your compensation', subtitle: 'Kept private. Used only to match you with the right roles.', icon: 'payments' },
  'What is your expected CTC?': { title: 'Expected compensation', subtitle: 'Kept private. Used only to match you with the right roles.', icon: 'payments' },
  'What is your notice period?': { title: "What's your notice period?", icon: 'hourglass-empty' },
  'When can you join?': { title: 'When can you start?', icon: 'rocket-launch' },
  'Tell us about your education': { title: 'Your education', subtitle: "Where you studied, or where you're studying now.", icon: 'school' },
  'Did you do any internship?': { title: 'Have you done an internship?', subtitle: 'Every bit of experience counts.', icon: 'laptop-mac' },
  'Add your internship': { title: 'Tell us about your internship', icon: 'laptop-mac' },
  'Add your projects': { title: 'Showcase your projects', subtitle: 'Side projects and hackathons count too.', icon: 'build' },
  'Write your top 5 skills': { title: 'Your top skills', subtitle: "Add up to five skills you're strongest in.", icon: 'bolt' },
  'Add your work links': { title: 'Add your work links', subtitle: 'LinkedIn, GitHub, portfolio. Let your work speak for you.', icon: 'link' },
  'Tell us about your work': { title: 'Where do you work?', subtitle: 'Add your company and title, or skip for now.', icon: 'business' },
  'Are you currently hiring?': { title: 'Are you hiring right now?', subtitle: "We'll connect you with the right candidates.", icon: 'campaign' },
  'Discover what drives you': { title: 'What interests you?', icon: 'interests' },
  "What's your gender?": { title: 'Last one: your gender', subtitle: 'Helps us keep SyncUp inclusive.', icon: 'person-outline' },
};

/** Step copy in the professional voice, or the Gen Z one when [vibe] is 'genz'. */
export function genzCopyFor(title: string, subtitle?: string, vibe: Vibe = 'pro'): GenzCopy {
  const c = copy[title];
  const base: GenzCopy = c ? { ...c, subtitle: c.subtitle ?? subtitle } : { title, subtitle, icon: 'timeline' };
  const g = vibe === 'genz' ? genzStepCopy[title] : undefined;
  return g ? { ...base, title: g.title, subtitle: g.subtitle ?? base.subtitle } : base;
}
