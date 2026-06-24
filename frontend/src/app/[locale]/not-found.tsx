import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Home } from 'lucide-react';

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass rounded-2xl p-10 max-w-md text-center">
        <div className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-brand-600 mb-4">
          404
        </div>
        <h2 className="text-2xl font-bold mb-2">{t('errors.notFoundTitle')}</h2>
        <p className="text-white/60 mb-8">{t('errors.notFoundDescription')}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl px-6 py-3 transition-colors"
        >
          <Home size={18} />
          {t('common.backToDashboard')}
        </Link>
      </div>
    </div>
  );
}
