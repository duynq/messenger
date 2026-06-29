'use client';

import React, { useState, useTransition, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { sendMessageAction } from '@/actions/chat';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { toast } from 'sonner';

export function MessageForm({ conversationId, subscriptionRef }: { conversationId: number; subscriptionRef?: React.RefObject<any> }) {
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const lastTypingEmit = useRef<number>(0);

  const emitTyping = useCallback(() => {
    const now = Date.now();
    // Debounce: only emit once every 300ms
    if (now - lastTypingEmit.current < 300) return;
    lastTypingEmit.current = now;

    subscriptionRef?.current?.perform('typing');
  }, [subscriptionRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await sendMessageAction(conversationId, content);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        setContent(''); // Reset input on success
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
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <div className="flex-1">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Type your message..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none block"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
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
    </form>
  );
}
