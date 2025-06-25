import type {Metadata} from 'next';
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { StackUserProvider } from '@/contexts/stack-user-context';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'ConsensusAI',
  description: 'AI-powered business decision making',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen bg-[#0A192F]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            }>
              <StackUserProvider>
                {children}
                <Toaster />
              </StackUserProvider>
            </Suspense>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
