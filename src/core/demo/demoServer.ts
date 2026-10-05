import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { secureStorage } from '../storage/storage';
import {
  demoComments,
  demoDepartments,
  demoIndustries,
  demoJobs,
  demoNotifications,
  demoParsedResume,
  demoPeople,
  demoPosts,
} from './demoData';

/**
 * In-process fake backend for demo mode. Answers with the same envelopes the
 * real services use (`{ success, message, data }`), so every repository and
 * parser runs unchanged.
 */

interface DemoUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  profilePic: string;
  userTitle: string;
  role: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  profileCompletionStatus: string;
  registrationCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const state = {
  user: null as DemoUser | null,
  posts: [...demoPosts],
  saved: new Set<string>(),
  sent: new Set<string>(),
  accepted: [] as string[],
  uploads: new Map<string, string>(),
  comments: new Map<string, Record<string, any>[]>(),
  resumeUploaded: false,
  applied: [] as { jobId: string; at: string; status: string }[],
  savedJobs: new Set<string>(),
  seq: 1,
};

// ── JWT (unsigned — demo only) ──────────────────────────────────────────────

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return globalThis.btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeClaims(token: string): Record<string, any> | null {
  try {
    const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = globalThis.atob(p.padEnd(Math.ceil(p.length / 4) * 4, '='));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

function mintToken(u: DemoUser): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  return `${b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${b64url(JSON.stringify({ user: u, exp }))}.demo`;
}

function session(u: DemoUser) {
  return { token: mintToken(u), accessToken: mintToken(u), refreshToken: `demo-refresh-${u.id}`, user: u };
}

function newUser(phone: string): DemoUser {
  const now = new Date().toISOString();
  return {
    id: `demo-${phone || 'user'}`,
    userId: `user${phone.slice(-4) || '0000'}`,
    name: '',
    email: '',
    phone,
    profilePic: '',
    userTitle: '',
    role: 'USER',
    phoneVerified: true,
    emailVerified: false,
    profileCompletionStatus: 'not_started',
    registrationCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Recovers the session user from the bearer token after an app restart. */
function currentUser(config: InternalAxiosRequestConfig): DemoUser | null {
  if (state.user) return state.user;
  const auth = String(config.headers?.Authorization ?? config.headers?.authorization ?? '');
  const token = auth.replace(/^Bearer\s+/i, '');
  const u = token ? decodeClaims(token)?.user : null;
  if (u && typeof u === 'object') state.user = u as DemoUser;
  return state.user;
}

/** Keeps the stored token's claims in step so a cold start lands correctly. */
async function persistToken() {
  if (!state.user) return;
  await secureStorage.write('jwt_token', mintToken(state.user));
}

// ── helpers ─────────────────────────────────────────────────────────────────

function body(config: InternalAxiosRequestConfig): Record<string, any> {
  const d = config.data;
  if (typeof d === 'string') {
    try {
      return JSON.parse(d);
    } catch {
      return {};
    }
  }
  return d && typeof d === 'object' && !(d instanceof FormData) ? (d as Record<string, any>) : {};
}

const ok = (data: unknown = {}, message = 'OK') => ({ status: 200, data: { success: true, message, data } });
const fail = (status: number, message: string) => ({ status, data: { success: false, message } });

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function postsPage(params: Record<string, any>) {
  const page = Number(params?.page ?? 1);
  const limit = Number(params?.limit ?? 10);
  const start = (page - 1) * limit;
  const slice = state.posts.slice(start, start + limit);
  return {
    posts: slice,
    pagination: { page, totalPages: Math.max(1, Math.ceil(state.posts.length / limit)), total: state.posts.length, hasNextPage: start + limit < state.posts.length },
  };
}

function myAuthor() {
  const u = state.user;
  return { id: u?.id ?? 'me', userId: u?.userId ?? 'me', name: u?.name || 'You', profilePic: u?.profilePic ?? '', userTitle: u?.userTitle ?? '' };
}

// ── router ──────────────────────────────────────────────────────────────────

type Handler = (c: InternalAxiosRequestConfig, path: string) => Promise<{ status: number; data: any }> | { status: number; data: any };

const routes: [string, RegExp, Handler][] = [
  // Auth / signup
  ['post', /\/auth\/send-phone-otp$/, () => ok({ expiresInSeconds: 600, resendAfterSeconds: 30, channel: 'whatsapp' }, 'OTP sent')],
  [
    'post',
    /\/auth\/phone-signup\/verify-otp$/,
    (c) => {
      const b = body(c);
      if (b.otp != null && !/^\d{6}$/.test(String(b.otp))) return fail(400, 'Enter the 6-digit code.');
      state.user = newUser(String(b.phone ?? ''));
      return ok({ ...session(state.user), isLogin: false, phoneSignupToken: 'demo-phone-signup', needsEmailCompletion: true, expiresInSeconds: 1800 });
    },
  ],
  [
    'post',
    /\/auth\/phone-signup\/refresh-intent$/,
    (c) => {
      const u = currentUser(c);
      if (!u || u.registrationCompleted) return fail(400, 'No pending signup');
      return ok({ phoneSignupToken: 'demo-phone-signup', phone: u.phone, needsEmailCompletion: !u.email, expiresInSeconds: 1800 });
    },
  ],
  ['post', /\/auth\/check-email$/, () => ok({ available: true, exists: false })],
  ['post', /\/auth\/send-email-otp$/, () => ok({ expiresInSeconds: 600, resendAfterSeconds: 30 }, 'OTP sent')],
  [
    'post',
    /\/auth\/verify-email-otp$/,
    (c) => {
      const b = body(c);
      if (!/^\d{6}$/.test(String(b.otp ?? ''))) return fail(400, 'Enter the 6-digit code.');
      if (state.user) state.user = { ...state.user, email: String(b.email ?? ''), emailVerified: true };
      return ok({ user: state.user });
    },
  ],
  [
    'post',
    /\/auth\/phone-signup\/complete-email$/,
    async (c) => {
      const b = body(c);
      const u = currentUser(c) ?? newUser('');
      state.user = {
        ...u,
        name: `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim(),
        email: String(b.email ?? u.email),
        emailVerified: true,
        registrationCompleted: true,
      };
      return ok(session(state.user));
    },
  ],
  ['post', /\/auth\/refresh$/, (c) => (currentUser(c) ? ok(session(state.user!)) : fail(401, 'Session expired'))],
  ['get', /\/auth\/session$/, (c) => (currentUser(c) ? ok({ user: state.user }) : fail(401, 'Unauthorized'))],
  [
    'patch',
    /\/user\/profile-completion-status$/,
    async (c) => {
      const u = currentUser(c);
      if (u) {
        state.user = { ...u, profileCompletionStatus: String(c.params?.status ?? 'completed') };
        await persistToken();
      }
      return ok({});
    },
  ],
  [
    'put',
    /\/auth-service\/user\/?$/,
    async (c) => {
      const u = currentUser(c);
      if (u) {
        state.user = { ...u, ...body(c) };
        await persistToken();
      }
      return ok({ user: state.user });
    },
  ],
  [
    'put',
    /\/user\/profile-picture$/,
    async (c) => {
      const key = String(body(c).profilePicKey ?? '');
      const u = currentUser(c);
      if (u) {
        state.user = { ...u, profilePic: state.uploads.get(key) ?? u.profilePic };
        await persistToken();
      }
      return ok({ user: state.user });
    },
  ],
  ['get', /\/user\/[^/]+\/bookmarks$/, () => ok({ bookMarkedPosts: [...state.saved] })],
  [
    'post',
    /\/user\/bookmark\/toggle$/,
    (c) => {
      const id = String(body(c).postId ?? '');
      if (state.saved.has(id)) state.saved.delete(id);
      else state.saved.add(id);
      return ok({ bookmarked: state.saved.has(id) });
    },
  ],

  // Aadhaar e-KYC (placeholder paths — see features/onboarding/aadhaar)
  [
    'post',
    /\/kyc\/aadhaar\/otp$/,
    async () => {
      await delay(700);
      return ok({ referenceId: `demo-kyc-${state.seq++}`, resendAfterSeconds: 30 }, 'OTP sent to Aadhaar-linked mobile');
    },
  ],
  [
    'post',
    /\/kyc\/aadhaar\/verify$/,
    async (c) => {
      await delay(900);
      if (!/^\d{6}$/.test(String(body(c).otp ?? ''))) return fail(400, 'Enter the 6-digit OTP.');
      return ok({ verified: true });
    },
  ],

  // Uploads (presign → PUT is short-circuited in s3Uploader)
  [
    'post',
    /(upload-url|signed-upload-url|media-upload-url)$/,
    () => {
      const key = `demo-key-${state.seq++}`;
      return ok({ uploadUrl: `demo://upload/${key}`, url: `demo://upload/${key}`, key, fileKey: key, profilePicKey: key, awsId: key });
    },
  ],

  // Resume
  [
    'post',
    /\/resume\/upload$/,
    async () => {
      await delay(900);
      state.resumeUploaded = true;
      return ok({ resumeDetailsId: 'demo-resume' });
    },
  ],
  ['get', /\/get-parsed-resume-data$/, () => (state.resumeUploaded ? ok(demoParsedResume) : fail(404, 'No resume'))],
  [
    'get',
    /\/resume\/user\/[^/]+\/latest$/,
    () => (state.resumeUploaded ? ok({ id: 'demo-resume', resumeKey: 'demo-resume.pdf', fileName: 'resume.pdf', createdAt: new Date().toISOString() }) : ok(null)),
  ],
  ['get', /\/resume-service\/departments$/, () => ok(demoDepartments)],
  ['get', /\/resume-service\/industries$/, () => ok(demoIndustries)],
  [
    'get',
    /\/resume\/suggestions\/similar$/,
    () => ok(demoPeople.slice(4).map((p, i) => ({ id: p.id, userId: p.userId, name: p.name, userTitle: p.userTitle, profilePic: p.profilePic, mutualSkillsCount: 4 - i }))),
  ],

  // Feed
  ['get', /\/post\/get-all$/, (c) => ok(postsPage(c.params ?? {}))],
  ['get', /\/post\/get-all\/[^/]+$/, () => ok({ posts: state.posts.filter((p) => p.author.id === state.user?.id), pagination: { page: 1, totalPages: 1, hasNextPage: false } })],
  [
    'post',
    /\/post\/create$/,
    (c) => {
      const b = body(c);
      const id = `mine-${state.seq++}`;
      const media = Array.isArray(b.media)
        ? b.media.map((m: any, i: number) => ({ id: `${id}-m${i}`, type: 'IMAGE', url: state.uploads.get(String(m.awsId ?? m.key ?? '')) ?? String(m.url ?? '') }))
        : [];
      state.posts.unshift({ id, author: myAuthor(), content: String(b.content ?? ''), media, interactionCounts: {}, commentCount: 0, createdAt: new Date().toISOString() });
      return ok({ id });
    },
  ],
  ['post', /\/post\/bulk$/, (c) => ok(state.posts.filter((p) => (body(c).postIds ?? []).includes(p.id)))],
  [
    'get',
    /\/comment\/on\/[^/]+$/,
    (_c, path) => {
      const postId = path.split('/').pop()!;
      if (!state.comments.has(postId)) state.comments.set(postId, demoComments(postId));
      return ok({ comments: state.comments.get(postId), hasMore: false, page: 1 });
    },
  ],
  [
    'post',
    /\/comment\/on\/[^/]+$/,
    (c, path) => {
      const postId = path.split('/').pop()!;
      const list = state.comments.get(postId) ?? demoComments(postId);
      const content = String(body(c).data?.content ?? body(c).content ?? '');
      list.unshift({ id: `c-${state.seq++}`, postId, content, author: myAuthor(), authorId: state.user?.id, createdAt: new Date().toISOString(), likes: 0, liked: false });
      state.comments.set(postId, list);
      return ok({});
    },
  ],
  ['post', /\/toggle\/like$/, () => ok({ liked: true, likes: 1 })],
  ['get', /\/comment\/replies\/on\/[^/]+$/, () => ok({ comments: [], hasMore: false, page: 1 })],

  // Jobs
  [
    'post',
    /\/job\/search$/,
    (c) => {
      const q = String(body(c).q ?? body(c).query ?? '').toLowerCase();
      const jobs = demoJobs
        .filter((j) => !q || `${j.title} ${j.company.name}`.toLowerCase().includes(q))
        .map((j) => ({ ...j, isSaved: state.savedJobs.has(j._id), hasApplied: state.applied.some((a) => a.jobId === j._id) }));
      return ok({ jobs, pagination: { page: 1, totalPages: 1, total: jobs.length } });
    },
  ],

  [
    'post',
    /\/application\/apply\/[^/]+$/,
    async (_c, path) => {
      const jobId = path.split('/').pop()!;
      await delay(500);
      if (state.applied.some((a) => a.jobId === jobId)) return fail(400, 'You have already applied to this job.');
      state.applied.unshift({ jobId, at: new Date().toISOString(), status: 'APPLIED' });
      return ok({ applicationId: `app-${jobId}`, firstJobApply: state.applied.length === 1 });
    },
  ],
  [
    'get',
    /\/application\/applied\/all$/,
    () =>
      ok({
        applications: state.applied.map((a, i) => ({
          id: `app-${a.jobId}`,
          status: i === state.applied.length - 1 && state.applied.length > 1 ? 'UNDER_REVIEW' : a.status,
          appliedAt: a.at,
          job: { ...(demoJobs.find((j) => j._id === a.jobId) ?? { _id: a.jobId, title: 'Job' }), hasApplied: true },
        })),
        hasMore: false,
      }),
  ],
  [
    'post',
    /\/job\/save\/toggle$/,
    (c) => {
      const id = String(body(c).jobId ?? '');
      if (state.savedJobs.has(id)) state.savedJobs.delete(id);
      else state.savedJobs.add(id);
      return ok({ isSaved: state.savedJobs.has(id), jobId: id });
    },
  ],

  // Network
  [
    'get',
    /\/connection\/suggestions\/mutuals$/,
    () =>
      ok(
        demoPeople
          .slice(0, 6)
          .filter((p) => !state.accepted.includes(p.id))
          .map((p) => ({ uniqueId: p.id, userId: p.userId, name: p.name, userTitle: p.userTitle, profilePic: p.profilePic, mutualConnections: p.mutual })),
      ),
  ],
  [
    'post',
    /\/connection\/status\/bulk$/,
    () => ok(Object.fromEntries([...state.sent].map((id) => [id, { status: 'PENDING', isSender: true, connectionId: `conn-${id}` }]))),
  ],
  [
    'post',
    /\/connection\/send$/,
    (c) => {
      const id = String(body(c).receiverId ?? '');
      state.sent.add(id);
      return ok({ connectionId: `conn-${id}` });
    },
  ],
  [
    'post',
    /\/connection\/withdraw$/,
    (c) => {
      state.sent.delete(String(body(c).receiverId ?? ''));
      return ok({});
    },
  ],
  ['get', /\/connection\/pending\/sent\/count$/, () => ok({ count: state.sent.size })],
  [
    'get',
    /\/connection\/pending$/,
    () => ok({ pendingConnections: [{ id: 'conn-in-1', sentByUser: { userId: demoPeople[7].userId, name: demoPeople[7].name, userTitle: demoPeople[7].userTitle, profilePic: demoPeople[7].profilePic } }] }),
  ],
  [
    'get',
    /\/connection\/accepted$/,
    () => ok({ acceptedConnections: demoPeople.slice(5, 7).map((p) => ({ id: `acc-${p.id}`, user: { uniqueId: p.id, userId: p.userId, name: p.name, userTitle: p.userTitle, profilePic: p.profilePic } })) }),
  ],
  ['get', /\/follow\/follower-count$/, () => ok({ followerCount: 128 })],

  // Notifications
  ['get', /\/api\/notifications$/, () => ok(demoNotifications)],
];

/** Axios adapter that serves every request from the demo backend. */
export const demoAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const url = String(config.url ?? '');
  const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  await delay(250 + Math.random() * 250);

  const match = routes.find(([m, re]) => m === method && re.test(path));
  // Anything not modelled succeeds with an empty payload — the apps' parsers
  // treat that as "nothing here yet".
  const result = match ? await match[2](config, path) : ok(method === 'get' ? {} : { id: `demo-${state.seq++}` });

  const response: AxiosResponse = {
    data: result.data,
    status: result.status,
    statusText: result.status < 400 ? 'OK' : 'Error',
    headers: {},
    config,
    request: {},
  };
  if (result.status >= 400) {
    throw new AxiosError(result.data?.message ?? 'Request failed', String(result.status), config, {}, response);
  }
  return response;
};

/** Remembers a "uploaded" local file so later reads can show it. */
export function demoRecordUpload(uploadUrl: string, filePath: string) {
  const key = uploadUrl.split('/').pop() ?? '';
  if (key) state.uploads.set(key, filePath);
}
