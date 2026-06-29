'use client';

import { useActionState, useRef, useState } from 'react';
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
    avatar_url?: string;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar_url || null);
  useActionToast(state);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  return (
    <form action={formAction} className="space-y-6 mt-8 pt-8 border-t border-white/10">
      <h4 className="text-lg font-semibold">{t('settings.editProfile')}</h4>

      <div className="flex items-center gap-6">
        <div
          className="relative w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-300 text-2xl font-bold shrink-0 overflow-hidden cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="avatar preview" className="w-full h-full object-cover" />
          ) : (
            user.full_name[0]?.toUpperCase() || '?'
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs text-white">
            Upload
          </div>
        </div>
        <div className="flex-1">
          <input
            type="file"
            name="avatar"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />
          <AnimatedButton type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            {t('settings.changeAvatar') || "Change Avatar"}
          </AnimatedButton>
          <p className="text-white/40 text-xs mt-2">JPG, PNG, WebP or GIF. Max 5MB.</p>
        </div>
      </div>

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
