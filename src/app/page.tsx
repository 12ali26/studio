import { redirect } from 'next/navigation'

// Temporarily bypass authentication for development/testing
export default function HomePage() {
  // Comment out the auth page and redirect directly to boardroom
  redirect('/boardroom')
}

/* 
// Original Auth Page - Disabled for testing
import { UserAuthForm } from '@/components/auth/user-auth-form'
import { BrainCircuit } from 'lucide-react'

export default function AuthenticationPage() {
  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage:
              'url(https://placehold.co/1200x900/0A192F/1E3A8A.png)',
            backgroundBlendMode: 'overlay',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          data-ai-hint="abstract technology"
        />
        <div className="relative z-20 flex items-center text-lg font-medium font-headline">
          <BrainCircuit className="mr-2 h-8 w-8" />
          ConsensusAI
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg font-body">
              &ldquo;Harnessing collective intelligence to forge the future of
              business strategy. Welcome to the boardroom of tomorrow.&rdquo;
            </p>
            <footer className="text-sm">The ConsensusAI Team</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex h-full items-center p-4 lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight font-headline">
              Join the Boardroom
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to start your AI-driven debate
            </p>
          </div>
          <UserAuthForm />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{' '}
            <a
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
*/
