'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
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

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, name: string, avatarUrl?: string) => Promise<void>;
  signOut: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('consensusai_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          // Verify user still exists in database
          const response = await fetch(`/api/users?id=${userData.id}`);
          if (response.ok) {
            const result = await response.json();
            setUser(result.user.user || result.user);
          } else {
            // User no longer exists, clear localStorage
            localStorage.removeItem('consensusai_user');
          }
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, name: string, avatarUrl?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, avatarUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to sign in');
      }

      const result = await response.json();
      const userData = result.user;

      // Store user in localStorage
      localStorage.setItem('consensusai_user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('consensusai_user');
    setUser(null);
    setError(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      setError(null);
      
      // Optimistically update local state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('consensusai_user', JSON.stringify(updatedUser));

      // TODO: Implement user update API endpoint
      // const response = await fetch(`/api/users/${user.id}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(updates),
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to update user');
      // }

    } catch (err) {
      console.error('Update user error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
      // Revert optimistic update on error
      setUser(user);
      localStorage.setItem('consensusai_user', JSON.stringify(user));
      throw err;
    }
  };

  const value: UserContextType = {
    user,
    loading,
    error,
    signIn,
    signOut,
    updateUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}