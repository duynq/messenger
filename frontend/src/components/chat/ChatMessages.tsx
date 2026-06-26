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

export function ChatMessages({ initialMessages, conversationId, currentUser, token, conversation, availableUsers }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!token) return;

    // Use environment variable or fallback to localhost
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const wsUrl = apiUrl.replace('http', 'ws').replace('/api/v1', '') + '/cable?token=' + token;
    
    const consumer = createConsumer(wsUrl);

    const subscription = consumer.subscriptions.create(
      { channel: 'ConversationChannel', conversation_id: conversationId },
      {
        received(data: { message: Message }) {
          setMessages((prevMessages) => {
            // Prevent duplicates (in case Server Action revalidatePath also fetches this)
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

  return (
    <>
      {conversation?.is_group && (
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-white truncate">
            {conversation?.name || `Conversation #${conversationId}`}
          </h3>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <Settings2 size={20} />
          </button>
        </div>
      )}

      <div className="hidden md:flex justify-end p-4 absolute top-0 right-0 z-10">
        {conversation?.is_group && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
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
