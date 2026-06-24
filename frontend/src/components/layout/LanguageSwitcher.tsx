'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(nextLocale: Locale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-white/40 shrink-0" />
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        aria-label={t('label')}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/80 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="bg-surface-dark text-white">
            {t(loc)}
          </option>
        ))}
      </select>
    </div>
  );
}
