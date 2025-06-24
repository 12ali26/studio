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
    <div className={cn("border-t bg-background p-4", className)}>
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
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
              "min-h-[60px] max-h-[200px] resize-none pr-12",
              "focus:ring-2 focus:ring-primary/20",
              isMultiline && "rounded-lg"
            )}
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--muted-foreground)) transparent'
            }}
          />
          
          {/* Character count for long messages */}
          {input.length > 200 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-1 rounded">
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
              className="h-12 w-12"
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
              className="h-12 w-12"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
      
      {/* Status indicator */}
      {isTyping && (
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <span>AI is typing...</span>
        </div>
      )}
      
      {/* Helper text */}
      <div className="text-xs text-muted-foreground mt-2 flex justify-between">
        <span>Press Enter to send, Shift + Enter for new line</span>
        {status === ChatStatus.ERROR && (
          <span className="text-destructive">Connection error - please try again</span>
        )}
      </div>
    </div>
  );
}