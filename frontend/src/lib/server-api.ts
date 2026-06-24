import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { ApiError, parseApiError } from '@/lib/api-error';

const API_BASE_URL = process.env.API_URL_INTERNAL || 'http://web:3000/api/v1';

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}

export async function handleUnauthorized(response: Response): Promise<void> {
  if (response.status === 401) {
    await clearAuthCookie();
    const locale = await getLocale();
    redirect({ href: '/login', locale });
  }
}

/**
 * Fetch wrapper for Server Components and Server Actions.
 * Automatically attaches the JWT token and Accept-Language header.
 */
export async function serverFetch(endpoint: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const locale = await getLocale();

  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', locale);
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Fetch JSON and throw ApiError on non-OK responses (except 401 which redirects).
 */
export async function serverFetchJson<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await serverFetch(endpoint, options);
  await handleUnauthorized(response);

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
