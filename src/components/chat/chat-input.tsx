'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatStatus } from '@/types/chat';
import { Send, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  status: ChatStatus;
  isTyping?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ 
  onSendMessage, 
  status, 
  isTyping = false,
  placeholder = "Type your message...",
  disabled = false,
  className 
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === ChatStatus.CONNECTING || isTyping;
  const canSend = input.trim().length > 0 && !disabled && status !== ChatStatus.CONNECTING;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 200)}px`;
      setIsMultiline(scrollHeight > 60);
    }
  }, [input]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter: new line
        return;
      } else {
        // Enter: send message
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  // Stop generation (placeholder for future implementation)
  const handleStop = () => {
    // Future: implement stopping generation
    console.log('Stop generation requested');
  };

  return (
    <div className={cn("bg-background p-3 md:p-4", className)}>
      <form onSubmit={handleSubmit} className="flex gap-2 md:gap-3 items-end">
        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[44px] md:min-h-[60px] max-h-[120px] md:max-h-[200px] resize-none",
              "border-2 border-border/50 focus:border-primary/50 transition-all duration-200",
              "rounded-2xl px-3 md:px-4 py-2 md:py-3",
              "text-sm md:text-base leading-relaxed",
              "focus:ring-0 focus-visible:ring-0",
              isMultiline && "rounded-2xl"
            )}
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--muted-foreground)) transparent'
            }}
          />
          
          {/* Character count for long messages */}
          {input.length > 200 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/90 px-2 py-1 rounded-lg shadow-sm">
              {input.length}
            </div>
          )}
        </div>
        
        {/* Send/Stop Button */}
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleStop}
              className="h-10 w-10 md:h-12 md:w-12 rounded-full border-2"
            >
              {isTyping ? (
                <Square className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full transition-all duration-200",
                canSend 
                  ? "bg-primary hover:bg-primary/90 scale-100" 
                  : "bg-muted scale-95 opacity-50"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
      
      {/* Status indicator - Compact on mobile */}
      {isTyping && (
        <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-muted-foreground animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <span>AI is typing...</span>
        </div>
      )}
      
      {/* Helper text - Hidden on mobile when typing */}
      {!isTyping && (
        <div className="text-xs text-muted-foreground mt-2 flex flex-col md:flex-row justify-between gap-1">
          <span className="hidden md:inline">Press Enter to send, Shift + Enter for new line</span>
          <span className="md:hidden">Tap send or press Enter</span>
          {status === ChatStatus.ERROR && (
            <span className="text-destructive">Connection error - please try again</span>
          )}
        </div>
      )}
    </div>
  );
}