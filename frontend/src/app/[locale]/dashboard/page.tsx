import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { serverFetchJson } from '@/lib/server-api';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';
import { UsersList } from '@/components/chat/UsersList';
import { ConversationsList } from '@/components/chat/ConversationsList';

type DashboardData = {
  user: {
    full_name: string;
    email: string;
    id?: number;
  };
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations();
  const resolvedSearchParams = await searchParams;
  const page = Math.max(Number(resolvedSearchParams?.page) || 1, 1);
  const q = (resolvedSearchParams?.q as string) || '';
  const cursor = (resolvedSearchParams?.cursor as string) || '';
  const convPage = Number(resolvedSearchParams?.conv_page) || 1;
  const convFilter = (resolvedSearchParams?.conv_filter as string) || 'all';
  const cookieStore = await cookies();

  // Fetch dashboard data, users, and conversations in parallel
  const [data, usersData, conversationsData] = await Promise.all([
    serverFetchJson<DashboardData>('/dashboard'),
    serverFetchJson<any>(`/users?${new URLSearchParams({
      page: page.toString(),
      ...(q ? { q } : {}),
      ...(cursor ? { cursor } : {}),
    })}`).catch(() => ({ users: [], meta: null })),
    serverFetchJson<any>(`/conversations?page=${convPage}&filter=${convFilter}`).catch(() => ({ conversations: [], meta: null }))
  ]);

  const user = data.user;

  return (
    <AppLayout activePage="dashboard">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            {t('dashboard.welcome', { name: user.full_name })}
          </h2>
          <p className="text-white/60 text-sm md:text-base">{t('dashboard.overview')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <GlassCard hoverEffect className="flex items-center gap-4 p-5 md:p-6">
            <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">{t('dashboard.statDashboard')}</p>
              <p className="text-xl font-bold">{t('dashboard.statActive')}</p>
            </div>
          </GlassCard>

          <GlassCard hoverEffect className="flex items-center gap-4 p-5 md:p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">{t('dashboard.statResources')}</p>
              <p className="text-xl font-bold">{t('dashboard.statReady')}</p>
            </div>
          </GlassCard>

          <GlassCard hoverEffect className="flex items-center gap-4 p-5 md:p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center shrink-0">
              <Settings className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white/60">{t('dashboard.statAccount')}</p>
              <p className="text-lg md:text-xl font-bold truncate">{user.email}</p>
            </div>
          </GlassCard>
        </div>

        {conversationsData.conversations && (
          <div className="mb-8">
            <ConversationsList 
              conversations={conversationsData.conversations} 
              meta={conversationsData.meta} 
              currentUser={user}
              currentFilter={convFilter}
              availableUsers={usersData.users || []}
              token={cookieStore.get('token')?.value}
            />
          </div>
        )}

        <div className="mb-6 mt-8 md:mt-12 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Directory</h3>
        </div>

        <UsersList users={usersData.users || []} meta={usersData.meta} />
      </div>
    </AppLayout>
  );
}
