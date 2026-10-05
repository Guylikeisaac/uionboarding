import { useQuery } from '@tanstack/react-query';

import { authManager } from '@/core/auth/authManager';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { queryClient } from '@/core/query/queryClient';
import { prefs } from '@/core/storage/storage';

/**
 * Aadhaar identity verification (UIDAI OTP e-KYC).
 *
 * NOTE: the KYC endpoints below are placeholders — the backend doesn't expose
 * them yet. Demo mode answers them locally. Swap in the real paths when the
 * KYC service ships. The full Aadhaar number is only ever sent to the server;
 * the app keeps nothing but the last 4 digits.
 */
const KYC_OTP_PATH = '/api/auth-service/kyc/aadhaar/otp';
const KYC_VERIFY_PATH = '/api/auth-service/kyc/aadhaar/verify';

// ── Validation (Verhoeff checksum, as used by UIDAI) ────────────────────────

const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function verhoeffValid(num: string): boolean {
  let c = 0;
  const digits = num.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) c = d[c][p[i % 8][digits[i]]];
  return c === 0;
}

function verhoeffCheckDigit(num: string): number {
  let c = 0;
  const digits = num.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) c = d[c][p[(i + 1) % 8][digits[i]]];
  return inv[c];
}

export const onlyDigits = (s: string) => s.replace(/\D/g, '').slice(0, 12);

/** "1234 5678 9012" grouping for display while typing. */
export const formatAadhaar = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

export const maskAadhaar = (last4: string) => `XXXX XXXX ${last4}`;

/** null when valid, else a user-facing reason. */
export function aadhaarError(digits: string): string | null {
  if (digits.length < 12) return null; // still typing
  if (/^[01]/.test(digits)) return 'Aadhaar numbers don’t start with 0 or 1.';
  if (!verhoeffValid(digits)) return 'That doesn’t look like a valid Aadhaar number.';
  return null;
}

export const aadhaarValid = (digits: string) => digits.length === 12 && aadhaarError(digits) == null;

/** A checksum-valid sample number for demos (not a real person's Aadhaar). */
export function demoAadhaarNumber(): string {
  const base = '23456789012'.split('');
  const body = base.join('');
  return body + String(verhoeffCheckDigit(body));
}

// ── API ─────────────────────────────────────────────────────────────────────

export async function requestAadhaarOtp(aadhaar: string): Promise<{ referenceId: string; resendAfterSeconds: number }> {
  try {
    const res = await apiClient.post(KYC_OTP_PATH, { data: { aadhaarNumber: aadhaar, consent: true } });
    const data = res.data?.data ?? {};
    return {
      referenceId: String(data.referenceId ?? data.refId ?? ''),
      resendAfterSeconds: typeof data.resendAfterSeconds === 'number' ? data.resendAfterSeconds : 30,
    };
  } catch (e) {
    throw new RepositoryException(serverMessage(e) ?? 'Couldn’t send the OTP. Please try again.', { cause: e });
  }
}

export async function verifyAadhaarOtp(referenceId: string, otp: string): Promise<void> {
  try {
    const res = await apiClient.post(KYC_VERIFY_PATH, { data: { referenceId, otp } });
    if (res.data?.data?.verified !== true) throw new RepositoryException('Verification failed. Please try again.');
  } catch (e) {
    if (e instanceof RepositoryException) throw e;
    throw new RepositoryException(serverMessage(e) ?? 'That OTP didn’t work. Check it and try again.', { cause: e });
  }
}

// ── Local status (last 4 digits only) ───────────────────────────────────────

export interface AadhaarStatus {
  verified: boolean;
  last4?: string;
  verifiedAt?: string;
}

const statusKey = (userId: string) => `aadhaar_status_${userId}`;
const queryKey = ['aadhaarStatus'] as const;

export async function markAadhaarVerified(last4: string) {
  const id = authManager.currentUser?.id;
  if (!id) return;
  const status: AadhaarStatus = { verified: true, last4, verifiedAt: new Date().toISOString() };
  await prefs.setString(statusKey(id), JSON.stringify(status));
  queryClient.setQueryData(queryKey, status);
}

export function useAadhaarStatus() {
  return useQuery<AadhaarStatus>({
    queryKey,
    queryFn: async () => {
      const id = authManager.currentUser?.id;
      if (!id) return { verified: false };
      const raw = await prefs.getString(statusKey(id));
      if (!raw) return { verified: false };
      try {
        return JSON.parse(raw) as AadhaarStatus;
      } catch {
        return { verified: false };
      }
    },
  });
}
