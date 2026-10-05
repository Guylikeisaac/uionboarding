import { QueryClient } from '@tanstack/react-query';

/**
 * Shared query cache — the Riverpod `FutureProvider` equivalent. Repositories
 * already surface RepositoryException; screens decide how to show it.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
