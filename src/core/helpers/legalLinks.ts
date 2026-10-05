import { router } from 'expo-router';

import { ApiConstants } from '../constants/apiConstants';

/**
 * The public legal documents. Production URLs, deliberately NOT derived from
 * the environment-switched web origin.
 */
export const LegalDoc = {
  privacy: { url: ApiConstants.privacyPolicyUrl, label: 'Privacy Policy' },
  terms: { url: ApiConstants.termsUrl, label: 'Terms & Conditions' },
} as const;

export type LegalDocKey = keyof typeof LegalDoc;

/** Opens [doc] *inside* the app via the in-app browser screen. */
export function openLegalPage(doc: LegalDocKey) {
  openInAppBrowser(LegalDoc[doc].url, LegalDoc[doc].label);
}

/** Pushes the generic in-app web view. */
export function openInAppBrowser(url: string, title?: string) {
  router.push({ pathname: '/browser', params: { url, ...(title ? { title } : {}) } });
}
