/** Sample content for demo mode — realistic but clearly fictional people. */

const avatar = (n: number) => `https://i.pravatar.cc/300?img=${n}`;
const photo = (id: string) => `https://images.unsplash.com/${id}?w=900&q=70&auto=format&fit=crop`;
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const demoPeople = [
  { id: 'u-aanya', userId: 'aanya.k', name: 'Aanya Kapoor', userTitle: 'Product Designer @ Razorpay', profilePic: avatar(47), mutual: 24 },
  { id: 'u-vihaan', userId: 'vihaan.dev', name: 'Vihaan Mehta', userTitle: 'SDE II @ Swiggy', profilePic: avatar(12), mutual: 18 },
  { id: 'u-ishita', userId: 'ishita.codes', name: 'Ishita Rao', userTitle: 'ML Engineer @ Sarvam AI', profilePic: avatar(45), mutual: 15 },
  { id: 'u-kabir', userId: 'kabir.builds', name: 'Kabir Singh', userTitle: 'Founder @ Stealth', profilePic: avatar(33), mutual: 11 },
  { id: 'u-meera', userId: 'meera.writes', name: 'Meera Iyer', userTitle: 'Growth Marketer @ CRED', profilePic: avatar(44), mutual: 9 },
  { id: 'u-arjun', userId: 'arjun.ux', name: 'Arjun Nair', userTitle: 'UX Researcher @ Zomato', profilePic: avatar(15), mutual: 7 },
  { id: 'u-sara', userId: 'sara.pm', name: 'Sara Khan', userTitle: 'APM @ Meesho', profilePic: avatar(49), mutual: 6 },
  { id: 'u-rohan', userId: 'rohan.data', name: 'Rohan Gupta', userTitle: 'Data Analyst @ PhonePe', profilePic: avatar(53), mutual: 4 },
];

const author = (i: number) => {
  const p = demoPeople[i];
  return { id: p.id, userId: p.userId, name: p.name, profilePic: p.profilePic, userTitle: p.userTitle };
};

