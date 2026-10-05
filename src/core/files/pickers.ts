import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { basename, extensionOf, type PickedFile } from './pickedFile';

export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Picks one document. Resolves undefined when cancelled. */
export async function pickDocument(mimeTypes: string[] = RESUME_MIME_TYPES): Promise<PickedFile | undefined> {
  const res = await DocumentPicker.getDocumentAsync({ type: mimeTypes, copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return undefined;
  const a = res.assets[0];
  return { uri: a.uri, name: a.name ?? basename(a.uri), mimeType: a.mimeType ?? undefined, size: a.size ?? undefined };
}

/** Picks up to [limit] images from the gallery. */
export async function pickImages(limit: number, quality = 0.9): Promise<PickedFile[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality,
  });
  if (res.canceled || !res.assets?.length) return [];
  return res.assets.slice(0, limit).map((a) => ({
    uri: a.uri,
    name: a.fileName ?? basename(a.uri),
    mimeType: a.mimeType ?? undefined,
    size: a.fileSize ?? undefined,
  }));
}

/** Picks one image or video. */
export async function pickMedia(kind: 'images' | 'videos' | 'both', opts: { quality?: number; videoMaxDuration?: number } = {}) {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'both' ? ['images', 'videos'] : [kind],
    quality: opts.quality ?? 0.9,
    videoMaxDuration: opts.videoMaxDuration,
  });
  if (res.canceled || !res.assets?.length) return undefined;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? basename(a.uri),
    mimeType: a.mimeType ?? undefined,
    size: a.fileSize ?? undefined,
    type: a.type,
    duration: a.duration ?? undefined,
    width: a.width,
    height: a.height,
  };
}

/** Captures with the camera. */
export async function captureMedia(kind: 'images' | 'videos', opts: { quality?: number; videoMaxDuration?: number } = {}) {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return undefined;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: [kind],
    quality: opts.quality ?? 0.9,
    videoMaxDuration: opts.videoMaxDuration,
  });
  if (res.canceled || !res.assets?.length) return undefined;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? basename(a.uri),
    mimeType: a.mimeType ?? undefined,
    size: a.fileSize ?? undefined,
    type: a.type,
    duration: a.duration ?? undefined,
  };
}

/** Byte size of a local file when the picker didn't report it. */
export async function fileSize(f: PickedFile): Promise<number> {
  if (f.size != null) return f.size;
  try {
    const { File } = await import('expo-file-system');
    return new File(f.uri).size ?? 0;
  } catch {
    return 0;
  }
}

export { extensionOf };
