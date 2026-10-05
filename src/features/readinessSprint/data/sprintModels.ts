/**
 * Models for the Job Readiness Sprint chatbot (interview-service). One parser
 * covers start / get-session / send-message. Defensive: every response enum
 * has an `unknown` fallback.
 */

const normalize = (raw: unknown) => String(raw ?? '').toUpperCase().replace(/[_\- ]/g, '');

export type SprintInputType = 'mcq' | 'rating' | 'freeText' | 'locationSelect' | 'locationMultiSelect' | 'unknown';

export function parseInputType(raw: unknown): SprintInputType {
  switch (normalize(raw)) {
    case 'MCQ':
      return 'mcq';
    case 'RATING':
      return 'rating';
    case 'FREETEXT':
      return 'freeText';
    case 'LOCATIONSELECT':
      return 'locationSelect';
    case 'LOCATIONMULTISELECT':
      return 'locationMultiSelect';
    default:
      return 'unknown';
  }
}

/** Location questions submit `locationIds`; everything else `message`. */
export const submitsLocationIds = (t: SprintInputType) => t === 'locationSelect' || t === 'locationMultiSelect';

export type SprintQuestionType =
  | 'experienceLevel'
  | 'locationCurrent'
  | 'locationPreferred'
  | 'skillIdentification'
  | 'skillRating'
  | 'communication'
  | 'scenario'
  | 'achievement'
  | 'workEnvironment'
  | 'careerIntent'
  | 'salaryExpectation'
  | 'missingSkills'
  | 'unknown';

const questionTypeMap: Record<string, SprintQuestionType> = {
  EXPERIENCELEVEL: 'experienceLevel',
  LOCATIONCURRENT: 'locationCurrent',
  LOCATIONPREFERRED: 'locationPreferred',
  SKILLIDENTIFICATION: 'skillIdentification',
  SKILLRATING: 'skillRating',
  COMMUNICATION: 'communication',
  SCENARIO: 'scenario',
  ACHIEVEMENT: 'achievement',
  WORKENVIRONMENT: 'workEnvironment',
  CAREERINTENT: 'careerIntent',
  SALARYEXPECTATION: 'salaryExpectation',
  MISSINGSKILLS: 'missingSkills',
};

export const parseQuestionType = (raw: unknown): SprintQuestionType => questionTypeMap[normalize(raw)] ?? 'unknown';

export type SprintSessionStatus = 'preparing' | 'inProgress' | 'awaitingIntroMedia' | 'completed' | 'unknown';

export function parseSessionStatus(raw: unknown): SprintSessionStatus {
  switch (normalize(raw)) {
    case 'PREPARING':
      return 'preparing';
    case 'INPROGRESS':
    case 'ACTIVE':
      return 'inProgress';
    case 'AWAITINGINTROMEDIA':
      return 'awaitingIntroMedia';
    case 'COMPLETED':
      return 'completed';
    default:
      return 'unknown';
  }
}

/** Request-side choice; unrecognized echoes bias to audio. */
export type SprintIntroMediaType = 'audio' | 'video';
export const parseIntroMediaType = (raw: unknown): SprintIntroMediaType => (normalize(raw) === 'VIDEO' ? 'video' : 'audio');

function stringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((e) => (e == null ? '' : String(e))).filter(Boolean) : [];
}

function intOr(raw: unknown, fallback: number): number {
  if (typeof raw === 'number') return Math.trunc(raw);
  const n = parseInt(String(raw), 10);
  return Number.isNaN(n) ? fallback : n;
}

export interface SprintQuestion {
  questionText: string;
  questionType: SprintQuestionType;
  inputType: SprintInputType;
  options: string[];
  targetSkill: string;
  maxLocationSelections: number;
  turnIndex: number;
  totalQuestions: number;
}

export function sprintQuestionFromJson(json: Record<string, any>): SprintQuestion {
  return {
    questionText: String(json.questionText ?? ''),
    questionType: parseQuestionType(json.questionType),
    inputType: parseInputType(json.inputType),
    options: stringList(json.options),
    targetSkill: String(json.targetSkill ?? ''),
    maxLocationSelections: intOr(json.maxLocationSelections, 3),
    turnIndex: intOr(json.turnIndex, 0),
    totalQuestions: intOr(json.totalQuestions, 0),
  };
}

export interface SprintSessionSnapshot {
  sessionId: string;
  status: SprintSessionStatus;
  currentTurnIndex: number;
  totalQuestions: number;
  question?: SprintQuestion;
  message: string;
  assistantMessage: string;
  accepted?: boolean;
  isFinalAnswer?: boolean;
  awaitingIntroMedia: boolean;
  introMediaUrl: string;
}

export function sprintSnapshotFromJson(json: Record<string, any>): SprintSessionSnapshot {
  const q = json.question;
  return {
    sessionId: String(json.sessionId ?? ''),
    status: parseSessionStatus(json.status),
    currentTurnIndex: intOr(json.currentTurnIndex, 0),
    totalQuestions: intOr(json.totalQuestions, 0),
    question: q && typeof q === 'object' ? sprintQuestionFromJson(q) : undefined,
    message: String(json.message ?? ''),
    assistantMessage: String(json.assistantMessage ?? ''),
    accepted: typeof json.accepted === 'boolean' ? json.accepted : undefined,
    isFinalAnswer: typeof json.isFinalAnswer === 'boolean' ? json.isFinalAnswer : undefined,
    awaitingIntroMedia: json.awaitingIntroMedia === true,
    introMediaUrl: String(json.introMediaUrl ?? ''),
  };
}

/** The question loop is over and the optional intro-media step is next. */
export const snapshotIsAwaitingIntroMedia = (s: SprintSessionSnapshot) =>
  s.awaitingIntroMedia || s.status === 'awaitingIntroMedia' || s.isFinalAnswer === true;
export const snapshotIsCompleted = (s: SprintSessionSnapshot) => s.status === 'completed';

export interface IntroMediaTicket {
  uploadUrl: string;
  s3Key: string;
  mediaType: SprintIntroMediaType;
}

export function introMediaTicketFromJson(json: Record<string, any>): IntroMediaTicket {
  return {
    uploadUrl: String(json.uploadUrl ?? ''),
    s3Key: String(json.s3Key ?? ''),
    mediaType: parseIntroMediaType(json.introMediaType),
  };
}

/** One row of `GET /job-service/locations`. */
export interface JobLocation {
  id: string;
  city: string;
  state: string;
  country: string;
  label: string;
}

export function jobLocationFromJson(json: Record<string, any>): JobLocation {
  const city = String(json.city ?? '');
  const state = String(json.state ?? '');
  const label = String(json.label ?? '');
  return {
    id: String(json.id ?? ''),
    city,
    state,
    country: String(json.country ?? ''),
    label: label || [city, state].filter(Boolean).join(', '),
  };
}

export type SprintEntryRole = 'assistant' | 'user';

/** One client-assembled chat bubble. */
export interface SprintEntry {
  role: SprintEntryRole;
  text: string;
  timestamp: Date;
}

export const assistantEntry = (text: string): SprintEntry => ({ role: 'assistant', text, timestamp: new Date() });
export const userEntry = (text: string): SprintEntry => ({ role: 'user', text, timestamp: new Date() });
