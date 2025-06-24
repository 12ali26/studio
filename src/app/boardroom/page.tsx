import { Header } from '@/components/layout/header'
import { DebateView } from '@/components/boardroom/debate-view'

export default function BoardroomPage() {
  return (
    <div className="flex h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col overflow-hidden">
        <DebateView />
      </main>
    </div>
  )
}
