/** A file picked from the device (image picker / document picker). */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

/** File name from a uri / path. */
export function basename(path: string): string {
  const clean = path.split('?')[0];
  return decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1));
}

/** Lower-cased extension without the dot, or ''. */
export function extensionOf(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.substring(dot + 1).toLowerCase();
}
