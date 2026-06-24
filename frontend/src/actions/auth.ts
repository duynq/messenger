'use server';

import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { loginSchema, registerSchema } from '@/lib/schemas/auth';
import type { ActionState } from '@/lib/api-error';

const API_BASE_URL = process.env.API_URL_INTERNAL || 'http://web:3000/api/v1';
const TOKEN_MAX_AGE = 60 * 60 * 24;

function extractAuthToken(response: Response, data: { token?: string }): string {
  if (data.token) {
    return data.token;
  }

  const authHeader = response.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return '';
}

async function persistAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function getAuthTokenAction(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value ?? null;
}

export async function loginAction(
  prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      errorKey: parsed.error.issues[0]?.message || 'validation.invalidLogin',
    };
  }

  const { email, password } = parsed.data;
  const locale = await getLocale();

  try {
    const response = await fetch(`${API_BASE_URL}/users/sign_in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': locale,
      },
      body: JSON.stringify({ user: { email, password } }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error =
        typeof data.error === 'string'
          ? data.error
          : data.status?.message || undefined;
      return { error, errorKey: 'auth.loginFailed' };
    }

    const token = extractAuthToken(response, data);

    if (!token) {
      return { errorKey: 'auth.tokenMissing' };
    }

    await persistAuthToken(token);
  } catch {
    return { errorKey: 'auth.unexpectedError' };
  }

  redirect({ href: '/dashboard', locale });
  return {};
}

export async function registerAction(
  prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    password_confirmation: formData.get('password_confirmation'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
  });

  if (!parsed.success) {
    return {
      errorKey: parsed.error.issues[0]?.message || 'validation.invalidRegistration',
    };
  }

  const { email, password, password_confirmation, first_name, last_name } = parsed.data;
  const locale = await getLocale();

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': locale,
      },
      body: JSON.stringify({
        user: { email, password, password_confirmation, first_name, last_name },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.status?.message || (data.errors ? Object.values(data.errors).flat().join(', ') : undefined),
        errorKey: 'auth.registrationFailed',
      };
    }

    const token = extractAuthToken(response, data);

    if (token) {
      await persistAuthToken(token);
    } else {
      return { errorKey: 'auth.registrationNoToken' };
    }
  } catch {
    return { errorKey: 'auth.unexpectedError' };
  }

  redirect({ href: '/dashboard', locale });
  return {};
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const locale = await getLocale();

  if (token) {
    try {
      await fetch(`${API_BASE_URL}/users/sign_out`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
    } catch {
      // Clear local session even if server logout fails
    }
  }

  cookieStore.delete('token');
  redirect({ href: '/login', locale });
}
