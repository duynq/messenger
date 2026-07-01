'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { createConsumer } from '@rails/actioncable';
import { useTranslations } from 'next-intl';
import { GroupAvatar } from './GroupAvatar';
import { MessageForm } from './MessageForm';
import { GroupSettingsModal } from './GroupSettingsModal';
import { Settings2, Loader2, Trash2, Pencil, X, Check, CheckCheck, CornerUpLeft, SmilePlus, FileDown, BellOff, Bell } from 'lucide-react';
import { deleteMessageAction, updateMessageAction, reactToMessageAction, muteConversationAction, unmuteConversationAction } from '@/actions/chat';
import { toast } from 'sonner';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { MessageSearchModal } from './MessageSearchModal';

type User = {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string;
};

type Message = {
  id: number;
  content: string | null;
  created_at: string;
  user: User;
  deleted?: boolean;
  edited_at?: string;
  reply_to?: { id: number; sender_name: string; content: string | null; deleted: boolean };
  reactions?: { emoji: string; count: number; reacted_by_me: boolean; users: string[] }[];
  attachments?: { url: string; filename: string; content_type: string; byte_size: number }[];
  message_type?: 'user' | 'system';
  metadata?: Record<string, any>;
};

interface ChatMessagesProps {
  conversationId: number;
  currentUser: { id: number; full_name: string; email: string; avatar_url?: string };
  initialMessages?: Message[];
  conversation?: {
    id: number;
    is_group: boolean;
    name: string;
    admin_id: number;
    avatar_url?: string;
    read_receipts?: Record<number, string>;
    is_muted?: boolean;
    users: { id: number; full_name: string; email: string; is_online?: boolean; last_seen_at?: string; avatar_url?: string }[];
  };
  availableUsers?: { id: number; full_name: string; email: string }[];
  token: string | undefined;
  initialMeta?: { has_next: boolean; next_cursor: number | null };
}

