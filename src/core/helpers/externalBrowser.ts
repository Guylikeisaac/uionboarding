import { Linking } from 'react-native';

/**
 * Opens [url] in the system browser, outside the app. Returns false when the
 * URL is invalid, non-http(s), or the OS refuses to open it.
 */
export async function openInExternalBrowser(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url.trim())) return false;
  try {
    await Linking.openURL(url.trim());
    return true;
  } catch {
    return false;
  }
}
