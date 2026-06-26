import { getTranslations } from 'next-intl/server';
import { serverFetchJson } from '@/lib/server-api';
import { AppNav } from '@/components/layout/AppNav';
import { GlassCard } from '@/components/ui/GlassCard';
import { MessageForm } from '@/components/chat/MessageForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

export default async function ChatRoomPage({
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  const conversationId = Number(resolvedParams.id);

  // Fetch both the current user (from dashboard API) and the messages in parallel
  const [dashboardData, messagesData] = await Promise.all([
    serverFetchJson<{ user: User }>('/dashboard'),
    serverFetchJson<{ messages: Message[], meta: any }>(`/conversations/${conversationId}/messages`).catch(() => ({ messages: [], meta: null }))
  ]);

  const currentUser = dashboardData.user;
  // Reverse messages so newest are at the bottom.
  // The API returns desc order (newest first), we want them asc (newest last) for chat UI.
  const messages = [...(messagesData.messages || [])].reverse();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav activePage="dashboard" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <h2 className="text-2xl font-bold text-white">
            Conversation #{conversationId}
          </h2>
        </div>

        <GlassCard className="flex-1 flex flex-col min-h-0 overflow-hidden border border-white/10 p-0 rounded-2xl">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-white/40">
                No messages yet. Send a message to start the conversation!
              </div>
            ) : (
              messages.map(msg => {
                const isMine = msg.user.email === currentUser.email;
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
                        <span className="text-xs text-white/40">{time}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm text-white shadow-sm ${isMine ? 'bg-brand-600 rounded-tr-sm' : 'bg-white/10 rounded-tl-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <MessageForm conversationId={conversationId} />
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
