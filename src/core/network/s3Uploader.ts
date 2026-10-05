import { File } from 'expo-file-system';

import { RepositoryException } from '../data/repositoryException';
import { kDemoMode } from '../demo/demoMode';
import { demoRecordUpload } from '../demo/demoServer';

/**
 * Uploads a local file to a presigned S3 URL.
 *
 * Uses a plain `fetch` rather than the shared authenticated client: a
 * presigned PUT is self-authorizing via its query signature, so attaching the
 * gateway `Authorization` header can make S3 reject the request. The
 * [contentType] MUST match the one the presign was generated with, or S3
 * returns 403.
 */
export async function putFileToS3(args: { uploadUrl: string; filePath: string; contentType: string }): Promise<void> {
  const { uploadUrl, filePath, contentType } = args;
  if (kDemoMode) {
    demoRecordUpload(uploadUrl, filePath);
    return;
  }
  let body: Blob | ArrayBuffer;
  try {
    const file = new File(filePath);
    body = await file.arrayBuffer();
  } catch (e) {
    throw new RepositoryException("Couldn't read the selected file. Please pick it again.", { cause: e });
  }
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body });
  } catch (e) {
    throw new RepositoryException("Couldn't upload the file. Please check your connection and try again.", {
      cause: e,
    });
  }
  if (!res.ok) {
    throw new RepositoryException("Couldn't upload the file. Please check your connection and try again.", {
      cause: new Error(`S3 PUT ${res.status}`),
    });
  }
}
