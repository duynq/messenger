'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { MessageCircle, Loader2 } from 'lucide-react';
import type { User } from '@/components/providers/AuthProvider';

interface Conversation {
  id: number;
  is_group: boolean;
  name: string | null;
  users: User[];
  created_at: string;
}

interface Meta {
  current_page: number;
  total_pages: number;
  has_next: boolean;
}

export function ConversationsList({ 
  conversations, 
  meta,
  currentUser 
}: { 
  conversations: Conversation[];
  meta: Meta | null;
  currentUser: { email: string; full_name: string; id?: number };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [conversations]);

  const handlePageChange = (newPage: number) => {
    if (newPage === meta?.current_page || newPage < 1 || newPage > (meta?.total_pages || 1)) return;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('conv_page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const getPageNumbers = () => {
    if (!meta) return [];
    const { current_page, total_pages } = meta;
    const pages: (number | string)[] = [];
    
    if (total_pages <= 5) {
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current_page > 3) pages.push('...');
      let start = Math.max(2, current_page - 1);
      let end = Math.min(total_pages - 1, current_page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current_page < total_pages - 2) pages.push('...');
      pages.push(total_pages);
    }
    
    return pages;
  };

  if (conversations.length === 0) {
    return null; // Don't show the section if no recent conversations
  }

  return (
    <div className="space-y-6 relative mb-12">
      {isNavigating && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {conversations.map(conversation => {
          // Find the other user in the conversation
          const otherUser = conversation.users.find(u => u.email !== currentUser.email) || conversation.users[0];
          const displayName = conversation.is_group && conversation.name 
            ? conversation.name 
            : otherUser?.full_name || 'Unknown User';
            
          const initial = displayName[0]?.toUpperCase() || '?';

          return (
            <GlassCard key={conversation.id} hoverEffect className="flex flex-col justify-between p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-300 font-semibold text-lg">{initial}</span>
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-white font-medium truncate" title={displayName}>
                    {displayName}
                  </h4>
                  {conversation.is_group && (
                    <p className="text-white/50 text-xs truncate">Group Chat</p>
                  )}
                </div>
              </div>
              
              <AnimatedButton 
                onClick={() => router.push(`/chat/${conversation.id}`)}
                disabled={isNavigating}
                className="w-full justify-center bg-brand-500 hover:bg-brand-600 text-white border-0 py-2"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Continue Chat
              </AnimatedButton>
            </GlassCard>
          );
        })}
      </div>

      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
          <AnimatedButton
            variant="secondary"
            onClick={() => handlePageChange(meta.current_page - 1)}
            disabled={meta.current_page === 1 || isNavigating}
            className="px-3 py-1.5 text-sm"
          >
            Prev
          </AnimatedButton>
          
          <div className="flex gap-1 mx-2 flex-wrap justify-center">
            {getPageNumbers().map((pageNum, index) => (
              pageNum === '...' ? (
                <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-white/50 text-sm">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => handlePageChange(pageNum as number)}
                  disabled={isNavigating}
                  className={`min-w-8 px-2 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
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
            variant="secondary"
            onClick={() => handlePageChange(meta.current_page + 1)}
            disabled={!meta.has_next || isNavigating}
            className="px-3 py-1.5 text-sm"
          >
            Next
          </AnimatedButton>
        </div>
      )}
    </div>
  );
}
