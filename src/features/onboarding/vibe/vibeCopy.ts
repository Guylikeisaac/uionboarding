import type { Vibe } from './vibeStore';

/**
 * Gen Z voice for the onboarding questionnaire, keyed by each step's ORIGINAL
 * title (same keys as `genzTheme`'s table). Only title/subtitle change — the
 * icon and everything saved to the backend stay the same.
 */
export const genzStepCopy: Record<string, { title: string; subtitle?: string }> = {
  'What brings you here?': { title: "What's the vibe today? 👀", subtitle: 'No wrong answers fr. You can switch it up later.' },
  'Upload your resume': { title: 'Drop your resume 📄', subtitle: "We'll do the boring typing for you. You're welcome." },
  'Where are you based?': { title: 'Where you at? 📍', subtitle: "So we can find gigs near you (remote ones too, ofc)." },
  'Which best describes you?': { title: "What's your era? ✨", subtitle: "Tell us where you're at so we can match the energy." },
  'Add your most recent experience': { title: 'Latest work era 💼', subtitle: 'The role you have rn, or the last one you held.' },
  'What kind of role are you open to?': { title: 'Which roles are giving? 🎯', subtitle: 'Pick all that hit.' },
  'What is your current and expected CTC?': { title: "Let's talk money 💸", subtitle: 'Stays private, no cap. Only used to match you with the right roles.' },
  'What is your expected CTC?': { title: 'What bag are you chasing? 💸', subtitle: 'Stays private, no cap. Only used to match you with the right roles.' },
  'What is your notice period?': { title: 'How long till you can dip? ⏳' },
  'When can you join?': { title: 'When can you pull up? 🚀' },
  'Tell us about your education': { title: 'School stuff 🎓', subtitle: "Where you studied, or where you're grinding rn." },
  'Did you do any internship?': { title: 'Done an internship yet? 🧑‍💻', subtitle: 'Every bit counts, even the chaotic ones.' },
  'Add your internship': { title: 'Spill the internship tea ☕' },
  'Add your projects': { title: 'Flex your projects 🛠️', subtitle: 'Side quests and hackathons totally count.' },
  'Write your top 5 skills': { title: 'Your top skills, bestie ⚡', subtitle: "Up to five things you're lowkey (highkey) great at." },
  'Add your work links': { title: 'Drop your links 🔗', subtitle: 'LinkedIn, GitHub, portfolio. Let the work talk.' },
  'Tell us about your work': { title: 'Where do you clock in? 🏢', subtitle: 'Company and title, or skip for now. No pressure.' },
  'Are you currently hiring?': { title: 'Hiring rn? 📣', subtitle: "We'll send the right people your way." },
  'Discover what drives you': { title: 'What are you into? 💫' },
  "What's your gender?": { title: 'Last one, promise 🙏', subtitle: 'Helps us keep SyncUp inclusive for everyone.' },
};

/** CTA labels, by the step's raw label. Unknown labels pass through. */
const genzButtons: Record<string, string> = {
  Continue: "Let's go →",
  Next: 'Next →',
  Proceed: 'Finish strong 🏁',
  Finish: 'Finish strong 🏁',
  Skip: 'Skip for now',
  'Get started': "Let's gooo 🚀",
  'Verify & Continue': 'Verify ✓',
  Verify: 'Verify ✓',
  'Finishing...': 'Wrapping up…',
  'Extracting...': 'Reading your resume… 👀',
  'Sending code...': 'Sending code…',
  'Creating account...': 'Setting things up…',
  'Verifying...': 'Checking…',
};

export function vibeButtonText(clean: string, raw: string, vibe: Vibe): string {
  if (vibe !== 'genz') return clean;
  return genzButtons[raw] ?? genzButtons[clean] ?? clean;
}

/** Everything else the onboarding says, in both voices. */
export const vibeText = {
  pro: {
    introChip: 'GETTING STARTED',
    introHi: (first: string) => `Hi ${first},`,
    introLine1: "let's build your",
    introLine2: 'profile card.',
    introBody:
      'Answer a few quick questions and watch your card fill in. Every answer earns a tag. Verify with Aadhaar at the end for the verified badge.',
    introTip: 'Tip: drag the card to tilt it',
    introPerks: ['About 2 minutes', 'Private by default', 'Aadhaar verified'],
    introCta: 'Get started',
    tagSubtitle: (w: number) => `+${w}% profile strength`,
    levelSubtitle: 'Keep going to strengthen your profile',
    completeTitle: 'Profile 100% complete',
    completeSubtitle: 'Verify with Aadhaar next to get the verified badge',
    leaveTitle: 'Leave setup?',
    leaveMessage: 'Your answers are saved. You can pick up where you left off.',
    leaveStay: 'Stay',
    leaveGo: 'Leave',
    enterApp: 'Enter SyncUp',
    detailsTitle: 'Tell us your name',
    detailsSubtitle: (email?: string) =>
      email ? `Add your details. This account will be associated with ${email}` : 'Add your details to finish setting up your account.',
    firstNameLabel: 'First Name',
    lastNameLabel: 'Last Name',
  },
  genz: {
    introChip: 'MAIN CHARACTER ERA ✨',
    introHi: (first: string) => `Hey ${first} 👋`,
    introLine1: "let's cook up your",
    introLine2: 'profile card 🔥',
    introBody:
      'Quick Qs, zero boring forms. Your card glows up with every answer and you unlock tags along the way. Verify with Aadhaar at the end for that blue-tick energy.',
    introTip: 'psst… drag the card, it tilts 👀',
    introPerks: ['~2 mins, fr', 'Private, no cap', 'Verified badge'],
    introCta: 'Get started',
    tagSubtitle: (w: number) => `+${w}% glow up 💅`,
    levelSubtitle: "You're on a roll, keep going 🔥",
    completeTitle: 'Profile 100% ate 💯',
    completeSubtitle: 'Verify with Aadhaar next for the verified badge ✅',
    leaveTitle: 'Dipping already? 🥺',
    leaveMessage: "Your answers are saved, don't stress. Pick up where you left off anytime.",
    leaveStay: 'Stay',
    leaveGo: 'Brb',
    enterApp: "Let's gooo 🚀",
    detailsTitle: 'What do we call you? 👀',
    detailsSubtitle: (email?: string) =>
      email ? `Drop your name + a pic so people know it's you. Linked to ${email}` : "Drop your name + a pic so people know it's you.",
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
  },
} satisfies Record<Vibe, Record<string, unknown>>;

export const textFor = (vibe: Vibe) => vibeText[vibe];
