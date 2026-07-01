'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { logoutAction } from '@/actions/auth';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { LogOut, Menu, X, MessageSquare, LayoutDashboard, Settings, Search } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { MessageSearchModal } from '@/components/chat/MessageSearchModal';

import { useUser } from '@/components/providers/AuthProvider';

export type NavPage = 'dashboard' | 'settings';

interface SidebarProps {
  activePage: NavPage;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ activePage, isOpen, setIsOpen }: SidebarProps) {
  const t = useTranslations();
  const user = useUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: t('nav.dashboard'), page: 'dashboard', icon: <LayoutDashboard size={20} /> },
    { href: '/settings', label: t('nav.settings'), page: 'settings', icon: <Settings size={20} /> },
  ] as const;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-background border-r border-white/5">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-brand-400" />
          {t('common.appName')}
        </h1>
        <div className="hidden md:block">
          <NotificationBell align="left" />
        </div>
        {/* Mobile Close Button */}
        <button 
          className="md:hidden p-2 text-white/60 hover:text-white"
          onClick={() => setIsOpen(false)}
          aria-label={t('common.close') || "Close menu"}
        >
          <X size={24} />
        </button>
      </div>

      {/* User Info (Mobile) */}
      <div className="md:hidden px-6 pb-6">
        {user && (
          <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user.full_name[0]?.toUpperCase() || '?'
                )}
              </div>
              <span className="text-sm font-medium text-white">{user.full_name}</span>
            </div>
            <LanguageSwitcher />
          </div>
        )}
      </div>

      {/* Search Button */}
      <div className="px-4 pb-2">
        <button
          onClick={() => { setIsOpen(false); setIsSearchOpen(true); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Search size={18} />
          <span className="text-sm font-medium">Search Messages</span>
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto hide-scrollbar">
        {navLinks.map(({ href, label, page, icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === page 
                ? 'bg-brand-500/10 text-brand-400 font-medium' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {icon}
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="hidden md:flex items-center justify-between px-2">
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user.full_name[0]?.toUpperCase() || '?'
                )}
              </div>
              <span className="text-sm font-medium text-white/80 truncate max-w-[90px]">{user.full_name}</span>
            </div>
          )}
          <LanguageSwitcher />
        </div>
        
        <form action={logoutAction}>
          <AnimatedButton
            variant="ghost"
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 h-[46px] text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl"
          >
            <LogOut size={18} />
            {t('nav.signOut')}
          </AnimatedButton>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:block w-72 h-screen shrink-0 sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div className={`md:hidden fixed inset-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
        <aside className="relative w-[280px] h-full shadow-2xl">
          {sidebarContent}
        </aside>
      </div>

      {/* Global Search Modal */}
      <MessageSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}
