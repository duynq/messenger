'use client';

import React, { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, X, CornerUpLeft, Smile } from 'lucide-react';
import { sendMessageAction } from '@/actions/chat';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export function MessageForm({ 
  conversationId, 
  subscriptionRef,
  replyTo,
  onCancelReply
}: { 
  conversationId: number; 
  subscriptionRef?: React.RefObject<any>;
  replyTo?: { id: number, sender_name: string, content: string | null } | null;
  onCancelReply?: () => void;
}) {
  const t = useTranslations('chat');
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const lastTypingEmit = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const emitTyping = useCallback(() => {
    const now = Date.now();
    // Debounce: only emit once every 300ms
    if (now - lastTypingEmit.current < 300) return;
    lastTypingEmit.current = now;

    subscriptionRef?.current?.perform('typing');
  }, [subscriptionRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiObject: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + emojiObject.emoji + content.substring(end);

    setContent(newContent);
    setShowEmojiPicker(false);

    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emojiObject.emoji.length, start + emojiObject.emoji.length);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await sendMessageAction(conversationId, content, replyTo?.id);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        setContent(''); // Reset input on success
        onCancelReply?.();
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (e.target.value.trim()) {
      emitTyping();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {replyTo && (
        <div className="flex items-center justify-between bg-white/5 border-l-2 border-brand-500 rounded-lg px-3 py-2 text-sm max-w-full truncate">
          <div className="flex flex-col truncate overflow-hidden pr-2">
            <span className="text-brand-300 font-medium flex items-center gap-1"><CornerUpLeft className="w-3 h-3"/> {t('replyingTo')} {replyTo.sender_name}</span>
            <span className="text-white/60 truncate">{replyTo.content || t('messageDeleted')}</span>
          </div>
          <button 
            type="button" 
            onClick={onCancelReply} 
            className="p-1 hover:bg-white/10 rounded-full text-white/40 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative bg-white/5 border border-white/10 rounded-xl flex items-end">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder="Type your message..."
            className="flex-1 bg-transparent px-4 py-3 min-h-[48px] max-h-[150px] text-white placeholder:text-white/40 focus:outline-none resize-none block"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="shrink-0 p-2 relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title={t('insertEmoji')}
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-[-60px] sm:right-0 mb-2 z-50 shadow-2xl w-[calc(100vw-32px)] sm:w-[350px] max-w-[350px]">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme="dark"
                  searchDisabled={false}
                  skinTonesDisabled
                  lazyLoadEmojis
                  width="100%"
                />
              </div>
            )}
          </div>
        </div>
      <AnimatedButton 
        type="submit"
        disabled={isPending || !content.trim()}
        className="px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 border-0 flex items-center justify-center"
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : (
          <Send className="w-5 h-5 text-white" />
        )}
        </AnimatedButton>
      </div>
    </form>
  );
}
