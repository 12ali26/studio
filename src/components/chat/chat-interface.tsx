'use client';

import React, { useEffect, useRef, useState } from 'react';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage as ChatMessageComponent } from './chat-message';
import { ChatInput } from './chat-input';
import { useChatContext } from '@/contexts/chat-context';
import { MessageSender, ChatMessage } from '@/types/chat';
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
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Enhanced auto-scroll with user scroll detection
  useEffect(() => {
    if (shouldAutoScroll && isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isTyping, shouldAutoScroll, isNearBottom]);

  // Detect if user is near bottom of scroll area
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;
    
    setIsNearBottom(nearBottom);
    setShouldAutoScroll(nearBottom);
  };

  // Welcome message component with animation
  const WelcomeMessage = () => (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 text-center animate-in fade-in-50 duration-500">
      <div className="max-w-md space-y-4">
        <div className="text-4xl md:text-6xl mb-4 animate-in zoom-in-50 duration-700 delay-200">🤖</div>
        <h2 className="text-xl md:text-2xl font-semibold animate-in slide-in-from-bottom-4 duration-500 delay-300">
          Welcome to AI Chat
        </h2>
        <p className="text-muted-foreground text-sm md:text-base animate-in slide-in-from-bottom-4 duration-500 delay-400">
          Start a conversation with your AI assistant. Ask questions, get help with tasks, 
          or just have a friendly chat.
        </p>
        <div className="text-xs md:text-sm text-muted-foreground space-y-1 animate-in slide-in-from-bottom-4 duration-500 delay-500">
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
        <div 
          ref={scrollAreaRef} 
          className="h-full overflow-y-auto overflow-x-hidden"
          onScroll={handleScroll}
        >
          {shouldShowWelcome ? (
            <WelcomeMessage />
          ) : (
            <div className="pb-4 px-2 md:px-4">
              {/* Error Display */}
              {error && (
                <div className="p-3 md:p-4 m-2 md:m-4 bg-destructive/10 border border-destructive/20 rounded-lg animate-in slide-in-from-top-2 duration-300">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
              
              {/* Messages */}
              <div className="space-y-1">
                {messages.map((message: ChatMessage, index: number) => (
                  <div
                    key={message.id}
                    className="animate-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <ChatMessageComponent
                      message={message}
                      onEdit={message.sender === MessageSender.USER ? editMessage : undefined}
                      onDelete={deleteMessage}
                      onRegenerate={message.sender === MessageSender.AI ? regenerateMessage : undefined}
                    />
                  </div>
                ))}
              </div>
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-3 p-3 md:p-4">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <div className="h-4 w-4 rounded-full bg-primary/70" />
                    </div>
                    <div className="flex items-center gap-1 bg-secondary rounded-lg px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} className="h-px" />
            </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm sticky bottom-0">
        <ChatInput
          onSendMessage={sendMessage}
          status={status}
          isTyping={isTyping}
          placeholder="Type your message..."
          className="border-0"
        />
      </div>
    </div>
  );
}