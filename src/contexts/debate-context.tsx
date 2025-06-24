'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDebateState, type UseDebateState } from '@/hooks/use-debate-state';

// Create context
const DebateContext = createContext<UseDebateState | undefined>(undefined);

// Provider component
interface DebateProviderProps {
  children: ReactNode;
}

export function DebateProvider({ children }: DebateProviderProps) {
  const debateState = useDebateState();
  
  return (
    <DebateContext.Provider value={debateState}>
      {children}
    </DebateContext.Provider>
  );
}

// Custom hook to use the debate context
export function useDebateContext(): UseDebateState {
  const context = useContext(DebateContext);
  
  if (context === undefined) {
    throw new Error('useDebateContext must be used within a DebateProvider');
  }
  
  return context;
}

// HOC for wrapping components with debate context
export function withDebateContext<P extends object>(
  Component: React.ComponentType<P>
) {
  return function DebateContextComponent(props: P) {
    return (
      <DebateProvider>
        <Component {...props} />
      </DebateProvider>
    );
  };
}