export const demoPosts: Record<string, any>[] = [
  {
    id: 'p1',
    author: author(0),
    content:
      '<p>shipped my first design system at work today 🎨✨</p><p>6 months, 140 components, 0 regrets. biggest learning: name things like a human would search for them. "ButtonPrimaryLargeV2Final" is not it.</p><p>open to feedback from fellow designers 👇</p>',
    media: [{ id: 'm1', type: 'IMAGE', url: photo('photo-1561070791-2526d30994b5') }],
    interactionCounts: { LIKE: 182, LOVE: 64, WOW: 12 },
    commentCount: 23,
    createdAt: ago(38),
  },
  {
    id: 'p2',
    author: author(2),
    content:
      '<p>hot take: the best way to learn ML in 2026 is still to build something tiny and annoying for yourself.</p><p>I trained a model that tells me when my chai is about to boil over ☕🤖. accuracy: 94%. usefulness: immeasurable.</p>',
    media: [],
    interactionCounts: { LIKE: 421, SMILE: 133, LOVE: 40 },
    commentCount: 57,
    createdAt: ago(120),
  },
  {
    id: 'p3',
    author: author(3),
    content:
      "<p>we're hiring our first 3 engineers 🚀</p><p>no 6-round interviews. one chat, one small paid project, decision in 72 hours. if you like building from zero, DM me or apply on SyncUp.</p>",
    media: [
      { id: 'm2', type: 'IMAGE', url: photo('photo-1522071820081-009f0129c71c') },
      { id: 'm3', type: 'IMAGE', url: photo('photo-1552664730-d307ca884978') },
    ],
    interactionCounts: { LIKE: 298, WOW: 41, LOVE: 22 },
    commentCount: 88,
    createdAt: ago(300),
  },
  {
    id: 'p4',
    author: author(1),
    content:
      '<p>got promoted to SDE II today 🥹</p><p>2 years ago I was rejected from 41 companies. kept a spreadsheet. kept applying. kept building side projects. to anyone in the rejection era right now — it ends. keep going.</p>',
    media: [],
    interactionCounts: { LIKE: 1204, LOVE: 389, WOW: 22 },
    commentCount: 211,
    createdAt: ago(1440),
  },
  {
    id: 'p5',
    author: author(4),
    content:
      '<p>3 things that grew our app 10x without ads:</p><p>1. referral that rewards BOTH people<br/>2. onboarding that feels like a game, not a form<br/>3. notifications people actually want</p><p>which one should I break down next? 👀</p>',
    media: [{ id: 'm4', type: 'IMAGE', url: photo('photo-1460925895917-afdab827c52f') }],
    interactionCounts: { LIKE: 512, WOW: 88 },
    commentCount: 64,
    createdAt: ago(2000),
  },
  {
    id: 'p6',
    author: author(5),
    content:
      '<p>interviewed 30 college students about job hunting. the #1 pain point wasn\'t finding jobs — it was never hearing back. ghosting is the real villain 👻</p>',
    media: [],
    interactionCounts: { LIKE: 233, SAD: 41 },
    commentCount: 37,
    createdAt: ago(3000),
  },
  {
    id: 'p7',
    author: author(6),
    content: '<p>PM interview tip that nobody tells you: ask the interviewer what they would cut from the product. you learn more in that answer than in the whole JD.</p>',
    media: [{ id: 'm5', type: 'IMAGE', url: photo('photo-1517245386807-bb43f82c33c4') }],
    interactionCounts: { LIKE: 176, LOVE: 19 },
    commentCount: 12,
    createdAt: ago(4300),
  },
  {
    id: 'p8',
    author: author(7),
    content: '<p>made a dashboard of every chai I drank this quarter. 212 cups. productivity correlation: 0.03. emotional correlation: 1.0 ☕📊</p>',
    media: [],
    interactionCounts: { LIKE: 340, SMILE: 210 },
    commentCount: 45,
    createdAt: ago(6000),
  },
];

const company = (name: string, industry: string) => ({ name, industry, logo: '' });

export const demoJobs: Record<string, any>[] = [
  { _id: 'j1', title: 'Frontend Engineer (React Native)', company: company('Razorpay', 'Fintech'), location: 'Bengaluru', jobType: 'FULL_TIME', remoteType: 'HYBRID', salaryMin: 1800000, salaryMax: 2800000, experienceLevel: 'Mid', benefits: ['Health insurance', 'ESOPs', 'Learning budget'], description: 'Build delightful mobile payment experiences used by millions of businesses. You will own features end to end, from design handoff to release.' },
  { _id: 'j2', title: 'Product Design Intern', company: company('CRED', 'Fintech'), location: 'Bengaluru', jobType: 'INTERNSHIP', remoteType: 'ONSITE', salaryMin: 60000, salaryMax: 80000, experienceLevel: 'Entry', benefits: ['Mentorship', 'PPO opportunity'], description: 'Design crisp, premium experiences with a team obsessed with craft.' },
  { _id: 'j3', title: 'ML Engineer — LLMs', company: company('Sarvam AI', 'AI'), location: 'Remote', jobType: 'FULL_TIME', remoteType: 'REMOTE', salaryMin: 3000000, salaryMax: 4500000, experienceLevel: 'Senior', benefits: ['Remote first', 'GPU budget'], description: 'Train and ship Indic language models used across the country.' },
  { _id: 'j4', title: 'Associate Product Manager', company: company('Meesho', 'E-commerce'), location: 'Bengaluru', jobType: 'FULL_TIME', remoteType: 'HYBRID', salaryMin: 2000000, salaryMax: 2600000, experienceLevel: 'Entry', benefits: ['Wellness', 'Flexible hours'], description: 'Own a slice of the seller journey and ship weekly.' },
  { _id: 'j5', title: 'Growth Marketing Analyst', company: company('Zepto', 'Quick commerce'), location: 'Mumbai', jobType: 'FULL_TIME', remoteType: 'ONSITE', salaryMin: 1000000, salaryMax: 1500000, experienceLevel: 'Entry', benefits: ['Free deliveries 😄'], description: 'Run experiments that move retention and referral.' },
  { _id: 'j6', title: 'Backend Engineer (Node.js)', company: company('Swiggy', 'Food tech'), location: 'Hyderabad', jobType: 'FULL_TIME', remoteType: 'HYBRID', salaryMin: 2200000, salaryMax: 3400000, experienceLevel: 'Mid', benefits: ['Meal credits', 'Insurance'], description: 'Scale the systems that power millions of orders a day.' },
  { _id: 'j7', title: 'Data Analyst', company: company('PhonePe', 'Fintech'), location: 'Pune', jobType: 'FULL_TIME', remoteType: 'ONSITE', salaryMin: 1200000, salaryMax: 1800000, experienceLevel: 'Entry', benefits: ['Learning budget'], description: 'Turn payments data into decisions.' },
  { _id: 'j8', title: 'Content Creator — Tech', company: company('Unacademy', 'Edtech'), location: 'Remote', jobType: 'CONTRACT', remoteType: 'REMOTE', salaryMin: 50000, salaryMax: 90000, experienceLevel: 'Entry', benefits: ['Flexible hours'], description: 'Make tech explainers Gen Z actually watches.' },
];

