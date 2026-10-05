import { router, type Href } from 'expo-router';

/**
 * go_router `go()`: replace the whole stack with [path]. Used where the Flutter
 * app called `context.go` (auth hand-offs, logout).
 */
export function go(path: string) {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {
    // no stack to dismiss
  }
  router.replace(path as Href);
}

/** go_router `push()`. */
export function push(path: string, params?: Record<string, string | undefined>) {
  if (params) {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) if (v != null) clean[k] = v;
    router.push({ pathname: path, params: clean } as Href);
  } else {
    router.push(path as Href);
  }
}

/** go_router `pop()` with a fallback when nothing is behind. */
export function pop(fallback?: string) {
  if (router.canGoBack()) router.back();
  else if (fallback) router.replace(fallback as Href);
}

export function canPop() {
  return router.canGoBack();
}

// ── Route "extras" ────────────────────────────────────────────────────────────
// go_router passed objects via `extra`; expo-router params are strings. Objects
// are parked here under a one-shot key carried as the `x` param.

const extras = new Map<string, unknown>();
let extraSeq = 0;

export function putExtra(value: unknown): string {
  const key = `x${++extraSeq}`;
  extras.set(key, value);
  return key;
}

export function readExtra<T>(key: string | string[] | undefined): T | undefined {
  const k = Array.isArray(key) ? key[0] : key;
  if (!k) return undefined;
  return extras.get(k) as T | undefined;
}

/** Push [path] carrying [extra] (Flutter `context.push(path, extra: x)`). */
export function pushWithExtra(path: string, extra: unknown, params?: Record<string, string | undefined>) {
  push(path, { ...(params ?? {}), x: putExtra(extra) });
}

/** Single string from a search-param value. */
export function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// ── Route results ─────────────────────────────────────────────────────────────
// Flutter's `await context.push<T>(...)`: the pushed screen calls `finish(v)`
// (via `useRouteResult`), and unmounting without a result resolves undefined.

const resolvers = new Map<string, (v: unknown) => void>();
let ridSeq = 0;

/** Push [path] and resolve when the pushed screen finishes or is popped. */
export function pushForResult<T = unknown>(path: string, params?: Record<string, string | undefined>): Promise<T | undefined> {
  const rid = `r${++ridSeq}`;
  return new Promise<T | undefined>((resolve) => {
    resolvers.set(rid, resolve as (v: unknown) => void);
    push(path, { ...(params ?? {}), rid });
  });
}

/** Push with an object extra and await the result. */
export function pushWithExtraForResult<T = unknown>(
  path: string,
  extra: unknown,
  params?: Record<string, string | undefined>,
): Promise<T | undefined> {
  return pushForResult<T>(path, { ...(params ?? {}), x: putExtra(extra) });
}

export function resolveRoute(rid: string | undefined, value: unknown) {
  if (!rid) return;
  const r = resolvers.get(rid);
  if (!r) return;
  resolvers.delete(rid);
  r(value);
}
