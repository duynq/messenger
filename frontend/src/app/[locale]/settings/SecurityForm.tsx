'use client';

import { useActionState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { updatePasswordAction } from '@/actions/account';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useActionToast } from '@/hooks/useActionToast';

const initialState = {};

export function SecurityForm() {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useActionToast(state, () => formRef.current?.reset());

  return (
    <form ref={formRef} action={formAction} className="space-y-4 mt-8 pt-8 border-t border-white/10">
      <h4 className="text-lg font-semibold">{t('settings.security')}</h4>

      <div className="space-y-4">
        <div>
          <label htmlFor="current_password" className="block text-sm text-white/50 mb-1.5">
            {t('settings.currentPassword')}
          </label>
          <input
            id="current_password"
            name="current_password"
            type="password"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-white"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm text-white/50 mb-1.5">
              {t('settings.newPassword')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-white"
            />
          </div>
          <div>
            <label htmlFor="password_confirmation" className="block text-sm text-white/50 mb-1.5">
              {t('settings.confirmNewPassword')}
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-white"
            />
          </div>
        </div>
      </div>

      <AnimatedButton type="submit" isLoading={isPending}>
        {t('settings.updatePassword')}
      </AnimatedButton>
    </form>
  );
}