export const demoNotifications: Record<string, any>[] = [
  { id: 'n1', type: 'POST_LIKE', message: 'and 23 others reacted to your post', actor: demoPeople[0], createdAt: ago(5), read: false },
  { id: 'n2', type: 'CONNECTION_REQUEST', message: 'wants to connect with you', actor: demoPeople[3], createdAt: ago(42), read: false },
  { id: 'n3', type: 'JOB_MATCH', title: 'New job match', message: 'Frontend Engineer at Razorpay matches 92% of your profile 🔥', createdAt: ago(90), read: false },
  { id: 'n4', type: 'COMMENT', message: 'commented: "this is so real 😭"', actor: demoPeople[1], createdAt: ago(1500), read: true },
  { id: 'n5', type: 'FOLLOW', message: 'started following you', actor: demoPeople[2], createdAt: ago(1700), read: true },
  { id: 'n6', type: 'JOB_APPLICATION', title: 'Application viewed', message: 'Meesho viewed your application for APM 👀', createdAt: ago(4000), read: true },
];

export const demoComments = (postId: string): Record<string, any>[] => [
  { id: `${postId}-c1`, postId, content: 'this is so real 😭', author: author(1), authorId: demoPeople[1].id, createdAt: ago(20), likes: 12, liked: false, hasReply: false },
  { id: `${postId}-c2`, postId, content: 'saving this for later fr 🔖', author: author(4), authorId: demoPeople[4].id, createdAt: ago(55), likes: 4, liked: false, hasReply: false },
  { id: `${postId}-c3`, postId, content: 'W post. more of this please', author: author(6), authorId: demoPeople[6].id, createdAt: ago(130), likes: 2, liked: false, hasReply: false },
];

export const demoDepartments = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Data Science', 'Operations', 'Finance', 'HR'].map((name, i) => ({ id: i + 1, name }));
export const demoIndustries = ['Software', 'Fintech', 'E-commerce', 'Edtech', 'Healthtech', 'AI / ML', 'Media', 'Consulting', 'Gaming'].map((name, i) => ({ id: i + 1, name }));

export const demoParsedResume = {
  status: 'completed',
  resumeData: {
    basics: { name: '', headline: 'Aspiring Software Engineer' },
    skills: ['React Native', 'TypeScript', 'Figma', 'Python', 'SQL'],
    profileLinks: { linkedin: 'https://linkedin.com/in/demo-user', github: 'https://github.com/demo-user' },
    education: [{ school: 'IIIT Hyderabad', degree: 'B.Tech', fieldOfStudy: 'Computer Science', endYear: 2026 }],
  },
};
