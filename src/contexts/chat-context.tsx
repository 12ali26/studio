'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useChatState } from '@/hooks/use-chat-state';
import { type ChatConfig, type UseChatState } from '@/types/chat';

// Create context
const ChatContext = createContext<UseChatState | undefined>(undefined);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
  initialConfig?: Partial<ChatConfig>;
}

export function ChatProvider({ children, initialConfig }: ChatProviderProps) {
  const chatState = useChatState(initialConfig);
  
  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use the chat context
export function useChatContext(): UseChatState {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
}

// HOC for wrapping components with chat context
export function withChatContext<P extends object>(
  Component: React.ComponentType<P>,
  initialConfig?: Partial<ChatConfig>
) {
  return function ChatContextComponent(props: P) {
    return (
      <ChatProvider initialConfig={initialConfig}>
        <Component {...props} />
      </ChatProvider>
    );
  };
}