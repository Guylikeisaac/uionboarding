import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { ApiConstants } from '../constants/apiConstants';
import { authManager } from '../auth/authManager';
import { ApiClient } from './apiClient';

/** Marks a request as already replayed, so a 401 on the retry can't loop. */
const RETRIED_FLAG = 'auth_retried';

/**
 * Attaches the Bearer token and keeps it alive (Flutter `_AuthInterceptor`):
 *  * **Proactively**, before the request, an expiring token is refreshed.
 *  * **Reactively**, on a 401, refresh once and replay the request.
 * Refresh goes through AuthManager's single-flight guard.
 */
function buildAuthenticatedAxios() {
  const instance = axios.create({ baseURL: ApiConstants.baseUrl, timeout: 30_000 });

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    await authManager.ensureFreshAccessToken();
    const token = authManager.currentToken;
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (err: AxiosError) => {
      const config = err.config as (InternalAxiosRequestConfig & { extra?: Record<string, unknown> }) | undefined;
      if (!config || err.response?.status !== 401 || config.extra?.[RETRIED_FLAG] === true) {
        throw err;
      }
      // A multipart body cannot be safely replayed.
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) throw err;

      if (!(await authManager.refreshAccessToken())) throw err;

      config.extra = { ...(config.extra ?? {}), [RETRIED_FLAG]: true };
      config.headers.set('Authorization', `Bearer ${authManager.currentToken}`);
      // A bare axios on purpose: replaying through this chain could loop.
      return axios.request(config);
    },
  );
  return instance;
}

/** Authenticated client — Flutter's `apiClientProvider`. */
export const apiClient = new ApiClient(buildAuthenticatedAxios());
