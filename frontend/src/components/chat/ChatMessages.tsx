'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createConsumer } from '@rails/actioncable';
import { MessageForm } from './MessageForm';
import { GroupSettingsModal } from './GroupSettingsModal';
import { Settings2 } from 'lucide-react';

type User = {
  id: number;
  full_name: string;
  email: string;
};

type Message = {
  id: number;
  content: string;
  created_at: string;
  user: User;
};

type ChatMessagesProps = {
  initialMessages: Message[];
  conversationId: number;
  currentUser: User;
  token: string | undefined;
  conversation?: any;
  availableUsers?: any[];
};

import { formatTimeAgo } from '@/lib/utils';
import { usePresence } from '@/components/providers/PresenceProvider';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function ChatMessages({ initialMessages, conversationId, currentUser, token, conversation, availableUsers }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getUserPresence } = usePresence();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const wsUrl = apiUrl.replace('http', 'ws').replace('/api/v1', '') + '/cable?token=' + token;
    
    const consumer = createConsumer(wsUrl);

    const subscription = consumer.subscriptions.create(
      { channel: 'ConversationChannel', conversation_id: conversationId },
      {
        received(data: { message: Message }) {
          setMessages((prevMessages) => {
            if (prevMessages.some((msg) => msg.id === data.message.id)) {
              return prevMessages;
            }
            return [...prevMessages, data.message];
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      consumer.disconnect();
    };
  }, [conversationId, token]);

  const otherUser = conversation?.users?.find((u: any) => u.email !== currentUser.email) || conversation?.users?.[0];
  const presence = otherUser ? getUserPresence(otherUser.id) : null;
  const chatTitle = conversation?.is_group && conversation?.name ? conversation.name : (otherUser?.full_name || `Conversation #${conversationId}`);

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="md:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          <div className="flex flex-col">
            <h3 className="text-lg md:text-xl font-bold text-white truncate">
              {chatTitle}
            </h3>
            {!conversation?.is_group && presence && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${presence.isOnline ? 'bg-green-500' : 'bg-white/20'}`} />
                <span className="text-xs text-white/50">
                  {presence.isOnline
                    ? 'Online'
                    : ((presence.lastSeenAt || otherUser?.last_seen_at)
                        ? `Last seen ${formatTimeAgo(presence.lastSeenAt || otherUser.last_seen_at)}`
                        : 'Offline')}
                </span>
              </div>
            )}
          </div>
        </div>

        {conversation?.is_group && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            title="Group Settings"
          >
            <Settings2 size={20} />
          </button>
        )}
      </div>

      <GroupSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        conversation={conversation}
        currentUser={currentUser}
        availableUsers={availableUsers || []}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/40">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.user.id === currentUser.id;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const initial = msg.user.full_name[0]?.toUpperCase() || '?';

            return (
              <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isMine ? 'bg-brand-500/20 text-brand-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                  <span className="text-sm font-semibold">{initial}</span>
                </div>
                
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium text-white/80">
                      {isMine ? 'You' : msg.user.full_name}
                    </span>
                    <span className="text-xs text-white/40" suppressHydrationWarning>{time}</span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm text-white shadow-sm ${isMine ? 'bg-brand-600 rounded-tr-sm' : 'bg-white/10 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-black/20">
        <MessageForm conversationId={conversationId} />
      </div>
    </>
  );
}
