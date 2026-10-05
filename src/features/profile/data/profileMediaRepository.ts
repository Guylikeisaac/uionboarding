import { ApiConstants } from '@/core/constants/apiConstants';
import { RepositoryException } from '@/core/data/repositoryException';
import { serverMessage, statusOf, type ApiClient } from '@/core/network/apiClient';
import { apiClient } from '@/core/network/authenticatedClient';
import { putFileToS3 } from '@/core/network/s3Uploader';

export const kAllowedImageMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function messageFor(e: unknown, action: string): string {
  if (statusOf(e) === 401) return `Please sign in again to ${action}.`;
  return serverMessage(e) ?? `Couldn't ${action}. Check your connection and try again.`;
}

/** Profile picture + banner presigned uploads (auth-service). */
export class ProfileMediaRepository {
  constructor(private readonly client: ApiClient = apiClient) {}

  uploadProfilePicture(p: { filePath: string; fileName: string; mimeType: string }) {
    return this.uploadAndAttach({
      uploadUrlPath: ApiConstants.auth(ApiConstants.userProfilePictureUploadUrl),
      attachPath: ApiConstants.auth(ApiConstants.userProfilePicture),
      keyField: 'profilePicKey',
      action: 'update your photo',
      ...p,
    });
  }

  async deleteProfilePicture() {
    try {
      await this.client.delete(ApiConstants.auth(ApiConstants.userProfilePicture));
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'remove your photo'), { cause: e });
    }
  }

  uploadBanner(p: { filePath: string; fileName: string; mimeType: string }) {
    return this.uploadAndAttach({
      uploadUrlPath: ApiConstants.auth(ApiConstants.userBannerUploadUrl),
      attachPath: ApiConstants.auth(ApiConstants.userBanner),
      keyField: 'bannerKey',
      action: 'update your cover',
      ...p,
    });
  }

  async deleteBanner() {
    try {
      await this.client.delete(ApiConstants.auth(ApiConstants.userBanner));
    } catch (e) {
      throw new RepositoryException(messageFor(e, 'remove your cover'), { cause: e });
    }
  }

  private async uploadAndAttach(p: {
    uploadUrlPath: string;
    attachPath: string;
    keyField: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    action: string;
  }) {
    try {
      const presign = await this.client.post(p.uploadUrlPath, { data: { fileName: p.fileName, mimeType: p.mimeType } });
      const map = presign.data?.data && typeof presign.data.data === 'object' ? presign.data.data : null;
      const uploadUrl = map?.uploadUrl?.toString();
      const key = map?.[p.keyField]?.toString();
      if (!uploadUrl || !key) throw new RepositoryException("Couldn't prepare the upload. Try again.");
      await putFileToS3({ uploadUrl, filePath: p.filePath, contentType: p.mimeType });
      await this.client.put(p.attachPath, { data: { [p.keyField]: key } });
    } catch (e) {
      if (e instanceof RepositoryException) throw e;
      throw new RepositoryException(messageFor(e, p.action), { cause: e });
    }
  }
}

export const profileMediaRepository = new ProfileMediaRepository();
