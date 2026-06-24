import { getTranslations } from 'next-intl/server';
import { serverFetchJson } from '@/lib/server-api';
import { AppNav } from '@/components/layout/AppNav';
import { GlassCard } from '@/components/ui/GlassCard';
import { SettingsForm } from './SettingsForm';

type DashboardData = {
  user: {
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
  };
};

export default async function SettingsPage() {
  const t = await getTranslations();
  const data = await serverFetchJson<DashboardData>('/dashboard');
  const user = data.user;

  return (
    <div className="min-h-screen bg-background">
      <AppNav user={user} activePage="settings" />

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <h2 className="text-3xl font-bold mb-8">{t('settings.title')}</h2>

        <GlassCard className="p-8">
          <h3 className="text-xl font-semibold mb-4">{t('settings.accountInfo')}</h3>
          <div className="space-y-4 text-white/70">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-white/50">{t('settings.name')}</span>
              <span className="font-medium text-white">{user.full_name}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-white/50">{t('settings.email')}</span>
              <span className="font-medium text-white">{user.email}</span>
            </div>
          </div>

          <SettingsForm user={user} />

          <p className="text-white/40 text-sm mt-6">{t('settings.extendHint')}</p>
        </GlassCard>
      </main>
    </div>
  );
}