import { formatTimeAgo } from '@/lib/utils';
import { usePresence } from '@/components/providers/PresenceProvider';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function formatTypingText(typingUsers: Record<number, string>): string {
  const names = Object.values(typingUsers);
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} others are typing...`;
}

export function ChatMessages({ initialMessages, conversationId, currentUser, token, conversation, availableUsers, initialMeta }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [readReceipts, setReadReceipts] = useState<Record<number, string>>(conversation?.read_receipts || {});
  const [hasNext, setHasNext] = useState(initialMeta?.has_next || false);
  const [nextCursor, setNextCursor] = useState<number | null>(initialMeta?.next_cursor || null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<{ id: number, sender_name: string, content: string | null } | null>(null);
  const [reactingToMessageId, setReactingToMessageId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(conversation?.is_muted || false);
  const [isMuteLoading, setIsMuteLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const isInitialRender = useRef(true);
  const typingTimers = useRef<Record<number, NodeJS.Timeout>>({});
  const subscriptionRef = useRef<any>(null);
  const { getUserPresence } = usePresence();
  const t = useTranslations('chat');
  const tSys = useTranslations('systemMessages');
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      scrollToBottom();
      return;
    }
    if (isAtBottom.current) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    // Handle hash scrolling and highlighting
    const hash = window.location.hash;
    if (hash && hash.startsWith('#message-')) {
      const msgId = parseInt(hash.replace('#message-', ''), 10);
      if (!isNaN(msgId)) {
        setTimeout(() => {
          const el = document.getElementById(`message-${msgId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(msgId);
            setTimeout(() => setHighlightedMessageId(null), 3000); // clear highlight after 3s
          }
        }, 500);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!token || !conversationId) return;

    const markAsRead = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        await fetch(`${apiUrl}/conversations/${conversationId}/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    };

    markAsRead();
  }, [messages.length, conversationId, token]);

  const loadOlderMessages = async () => {
    if (!nextCursor || isLoadingOlder) return;
    setIsLoadingOlder(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const res = await fetch(`${apiUrl}/conversations/${conversationId}/messages?before_message_id=${nextCursor}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const olderMessages = [...data.messages].reverse();
        
        const oldHeight = containerRef.current?.scrollHeight;
        
        flushSync(() => {
          setMessages(prev => {
            // filter duplicates just in case
            const newMsgs = olderMessages.filter(om => !prev.some(pm => pm.id === om.id));
            return [...newMsgs, ...prev];
          });
          setHasNext(data.meta.has_next);
          setNextCursor(data.meta.next_cursor);
        });

        if (containerRef.current && oldHeight) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight - oldHeight;
        }
      }
    } catch (e) {
      console.error('Failed to load older messages', e);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Check if we are near the bottom (within 50px)
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;

    if (scrollTop === 0 && hasNext && !isLoadingOlder) {
      loadOlderMessages();
    }
  };

  const handleUpdateMessage = async (messageId: number) => {
    if (!editingContent.trim() || isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await updateMessageAction(conversationId, messageId, editingContent);
      if (result.error) {
        toast.error(result.error);
      } else {
        setEditingMessageId(null);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReact = async (messageId: number, emoji: string) => {
    setReactingToMessageId(null);
    const result = await reactToMessageAction(conversationId, messageId, emoji);
    if (result.error) {
      toast.error(result.error);
    }
  };

  useEffect(() => {
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const wsUrl = apiUrl.replace('http', 'ws').replace('/api/v1', '') + '/cable?token=' + token;
    
    const consumer = createConsumer(wsUrl);

    const subscription = consumer.subscriptions.create(
      { channel: 'ConversationChannel', conversation_id: conversationId },
      {
        received(data: any) {
          if (data.type === 'typing') {
            // Ignore typing events from ourselves
            if (data.user_id === currentUser.id) return;

            setTypingUsers(prev => ({
              ...prev,
              [data.user_id]: data.user_name
            }));

            // Clear existing timer for this user
            if (typingTimers.current[data.user_id]) {
              clearTimeout(typingTimers.current[data.user_id]);
            }
            // Auto-remove after 3s of no typing
            typingTimers.current[data.user_id] = setTimeout(() => {
              setTypingUsers(prev => {
                const { [data.user_id]: _, ...rest } = prev;
                return rest;
              });
            }, 3000);
          } else if (data.action === 'message_deleted') {
            setMessages(prev => prev.map(msg =>
              msg.id === data.message_id ? { ...msg, deleted: true, content: '' } : msg
            ));
          } else if (data.action === 'message_updated') {
            setMessages(prev => prev.map(msg =>
              msg.id === data.message.id ? data.message : msg
            ));
          } else if (data.action === 'group_updated') {
            router.refresh();
          } else if (data.action === 'read_receipt') {
            setReadReceipts(prev => ({ ...prev, [data.user_id]: data.last_read_at }));
          } else if (data.message) {
            // Remove sender from typing users when they send a message
            if (data.message.user?.id) {
              setTypingUsers(prev => {
                const { [data.message.user.id]: _, ...rest } = prev;
                return rest;
              });
              if (typingTimers.current[data.message.user.id]) {
                clearTimeout(typingTimers.current[data.message.user.id]);
              }
            }

            setMessages((prevMessages) => {
              if (prevMessages.some((msg) => msg.id === data.message.id)) {
                return prevMessages;
              }
              return [...prevMessages, data.message];
            });
          }
        }
      }
    );
    subscriptionRef.current = subscription;

    return () => {
      subscriptionRef.current = null;
      // Clear all typing timers
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
      subscription.unsubscribe();
      consumer.disconnect();
    };
  }, [conversationId, token, currentUser.id]);

  const otherUser = conversation?.users?.find((u) => u.id !== currentUser.id) || conversation?.users?.[0];
  const presence = otherUser ? getUserPresence(otherUser.id, otherUser.is_online, otherUser.last_seen_at) : null;
  const chatTitle = conversation?.is_group && conversation?.name ? conversation.name : (otherUser?.full_name || `Conversation #${conversationId}`);

  const handleToggleMute = async () => {
    setIsMuteLoading(true);
    try {
      const result = isMuted
        ? await unmuteConversationAction(conversationId)
        : await muteConversationAction(conversationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsMuted(!isMuted);
        toast.success(isMuted ? 'Notifications enabled' : 'Notifications muted');
      }
    } finally {
      setIsMuteLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-background sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="md:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </Link>
          {conversation && (
            <GroupAvatar conversation={conversation} currentUser={currentUser} />
          )}
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
            {isMuted && (
              <div className="flex items-center gap-1 mt-0.5">
                <BellOff className="w-3 h-3 text-white/30" />
                <span className="text-[11px] text-white/30">Muted</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMute}
            disabled={isMuteLoading}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              isMuted
                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
          >
            {isMuteLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isMuted ? (
              <BellOff size={20} />
            ) : (
              <Bell size={20} />
            )}
          </button>
          {conversation?.is_group && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
              title="Group Settings"
            >
              <Settings2 size={20} />
            </button>
          )}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            title="Search in conversation"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {conversation?.is_group && (
        <GroupSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          conversation={conversation as any}
          currentUser={currentUser}
          availableUsers={availableUsers || []}
          isMuted={isMuted}
          onMuteToggle={handleToggleMute}
          isMuteLoading={isMuteLoading}
        />
      )}

      <div 
        className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {isLoadingOlder && (
          <div className="flex justify-center py-2 shrink-0">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/40">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.user.id === currentUser.id;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const initial = msg.user.full_name[0]?.toUpperCase() || '?';
            
            // For read receipts
            const lastMyMessage = [...messages].reverse().find(m => m.user.id === currentUser.id);
            const isLastMine = lastMyMessage?.id === msg.id;

            if (msg.message_type === 'system') {
              const action = msg.metadata?.action as 'join' | 'leave' | 'remove' | 'rename' | 'admin_transfer';
              const actor = msg.user.full_name;
              let content = '';

              try {
                if (action === 'rename') {
                  content = tSys('rename', { actor, new_name: msg.metadata?.new_name || '' });
                } else if (action === 'join' || action === 'leave' || action === 'remove' || action === 'admin_transfer') {
                  content = tSys(action, { actor, target: msg.metadata?.target_user?.full_name || '' });
                }
              } catch (e) {
                content = `${actor} ${action}`;
              }

              return (
                <div key={msg.id} id={`message-${msg.id}`} className="flex justify-center w-full my-2 shrink-0">
                  <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[11px] text-white/50">
                    {content}
                  </div>
                </div>
              );
            }

            const isHighlighted = highlightedMessageId === msg.id;

            return (
              <div key={msg.id} id={`message-${msg.id}`} className={`flex gap-3 max-w-[80%] shrink-0 ${isMine ? 'ml-auto flex-row-reverse' : ''} ${isHighlighted ? 'ring-2 ring-brand-500 bg-brand-500/10 p-2 rounded-xl transition-all duration-1000' : 'transition-all duration-1000'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden ${isMine ? 'bg-brand-500/20 text-brand-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                  {msg.user.avatar_url ? (
                    <img src={msg.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold">{initial}</span>
                  )}
                </div>
                
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative min-w-[120px]`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium text-white/80">
                      {isMine ? 'You' : msg.user.full_name}
                    </span>
                    <span className="text-xs text-white/40" suppressHydrationWarning>{time}</span>
                  </div>

                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2 w-full min-w-[200px] bg-white/10 p-2 rounded-xl">
                      <input
                        type="text"
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full bg-black/20 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-brand-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateMessage(msg.id);
                          if (e.key === 'Escape') setEditingMessageId(null);
                        }}
                      />
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditingMessageId(null)} className="p-1 text-white/50 hover:text-white rounded-md hover:bg-white/10" title={t('cancel')}>
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateMessage(msg.id)} disabled={isUpdating} className="p-1 text-green-400 hover:text-green-300 rounded-md hover:bg-green-500/10" title={t('save')}>
                          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-w-full">
                      <div className={`px-4 py-2.5 rounded-2xl text-sm text-white shadow-sm flex flex-col gap-1 ${isMine ? 'bg-brand-600 rounded-tr-sm' : 'bg-white/10 rounded-tl-sm'} max-w-full`}>
                        {msg.reply_to && (
                        <div 
                          className={`flex flex-col text-xs pl-2.5 border-l-2 cursor-pointer transition-colors truncate rounded-sm mb-1 ${isMine ? 'border-brand-300 hover:bg-brand-500/50 py-1' : 'border-indigo-400 hover:bg-white/5 py-1'}`}
                          onClick={() => document.getElementById(`message-${msg.reply_to?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        >
                          <span className={`font-semibold ${isMine ? 'text-brand-200' : 'text-indigo-300'}`}>{msg.reply_to.sender_name}</span>
                          <span className={`${isMine ? 'text-white/80' : 'text-white/60'} truncate`}>{msg.reply_to.content || t('messageDeleted')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-wrap break-words whitespace-pre-wrap">
                        {msg.deleted ? (
                          <span className="italic text-white/50">{t('messageDeleted')}</span>
                        ) : (
                          msg.content
                        )}
                      </div>
                      
                      {!msg.deleted && msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                          {msg.attachments.map((attachment, idx) => (
                            <div key={idx} className="max-w-[240px]">
                              {attachment.content_type.startsWith('image/') ? (
                                <a href={attachment.url} target="_blank" rel="noreferrer">
                                  <img 
                                    src={attachment.url} 
                                    alt={attachment.filename} 
                                    className="rounded-lg object-cover max-h-[200px] w-full"
                                  />
                                </a>
                              ) : (
                                <a 
                                  href={attachment.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-3 bg-black/20 hover:bg-black/30 p-3 rounded-lg transition-colors"
                                >
                                  <div className="bg-white/10 p-2 rounded-lg shrink-0">
                                    <FileDown className="w-5 h-5 text-white/80" />
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium truncate">{attachment.filename}</span>
                                    <span className="text-[10px] text-white/50">{(attachment.byte_size / 1024 / 1024).toFixed(2)} MB</span>
                                  </div>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.edited_at && !msg.deleted && (
                        <span className={`text-[10px] ${isMine ? 'text-brand-200' : 'text-white/40'} self-end italic leading-none`}>
                          {t('edited')}
                        </span>
                      )}
                    </div>
                      
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {msg.reactions.map(r => (
                          <button
                            key={r.emoji}
                            onClick={() => handleReact(msg.id, r.emoji)}
                            title={r.users.join(', ')}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                              r.reacted_by_me 
                                ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' 
                                : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {!msg.deleted && editingMessageId !== msg.id && (
                    <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all`}>
                      <div className="relative">
                        <button
                          onClick={() => setReactingToMessageId(reactingToMessageId === msg.id ? null : msg.id)}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                          title={t('reactMessage')}
                        >
                          <SmilePlus className="w-4 h-4" />
                        </button>
                        {reactingToMessageId === msg.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 bg-[#1a1a1a] border border-white/10 p-1 rounded-full shadow-xl z-50">
                            {EMOJIS.map(e => (
                              <button
                                key={e}
                                onClick={() => handleReact(msg.id, e)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-lg"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setReplyToMessage({ id: msg.id, sender_name: msg.user.full_name, content: msg.deleted ? null : msg.content })}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                        title={t('reply')}
                      >
                        <CornerUpLeft className="w-4 h-4" />
                      </button>
                      {isMine && Date.now() - new Date(msg.created_at).getTime() < 15 * 60 * 1000 && (
                        <button
                          onClick={() => { setEditingMessageId(msg.id); setEditingContent(msg.content || ''); }}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                          title={t('editMessage')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {isMine && (
                        <button
                          onClick={() => deleteMessageAction(conversationId, msg.id)}
                          className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                          title={t('deleteMessage')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Read receipts */}
                  {isLastMine && !conversation?.is_group && (
                    <div className="flex justify-end mt-1 items-center" title={
                      otherUser && readReceipts[otherUser.id] && new Date(msg.created_at) <= new Date(readReceipts[otherUser.id]) 
                        ? 'Đã xem' : 'Đã gửi'
                    }>
                      {(() => {
                        const isRead = otherUser && readReceipts[otherUser.id] && new Date(msg.created_at) <= new Date(readReceipts[otherUser.id]);
                        return isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-brand-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-white/40" />
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="shrink-0" />
      </div>

      {Object.keys(typingUsers).length > 0 && (
        <div className="px-6 py-2 shrink-0 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span>{formatTypingText(typingUsers)}</span>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
        <MessageForm 
          conversationId={conversationId} 
          subscriptionRef={subscriptionRef} 
          replyTo={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      </div>

      {isSearchOpen && (
        <MessageSearchModal 
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          conversationId={conversationId}
        />
      )}
    </>
  );
}
