'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { updateAccountAction } from '@/actions/account';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useActionToast } from '@/hooks/useActionToast';

const initialState = {};

interface SettingsFormProps {
  user: {
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="space-y-4 mt-8 pt-8 border-t border-white/10">
      <h4 className="text-lg font-semibold">{t('settings.editProfile')}</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm text-white/50 mb-1.5">
            {t('auth.firstName')}
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            defaultValue={user.first_name}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-white"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm text-white/50 mb-1.5">
            {t('auth.lastName')}
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            defaultValue={user.last_name}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-white"
          />
        </div>
      </div>

      <AnimatedButton type="submit" isLoading={isPending}>
        {t('common.save')}
      </AnimatedButton>
    </form>
  );
}
