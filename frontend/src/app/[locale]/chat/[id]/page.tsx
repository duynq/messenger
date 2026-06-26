import React from 'react';
import { AppNav } from '@/components/layout/AppNav';
import { GlassCard } from '@/components/ui/GlassCard';
import { MessageCircle } from 'lucide-react';

export default async function ChatPlaceholderPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  return (
    <div className="min-h-screen bg-background">
      <AppNav activePage="dashboard" />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 h-[calc(100vh-80px)]">
        <GlassCard className="w-full h-full flex flex-col items-center justify-center p-8 text-center border-dashed">
          <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mb-6">
            <MessageCircle className="w-10 h-10 text-brand-400" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3 text-white">
            Conversation Created!
          </h2>
          
          <p className="text-white/60 max-w-md mx-auto mb-8">
            You have successfully created or jumped to Conversation #{resolvedParams.id}. 
            The real-time chat interface will be implemented in the next phase.
          </p>
          
          <div className="text-sm font-mono bg-white/5 py-2 px-4 rounded-lg text-brand-300">
            /chat/{resolvedParams.id}
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
