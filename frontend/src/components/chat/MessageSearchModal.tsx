'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, MessageSquare, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchMessagesAction } from '@/actions/chat';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { useTranslations } from 'next-intl';

interface SearchResult {
  id: number;
  conversation_id: number;
  content: string;
  snippet: string | null;
  created_at: string;
  user: {
    id: number;
    full_name: string;
    avatar_url: string | null;
  };
}

interface MessageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: number; // Optional. If provided, restrict search to this conversation.
}

export function MessageSearchModal({ isOpen, onClose, conversationId }: MessageSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useTranslations('common');
  const tChat = useTranslations('chat');

  // Focus input when modal opens and handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.addEventListener('keydown', handleKeyDown);
    } else {
      setSearchQuery('');
      setResults([]);
      setPage(1);
      setHasMore(false);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (debouncedQuery.trim().length === 0) {
      setResults([]);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        const data = await searchMessagesAction(debouncedQuery, 1, conversationId);
        if (data.messages) {
          setResults(data.messages);
          setPage(1);
          setHasMore(data.meta?.has_next ?? false);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitial();
  }, [debouncedQuery, isOpen, conversationId]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoading) {
      setIsLoading(true);
      const nextPage = page + 1;
      
      try {
        const data = await searchMessagesAction(debouncedQuery, nextPage, conversationId);
        if (data.messages && data.messages.length > 0) {
          setResults(prev => [...prev, ...data.messages]);
          setPage(nextPage);
          setHasMore(data.meta?.has_next ?? false);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to fetch more results", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onClose();
    // Navigate to the conversation and append hash to scroll to the message
    router.push(`/chat/${result.conversation_id}#message-${result.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#111111] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[70vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header / Search Input */}
        <div className="flex items-center p-2 border-b border-white/10 bg-white/5">
          <div className="pl-3 pr-2 text-white/50">
            <Search className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={conversationId ? tChat('searchPlaceholderLocal') : tChat('searchPlaceholderGlobal')}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/40 h-12 text-base px-2"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-2 text-white/40 hover:text-white rounded-lg transition-colors mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors mr-2 text-sm font-medium"
          >
            <span className="hidden sm:inline">Esc</span>
            <span className="sm:hidden">{t('cancel')}</span>
          </button>
        </div>

        {/* Results Area */}
        <div 
          className="flex-1 overflow-y-auto bg-[#111111] hide-scrollbar"
          onScroll={handleScroll}
        >
          {searchQuery.trim() === '' ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/30">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p>{tChat('searchEmptyTitle')}</p>
            </div>
          ) : isLoading && page === 1 ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex justify-center items-center h-48 text-white/50 text-sm">
              {tChat('searchNoResults', { query: searchQuery })}
            </div>
          ) : (
            <div className="flex flex-col">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="flex flex-col w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-1 gap-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-brand-500/20 shrink-0 overflow-hidden flex items-center justify-center">
                        {result.user.avatar_url ? (
                          <img src={result.user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-brand-300 font-medium">
                            {result.user.full_name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-white truncate">
                        {result.user.full_name}
                      </span>
                      {!conversationId && (
                        <span className="text-xs text-white/30 truncate flex items-center">
                          <ChevronRight className="w-3 h-3 mx-1" />
                          Chat #{result.conversation_id}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/40 shrink-0 whitespace-nowrap">
                      {format(new Date(result.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  
                  {/* Snippet with highlighted text */}
                  {result.snippet ? (
                    <p 
                      className="text-sm text-white/70 pl-8 pr-4 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.snippet) }}
                    />
                  ) : (
                    <p className="text-sm text-white/70 pl-8 pr-4 line-clamp-2">
                      {result.content}
                    </p>
                  )}
                </button>
              ))}
              
              {isLoading && page > 1 && (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
