import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { param, resolveRoute } from './nav';

/**
 * For screens opened with `pushForResult`: `finish(value)` resolves the
 * caller and pops. Leaving without finishing resolves `undefined`.
 */
export function useRouteResult<T = unknown>() {
  const { rid } = useLocalSearchParams<{ rid?: string }>();
  const id = param(rid);
  const done = useRef(false);

  useEffect(
    () => () => {
      if (!done.current) resolveRoute(id, undefined);
    },
    [id],
  );

  const finish = useCallback(
    (value: T, pop = true) => {
      done.current = true;
      resolveRoute(id, value);
      if (pop && router.canGoBack()) router.back();
    },
    [id],
  );

  return { finish, hasCaller: !!id };
}
