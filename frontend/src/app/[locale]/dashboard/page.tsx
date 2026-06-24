import { getTranslations } from 'next-intl/server';
import { serverFetchJson } from '@/lib/server-api';
import { AppNav } from '@/components/layout/AppNav';
import { GlassCard } from '@/components/ui/GlassCard';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

type DashboardData = {
  user: {
    full_name: string;
    email: string;
  };
};

export default async function DashboardPage() {
  const t = await getTranslations();
  const data = await serverFetchJson<DashboardData>('/dashboard');
  const user = data.user;

  return (
    <div className="min-h-screen bg-background">
      <AppNav user={user} activePage="dashboard" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {t('dashboard.welcome', { name: user.full_name })}
          </h2>
          <p className="text-white/60">{t('dashboard.overview')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard hoverEffect className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">{t('dashboard.statDashboard')}</p>
              <p className="text-xl font-bold">{t('dashboard.statActive')}</p>
            </div>
          </GlassCard>

          <GlassCard hoverEffect className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">{t('dashboard.statResources')}</p>
              <p className="text-xl font-bold">{t('dashboard.statReady')}</p>
            </div>
          </GlassCard>

          <GlassCard hoverEffect className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center">
              <Settings className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">{t('dashboard.statAccount')}</p>
              <p className="text-xl font-bold">{user.email}</p>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-8 text-center">
          <h3 className="text-xl font-semibold mb-2 text-white/80">
            {t('dashboard.starterTitle')}
          </h3>
          <p className="text-white/50">{t('dashboard.starterDescription')}</p>
        </GlassCard>
      </main>
    </div>
  );
}
