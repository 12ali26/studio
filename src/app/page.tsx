import { redirect } from 'next/navigation'

// The chat page is now the main entry point for the application.
// It handles authentication via Stack Auth.
export default function HomePage() {
  redirect('/chat')
}
