'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { MessageCircle, Loader2 } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { createConsumer } from '@rails/actioncable';
import type { User } from '@/components/providers/AuthProvider';
import { usePresence } from '@/components/providers/PresenceProvider';

import { CreateGroupModal } from './CreateGroupModal';

interface LastMessage {
  content: string;
  sender_name: string;
  created_at: string;
}

interface Conversation {
  id: number;
  is_group: boolean;
  name: string | null;
  users: User[];
  created_at: string;
  unread_count?: number;
  last_message_at?: string;
  last_message?: LastMessage | null;
}

interface Meta {
  current_page: number;
  total_pages: number;
  has_next: boolean;
}

export function ConversationsList({ 
  conversations, 
  meta,
  currentUser,
  currentFilter = 'all',
  availableUsers = [],
  token
}: { 
  conversations: Conversation[];
  meta: Meta | null;
  currentUser: { email: string; full_name: string; id?: number };
  currentFilter?: string;
  availableUsers?: any[];
  token?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [realtimeConversations, setRealtimeConversations] = useState<Conversation[]>(conversations);
  const { getUserPresence } = usePresence();

  useEffect(() => {
    setRealtimeConversations(conversations);
    setIsNavigating(false);
  }, [conversations, currentFilter]);

  useEffect(() => {
    if (!token || !currentUser.id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const wsUrl = apiUrl.replace('http', 'ws').replace('/api/v1', '') + '/cable?token=' + token;
    const consumer = createConsumer(wsUrl);

    const subscription = consumer.subscriptions.create(
      { channel: 'UserConversationsChannel' },
      {
        received(data: any) {
          if (data.action === 'new_message' && data.conversation_id) {
            setRealtimeConversations(prev => {
              const idx = prev.findIndex(c => c.id === data.conversation_id);
              if (idx !== -1) {
                const newConvs = [...prev];
                const conv = newConvs.splice(idx, 1)[0];
                const newUnreadCount = (conv.unread_count || 0) + 1;
                newConvs.unshift({
                  ...conv,
                  unread_count: newUnreadCount,
                  last_message: data.last_message || conv.last_message
                });
                return newConvs;
              }
              router.refresh();
              return prev;
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      consumer.disconnect();
    };
  }, [token, currentUser.id, router]);

  const handlePageChange = (newPage: number) => {
    if (newPage === meta?.current_page || newPage < 1 || newPage > (meta?.total_pages || 1)) return;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('conv_page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleFilterChange = (filter: string) => {
    if (filter === currentFilter) return;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('conv_filter', filter);
    params.set('conv_page', '1'); // reset page when filter changes
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

  return (
    <div className="space-y-6 relative mb-12 mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-semibold text-white">Recent Conversations</h3>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 rounded-xl p-1 w-fit">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentFilter === 'all'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('active')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentFilter === 'active'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Active
            </button>
          </div>

          <AnimatedButton
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-1.5 h-auto text-sm bg-indigo-500 hover:bg-indigo-600 border-0"
          >
            + New Group
          </AnimatedButton>
        </div>
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        availableUsers={availableUsers}
        currentUser={currentUser}
      />

      {isNavigating && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      )}

      {realtimeConversations.length === 0 ? (
        <div className="text-center text-white/50 py-12 border border-white/10 rounded-2xl bg-white/5">
          {currentFilter === 'active'
            ? 'No active conversations found.'
            : 'No conversations yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {realtimeConversations.map(conversation => {
          // Find the other user in the conversation
          const otherUser = conversation.users.find(u => u.id !== currentUser.id) || conversation.users[0];
          const displayName = conversation.is_group && conversation.name 
            ? conversation.name 
            : otherUser?.full_name || 'Unknown User';
            
          const initial = displayName[0]?.toUpperCase() || '?';

          return (
            <GlassCard key={conversation.id} hoverEffect className="flex flex-col justify-between p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 relative">
                  <span className="text-indigo-300 font-semibold text-lg">{initial}</span>
                  {!conversation.is_group && otherUser && (
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                        getUserPresence(otherUser.id, (otherUser as any).is_online, (otherUser as any).last_seen_at).isOnline ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="text-white font-medium truncate" title={displayName}>
                      {displayName}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conversation.last_message && (
                        <span className="text-[10px] text-white/30 whitespace-nowrap" suppressHydrationWarning>
                          {formatTimeAgo(conversation.last_message.created_at)}
                        </span>
                      )}
                      {!!conversation.unread_count && conversation.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {conversation.last_message ? (
                    <p className="text-white/40 text-xs truncate mt-0.5">
                      {conversation.is_group
                        ? `${conversation.last_message.sender_name}: ${conversation.last_message.content}`
                        : conversation.last_message.content
                      }
                    </p>
                  ) : conversation.is_group ? (
                    <p className="text-white/50 text-xs truncate">Group Chat</p>
                  ) : null}
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
      )}

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
