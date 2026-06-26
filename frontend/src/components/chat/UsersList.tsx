'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { UserPlus, Loader2, MessageCircle } from 'lucide-react';
import { fetchUsersAction, startDirectConversationAction } from '@/actions/chat';
import type { User } from '@/components/providers/AuthProvider';

interface Meta {
  current_page: number;
  total_pages: number;
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

  // When props change (navigation completes), stop navigating state
  useEffect(() => {
    setIsNavigating(false);
  }, [users]);

  const handlePageChange = (newPage: number) => {
    if (newPage === meta?.current_page || newPage < 1 || newPage > (meta?.total_pages || 1)) return;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleStartChat = (userId: number) => {
    startTransition(() => {
      startDirectConversationAction(userId);
    });
  };

  const getPageNumbers = () => {
    if (!meta) return [];
    const { current_page, total_pages } = meta;
    const pages: (number | string)[] = [];
    
    // Always show first page, last page, and 1 page before/after current
    
    if (total_pages <= 7) {
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (current_page > 3) {
        pages.push('...');
      }
      
      let start = Math.max(2, current_page - 1);
      let end = Math.min(total_pages - 1, current_page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current_page < total_pages - 2) {
        pages.push('...');
      }
      
      pages.push(total_pages);
    }
    
    return pages;
  };

  return (
    <div className="space-y-6 relative">
      {isNavigating && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      )}

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

      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
          <AnimatedButton
            variant="outline"
            onClick={() => handlePageChange(meta.current_page - 1)}
            disabled={meta.current_page === 1 || isNavigating}
            className="px-4 py-2"
          >
            Prev
          </AnimatedButton>
          
          <div className="flex gap-1 mx-2 flex-wrap justify-center">
            {getPageNumbers().map((pageNum, index) => (
              pageNum === '...' ? (
                <span key={`ellipsis-${index}`} className="w-10 h-10 flex items-center justify-center text-white/50">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => handlePageChange(pageNum as number)}
                  disabled={isNavigating}
                  className={`min-w-10 px-2 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    pageNum === meta.current_page
                      ? 'bg-brand-500 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              )
            ))}
          </div>

          <AnimatedButton
            variant="outline"
            onClick={() => handlePageChange(meta.current_page + 1)}
            disabled={!meta.has_next || isNavigating}
            className="px-4 py-2"
          >
            Next
          </AnimatedButton>
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
