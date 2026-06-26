'use server';

import { serverFetch, handleUnauthorized } from '@/lib/server-api';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/api-error';
import { parseApiError } from '@/lib/api-error';

export async function updateAccountAction(
  prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const first_name = formData.get('first_name') as string;
  const last_name = formData.get('last_name') as string;

  try {
    const response = await serverFetch('/account', {
      method: 'PATCH',
      body: JSON.stringify({ account: { first_name, last_name } }),
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      return {
        error: await parseApiError(response),
        errorKey: 'settings.updateFailed',
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/settings');
    return { success: true, successKey: 'settings.updateSuccess' };
  } catch {
    return { errorKey: 'auth.unexpectedError' };
  }
}

export async function updatePasswordAction(
  prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const current_password = formData.get('current_password') as string;
  const password = formData.get('password') as string;
  const password_confirmation = formData.get('password_confirmation') as string;

  if (password !== password_confirmation) {
    return { errorKey: 'validation.passwordsDoNotMatch' };
  }

  try {
    const response = await serverFetch('/users', {
      method: 'PUT',
      body: JSON.stringify({
        user: { current_password, password, password_confirmation },
      }),
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      return {
        error: await parseApiError(response),
        errorKey: 'settings.updateFailed',
      };
    }

    return { success: true, successKey: 'settings.passwordUpdated' };
  } catch {
    return { errorKey: 'auth.unexpectedError' };
  }
}

export async function deleteAccountAction(): Promise<ActionState> {
  try {
    const response = await serverFetch('/account', {
      method: 'DELETE',
    });

    await handleUnauthorized(response);

    if (!response.ok) {
      return {
        error: await parseApiError(response),
        errorKey: 'settings.deleteFailed',
      };
    }

    return { success: true };
  } catch {
    return { errorKey: 'auth.unexpectedError' };
  }
}
