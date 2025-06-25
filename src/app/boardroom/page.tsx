import { Header } from '@/components/layout/header'
import { EnhancedDebateView } from '@/components/boardroom/enhanced-debate-view'
import { DebateProvider } from '@/contexts/debate-context'
import { TestNavigation } from '@/components/layout/test-nav'

export default function BoardroomPage() {
  return (
    <DebateProvider>
      <div className="flex h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="p-4 flex justify-center">
            <TestNavigation />
          </div>
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
