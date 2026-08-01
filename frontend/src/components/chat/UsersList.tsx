'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Loader2, MessageCircle, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { startDirectConversationAction } from '@/actions/chat';
import type { User } from '@/components/providers/AuthProvider';

interface Meta {
  current_page: number;
  total_pages: number;
  total_count: number;
  previous_cursor: string | null;
  next_cursor: string | null;
  has_previous: boolean;
  has_next: boolean;
}

export function UsersList({ 
  users, 
  meta 
}: { 
  users: User[];
  meta: Meta | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [goToPage, setGoToPage] = useState(meta?.current_page.toString() || '1');
  const [isGoToPageOpen, setIsGoToPageOpen] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    // Wait for 2 chars or empty
    if (debouncedSearchQuery.length >= 2 || debouncedSearchQuery.length === 0) {
      if (debouncedSearchQuery === (searchParams.get('q') || '')) return;
      setIsNavigating(true);
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearchQuery) {
        params.set('q', debouncedSearchQuery);
      } else {
        params.delete('q');
      }
      params.delete('cursor');
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }
  }, [debouncedSearchQuery, searchParams, router]);

  // When props change (navigation completes), stop navigating state
  useEffect(() => {
    setIsNavigating(false);
    setGoToPage(meta?.current_page.toString() || '1');
  }, [users, meta?.current_page]);

  const navigateWithCursor = (cursor: string | null, targetPage: number) => {
    if (!cursor) return;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('cursor', cursor);
    params.set('page', targetPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (targetPage: number) => {
    if (!meta || targetPage < 1 || targetPage > meta.total_pages || targetPage === meta.current_page) return;

    if (targetPage === meta.current_page - 1) {
      navigateWithCursor(meta.previous_cursor, targetPage);
      return;
    }

    if (targetPage === meta.current_page + 1) {
      navigateWithCursor(meta.next_cursor, targetPage);
      return;
    }

    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', targetPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleGoToPage = (event: React.FormEvent) => {
    event.preventDefault();
    const targetPage = Number(goToPage);
    if (!meta || !Number.isInteger(targetPage) || targetPage < 1 || targetPage > meta.total_pages) return;
    setIsGoToPageOpen(false);
    handlePageChange(targetPage);
  };

  const openGoToPage = () => {
    setGoToPage(meta?.current_page.toString() || '1');
    setIsGoToPageOpen(true);
  };

  const getPageNumbers = () => {
    if (!meta) return [];
    const pages = new Set<number>();
    pages.add(1);
    pages.add(meta.total_pages);
    for (let page = meta.current_page - 1; page <= meta.current_page + 1; page += 1) {
      if (page > 1 && page < meta.total_pages) pages.add(page);
    }
    return [...pages].sort((a, b) => a - b);
  };

  const handleStartChat = (userId: number) => {
    startTransition(() => {
      startDirectConversationAction(userId);
    });
  };

  return (
    <div className="space-y-6 relative">
      {isNavigating && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <GlassCard key={user.id} hoverEffect className="flex flex-col justify-between p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-300 font-semibold text-lg">
                  {user.first_name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="overflow-hidden">
                <h4 className="text-white font-medium truncate" title={user.full_name}>
                  {user.full_name}
                </h4>
                <p className="text-white/50 text-sm truncate" title={user.email}>
                  {user.email}
                </p>
              </div>
            </div>
            
            <AnimatedButton 
              onClick={() => handleStartChat(user.id)}
              disabled={isPending || isNavigating}
              className="w-full justify-center bg-white/10 hover:bg-white/20 text-white border-0 py-2"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Start Chat
            </AnimatedButton>
          </GlassCard>
        ))}
      </div>

      {meta && (
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <AnimatedButton
              variant="secondary"
              onClick={() => handlePageChange(meta.current_page - 1)}
              disabled={!meta.has_previous || isNavigating}
              className="px-4 py-2"
            >
              Prev
            </AnimatedButton>

            {getPageNumbers().map((pageNumber, index, pages) => (
              <React.Fragment key={pageNumber}>
                {index > 0 && pageNumber - pages[index - 1] > 1 && (
                  <button
                    type="button"
                    onClick={openGoToPage}
                    className="min-w-10 h-10 px-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Go to page"
                  >
                    …
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePageChange(pageNumber)}
                  disabled={isNavigating}
                  className={`min-w-10 h-10 px-2 rounded-xl font-medium transition-colors ${
                    pageNumber === meta.current_page
                      ? 'bg-brand-500 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {pageNumber.toLocaleString()}
                </button>
              </React.Fragment>
            ))}

            <AnimatedButton
              variant="secondary"
              onClick={() => handlePageChange(meta.current_page + 1)}
              disabled={!meta.has_next || isNavigating}
              className="px-4 py-2"
            >
              Next
            </AnimatedButton>
          </div>
        </div>
      )}

      {meta && isGoToPageOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsGoToPageOpen(false)}
            aria-label="Close go to page dialog"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="go-to-page-title"
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#151515] p-6 shadow-2xl"
          >
            <h3 id="go-to-page-title" className="text-lg font-semibold text-white">
              Go to page
            </h3>
            <p className="mt-1 text-sm text-white/50">
              Enter a page from 1 to {meta.total_pages.toLocaleString()}.
            </p>

            <form onSubmit={handleGoToPage} className="mt-5 flex gap-3">
              <input
                type="number"
                min={1}
                max={meta.total_pages}
                value={goToPage}
                onChange={(event) => setGoToPage(event.target.value)}
                autoFocus
                className="min-w-0 flex-1 h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <AnimatedButton
                type="submit"
                disabled={isNavigating || !goToPage}
                className="h-11 px-5 py-2"
              >
                Go
              </AnimatedButton>
            </form>
          </div>
        </div>
      )}
      
      {users.length === 0 && (
        <div className="text-center text-white/50 py-12">
          No users found.
        </div>
      )}
    </div>
  );
}
