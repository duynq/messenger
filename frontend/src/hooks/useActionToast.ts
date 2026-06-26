'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { ActionState } from '@/lib/api-error';

export function useActionToast(
  state: ActionState | undefined,
  onSuccess?: () => void
) {
  const t = useTranslations();

  useEffect(() => {
    if (!state) return;

    if (state.error) {
      toast.error(state.error);
    } else if (state.errorKey) {
      toast.error(t(state.errorKey as Parameters<typeof t>[0]));
    }

    if (state.successKey) {
      toast.success(t(state.successKey as Parameters<typeof t>[0]));
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [state, t, onSuccess]);
}
