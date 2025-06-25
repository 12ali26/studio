'use client';

import React from 'react';
import { SignIn, SignUp } from '@stackframe/stack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StackAuthProps {
  onSuccess?: () => void;
}

export function StackAuth({ onSuccess }: StackAuthProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A192F] p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Welcome to ConsensusAI
          </CardTitle>
          <CardDescription className="text-white/70">
            Sign in to start your AI-powered conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger 
                value="signin" 
                className="text-white data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="text-white data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="rounded-lg overflow-hidden">
                <SignIn />
              </div>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="rounded-lg overflow-hidden">
                <SignUp />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Alternative simpler version without tabs
export function StackAuthSimple({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A192F] p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Welcome to ConsensusAI
          </CardTitle>
          <CardDescription className="text-white/70">
            {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden">
            {mode === 'signin' ? <SignIn /> : <SignUp />}
          </div>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}