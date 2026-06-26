'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { logoutAction } from '@/actions/auth';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { LogOut } from 'lucide-react';

import { useUser } from '@/components/providers/AuthProvider';

export type NavPage = 'dashboard' | 'settings';

interface AppNavProps {
  activePage: NavPage;
}

export function AppNav({ activePage }: AppNavProps) {
  const t = useTranslations();
  const user = useUser();

  const navLinks: { href: '/dashboard' | '/settings'; label: string; page: NavPage }[] = [
    { href: '/dashboard', label: t('nav.dashboard'), page: 'dashboard' },
    { href: '/settings', label: t('nav.settings'), page: 'settings' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-auto min-h-[5rem] py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            {t('common.appName')}
          </h1>
          <form action={logoutAction} className="md:hidden">
            <AnimatedButton
              variant="ghost"
              type="submit"
              className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300"
            >
              <LogOut size={16} />
            </AnimatedButton>
          </form>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {navLinks.map(({ href, label, page }) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap transition-colors ${
                activePage === page ? 'text-white font-medium' : 'text-white/50 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <LanguageSwitcher />
          <div className="flex flex-col items-end">
            {user && (
              <>
                <span className="text-sm font-medium text-white">{user.full_name}</span>

              </>
            )}
          </div>
          <div className="h-8 w-px bg-white/10" />
          <form action={logoutAction}>
            <AnimatedButton
              variant="ghost"
              type="submit"
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300"
            >
              <LogOut size={16} className="mr-2" />
              {t('nav.signOut')}
            </AnimatedButton>
          </form>
        </div>
      </div>
    </nav>
  );
}
