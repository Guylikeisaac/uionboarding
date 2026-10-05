import { File, Paths } from 'expo-file-system';

import { ApiConstants } from '@/core/constants/apiConstants';
import { basename } from '@/core/files/pickedFile';
import { apiClient } from '@/core/network/authenticatedClient';
import { putFileToS3 } from '@/core/network/s3Uploader';

/** Only the four types the presign endpoint accepts. */
const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function profilePicMimeTypeFor(path: string): string | null {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  if (dot < 0) return null;
  return mimeByExtension[name.substring(dot + 1).toLowerCase()] ?? null;
}

/**
 * Three-step avatar upload:
 *   1. `POST /user/profile-picture/upload-url {fileName, mimeType}`
 *   2. PUT the bytes to `uploadUrl` (presigned, self-authorizing)
 *   3. `PUT /user/profile-picture {profilePicKey}` to attach it
 */
export const profilePictureUploader = {
  /** `DELETE /user/profile-picture` — detaches the avatar from the account. */
  async remove(): Promise<void> {
    await apiClient.delete(ApiConstants.auth(ApiConstants.userProfilePicture));
  },

  /** Uploads [uri] and attaches it. Returns the `profilePicKey`. Throws on failure. */
  async upload(uri: string, fileName?: string, mimeTypeHint?: string): Promise<string> {
    const name = fileName ?? basename(uri);
    const mimeType = profilePicMimeTypeFor(name) ?? profilePicMimeTypeFor(uri) ?? normalizeMime(mimeTypeHint);
    if (!mimeType) throw new Error(`Unsupported image type: ${name}`);

    const presign = await apiClient.post(ApiConstants.auth(ApiConstants.userProfilePictureUploadUrl), {
      data: { fileName: name, mimeType },
    });
    const data = presign.data?.data;
    const uploadUrl = data?.uploadUrl?.toString();
    const key = data?.profilePicKey?.toString();
    if (!uploadUrl || !key) throw new Error('Presign response missing uploadUrl/profilePicKey');

    await putFileToS3({ uploadUrl, filePath: uri, contentType: mimeType });
    await apiClient.put(ApiConstants.auth(ApiConstants.userProfilePicture), { data: { profilePicKey: key } });
    return key;
  },

  /**
   * Persists a **remote** avatar (the Google case). There is no "attach this
   * URL" endpoint, so the bytes are fetched and pushed through the same path.
   */
  async uploadFromUrl(url: string): Promise<string> {
    const dest = new File(Paths.cache, `google_avatar_${Date.now()}.jpg`);
    const downloaded = await File.downloadFileAsync(url, dest);
    try {
      return await profilePictureUploader.upload(downloaded.uri, dest.name, 'image/jpeg');
    } finally {
      try {
        downloaded.delete();
      } catch {
        // best effort
      }
    }
  },
};

function normalizeMime(m?: string): string | null {
  if (!m) return null;
  const v = m.toLowerCase();
  return Object.values(mimeByExtension).includes(v) ? v : null;
}
