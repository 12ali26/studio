'use client';

import { Header } from '@/components/layout/header'
import { EnhancedDebateView } from '@/components/boardroom/enhanced-debate-view'
import { DebateProvider } from '@/contexts/debate-context'
import { StackAuth } from '@/components/auth/stack-auth';
import { useStackUserContext } from '@/contexts/stack-user-context';
import { Loader2 } from 'lucide-react';

export default function BoardroomPage() {
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

  return (
    <DebateProvider>
      <div className="flex h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden flex justify-center">
            <div className="w-full max-w-7xl">
              <EnhancedDebateView />
            </div>
          </div>
        </main>
      </div>
    </DebateProvider>
  )
}
