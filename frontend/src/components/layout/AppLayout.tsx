'use client';

import React, { useState } from 'react';
import { Sidebar, NavPage } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { Menu, MessageSquare } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activePage: NavPage;
  title?: string;
}

export function AppLayout({ children, activePage, title }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Sidebar (Desktop left, Mobile drawer) */}
      <Sidebar activePage={activePage} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Mobile Topbar */}
        <header className="md:hidden flex items-center justify-between px-4 h-16 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-white/80 hover:text-white"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            {title ? (
              <h2 className="text-lg font-semibold text-white truncate max-w-[200px]">{title}</h2>
            ) : (
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-400" />
                Messenger
              </h1>
            )}
          </div>
          <NotificationBell />
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
