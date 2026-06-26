import { getTranslations } from 'next-intl/server';
import { serverFetchJson } from '@/lib/server-api';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';

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
  const [dashboardData, messagesData, usersData] = await Promise.all([
    serverFetchJson<{ user: User }>('/dashboard'),
    serverFetchJson<{ messages: Message[], meta: any, conversation: any }>(`/conversations/${conversationId}/messages`).catch(() => ({ messages: [], meta: null, conversation: null })),
    serverFetchJson<{ users: User[] }>('/users').catch(() => ({ users: [] }))
  ]);

  const currentUser = dashboardData.user;
  const conversation = messagesData.conversation;
  const availableUsers = usersData.users || [];

  // Reverse messages so newest are at the bottom.
  // The API returns desc order (newest first), we want them asc (newest last) for chat UI.
  const messages = [...(messagesData.messages || [])].reverse();
  
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const chatTitle = conversation?.is_group && conversation?.name
    ? conversation.name
    : `Conversation #${conversationId}`;

  return (
    <AppLayout activePage="dashboard" title={chatTitle}>
      <div className="flex-1 max-w-4xl mx-auto w-full px-2 sm:px-4 md:px-6 py-4 md:py-6 flex flex-col h-full md:h-[calc(100vh-2rem)]">
        <div className="hidden md:flex items-center gap-4 mb-6">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10 shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <h2 className="text-2xl font-bold text-white truncate">
            {chatTitle}
          </h2>
        </div>

        <GlassCard className="flex-1 flex flex-col min-h-0 overflow-hidden border-0 sm:border sm:border-white/10 p-0 sm:rounded-2xl rounded-none bg-background sm:bg-white/5">
          <ChatMessages 
            initialMessages={messages} 
            conversationId={conversationId} 
            currentUser={currentUser} 
            token={token}
            conversation={conversation}
            availableUsers={availableUsers}
          />
        </GlassCard>
      </div>
    </AppLayout>
  );
}
