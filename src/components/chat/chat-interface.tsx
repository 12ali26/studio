'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { useChatContext } from '@/contexts/chat-context';
import { MessageSender } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  className?: string;
  showWelcome?: boolean;
}

export function ChatInterface({ className, showWelcome = true }: ChatInterfaceProps) {
  const {
    messages,
    status,
    isTyping,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    regenerateMessage,
  } = useChatContext();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Welcome message component
  const WelcomeMessage = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-md space-y-4">
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-2xl font-semibold">Welcome to AI Chat</h2>
        <p className="text-muted-foreground">
          Start a conversation with your AI assistant. Ask questions, get help with tasks, 
          or just have a friendly chat.
        </p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Real-time streaming responses</p>
          <p>• Edit and regenerate messages</p>
          <p>• Conversation history saved automatically</p>
        </div>
      </div>
    </div>
  );

  // Empty state when no messages
  const shouldShowWelcome = showWelcome && messages.length === 0;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          {shouldShowWelcome ? (
            <WelcomeMessage />
          ) : (
            <div className="pb-4">
              {/* Error Display */}
              {error && (
                <div className="p-4 m-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
              
              {/* Messages */}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onEdit={message.sender === MessageSender.USER ? editMessage : undefined}
                  onDelete={deleteMessage}
                  onRegenerate={message.sender === MessageSender.AI ? regenerateMessage : undefined}
                />
              ))}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Input Area */}
      <ChatInput
        onSendMessage={sendMessage}
        status={status}
        isTyping={isTyping}
        placeholder="Type your message..."
      />
    </div>
  );
}