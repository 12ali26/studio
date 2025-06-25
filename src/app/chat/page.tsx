'use client';

import { ChatPageStack } from '@/components/chat/chat-page-stack';
import { StackAuth } from '@/components/auth/stack-auth';
import { useStackUserContext } from '@/contexts/stack-user-context';
import { Loader2 } from 'lucide-react';

export default function Chat() {
  const { user, loading } = useStackUserContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A192F]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    return <StackAuth />;
  }

  return <ChatPageStack />;
}