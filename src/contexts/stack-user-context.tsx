'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser as useStackUser } from '@stackframe/stack';
import { UserQueries } from '@/lib/db/queries';

interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  subscriptionTier: 'starter' | 'professional' | 'boardroom' | 'enterprise';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    defaultModel: string;
    defaultTemperature: string;
    defaultMaxTokens: number;
    defaultSystemPrompt?: string;
    theme: string;
    language: string;
    notifications: {
      email?: boolean;
      browser?: boolean;
      usage?: boolean;
      billing?: boolean;
    };
  };
}

interface StackUserContextType {
  user: DatabaseUser | null;
  stackUser: any; // Stack Auth user object
  loading: boolean;
  error: string | null;
  signOut: () => void;
  updateUser: (updates: Partial<DatabaseUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const StackUserContext = createContext<StackUserContextType | undefined>(undefined);

export function useStackUserContext() {
  const context = useContext(StackUserContext);
  if (context === undefined) {
    throw new Error('useStackUserContext must be used within a StackUserProvider');
  }
  return context;
}

interface StackUserProviderProps {
  children: ReactNode;
}

export function StackUserProvider({ children }: StackUserProviderProps) {
  const [user, setUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const stackUser = useStackUser();

  // Sync Stack Auth user with our database using API
  const syncUserToDatabase = async (stackUserData: any) => {
    if (!stackUserData?.primaryEmail || !stackUserData?.displayName) {
      return null;
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: stackUserData.primaryEmail,
        name: stackUserData.displayName,
        avatarUrl: stackUserData.profileImageUrl || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync user to database');
    }

    const result = await response.json();
    return result.user;
  };

  // Load user when Stack Auth user changes
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError(null);

        if (stackUser) {
          const dbUser = await syncUserToDatabase(stackUser);
          setUser(dbUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [stackUser]);

  const signOut = async () => {
    try {
      await stackUser?.signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const updateUser = async (updates: Partial<DatabaseUser>) => {
    if (!user) return;

    try {
      setError(null);
      
      // Update user via API (to be implemented)
      // For now, just update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Update user error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw err;
    }
  };

  const refreshUser = async () => {
    if (stackUser) {
      try {
        const dbUser = await syncUserToDatabase(stackUser);
        setUser(dbUser);
      } catch (err) {
        console.error('Error refreshing user:', err);
        setError(err instanceof Error ? err.message : 'Failed to refresh user data');
      }
    }
  };

  const value: StackUserContextType = {
    user,
    stackUser,
    loading,
    error,
    signOut,
    updateUser,
    refreshUser,
  };

  return (
    <StackUserContext.Provider value={value}>
      {children}
    </StackUserContext.Provider>
  );
}
