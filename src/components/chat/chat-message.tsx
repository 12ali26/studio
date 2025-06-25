'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageReactions, useMessageReactions } from './message-reactions';
import { 
  MessageSender, 
  type ChatMessage as ChatMessageType 
} from '@/types/chat';
import {
  User,
  Bot,
  Copy,
  Edit3,
  Trash2,
  RotateCcw,
  Check,
  X,
  Clock,
  AlertCircle,
  Heart,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  showActions?: boolean;
}

export function ChatMessage({ 
  message, 
  onEdit, 
  onDelete, 
  onRegenerate,
  showActions = true 
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Reactions system
  const {
    addReaction,
    removeReaction,
    toggleFavorite,
    getReactions,
    isFavorited,
  } = useMessageReactions();

  // Track if component is mounted (client-side)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isUser = message.sender === MessageSender.USER;
  const isAI = message.sender === MessageSender.AI;
  const isSystem = message.sender === MessageSender.SYSTEM;

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle edit save
  const handleEditSave = () => {
    if (editContent.trim() !== message.content && onEdit) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'streaming':
        return <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  // Get avatar for message sender
  const getAvatar = () => {
    if (isUser) {
      return (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      );
    }
    
    if (isAI) {
      return (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      );
    }
    
    return null;
  };

  return (
    <div 
      id={`message-${message.id}`}
      className={cn(
        "group flex gap-2 md:gap-3 p-2 md:p-4 hover:bg-muted/30 transition-all duration-200",
        isUser && "flex-row-reverse",
        isSystem && "justify-center"
      )}
    >
      {/* Avatar - Hidden on mobile for cleaner look */}
      {!isSystem && !isUser && (
        <div className="flex-shrink-0 hidden md:block">
          {getAvatar()}
        </div>
      )}
      
      {/* Message Content */}
      <div className={cn(
        "flex flex-col space-y-1 max-w-[85%] md:max-w-[70%]",
        isUser && "items-end",
        isSystem && "items-center max-w-md mx-auto"
      )}>
        {/* Header - Simplified for mobile */}
        {!isSystem && (
          <div className={cn(
            "flex items-center gap-2 text-xs md:text-sm px-1",
            isUser && "flex-row-reverse"
          )}>
            {/* Sender Name - Only show on desktop or for AI */}
            {(!isUser || (isMounted && window.innerWidth >= 768)) && (
              <span className="font-medium text-muted-foreground">
                {isUser ? 'You' : isAI ? (message.model || 'AI') : 'System'}
              </span>
            )}
            
            {/* Metadata */}
            {message.metadata?.edited && (
              <Badge variant="outline" className="text-xs h-4">
                Edited
              </Badge>
            )}
            
            {/* Timestamp */}
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            
            {/* Status Icon */}
            {getStatusIcon()}
          </div>
        )}
        
        {/* Message Body */}
        <div className={cn(
          "relative",
          isUser && "flex justify-end"
        )}>
          {isEditing ? (
            // Edit Mode
            <div className="w-full space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={handleEditCancel}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleEditSave}>
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            // Display Mode - WhatsApp-style bubbles
            <div className={cn(
              "relative rounded-2xl px-3 md:px-4 py-2 md:py-3 shadow-sm",
              isUser 
                ? "bg-primary text-primary-foreground rounded-br-md" 
                : isAI 
                  ? "bg-secondary rounded-bl-md" 
                  : "bg-muted text-muted-foreground rounded-lg",
              message.status === 'error' && "border border-destructive",
              // Add subtle animation on appear
              "animate-in scale-in-95 duration-200"
            )}>
              {/* Message Content */}
              <div className={cn(
                "whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed",
                message.isStreaming && "after:content-['▋'] after:animate-pulse after:ml-1 after:text-primary"
              )}>
                {message.content || (message.isStreaming ? '' : 'No content')}
              </div>
              
              {/* Cost Info for AI messages - Compact on mobile */}
              {isAI && message.metadata?.cost && (
                <div className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/30 opacity-70">
                  <span className="hidden md:inline">
                    Cost: ${message.metadata.cost.toFixed(4)} • Tokens: {message.metadata.tokensUsed || 0}
                  </span>
                  <span className="md:hidden">
                    ${message.metadata.cost.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Message Reactions */}
        {!isEditing && !isSystem && (
          <div className={cn(
            "mt-2",
            isUser && "flex justify-end"
          )}>
            <MessageReactions
              messageId={message.id}
              reactions={getReactions(message.id)}
              onAddReaction={addReaction}
              onRemoveReaction={removeReaction}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(message.id)}
              className="animate-in fade-in-50 duration-300"
            />
          </div>
        )}
        
        {/* Actions - Mobile optimized */}
        {showActions && !isEditing && !isSystem && (
          <div className={cn(
            "flex gap-1 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-all duration-200",
            "md:opacity-0", // Hide by default on desktop, show on hover
            isUser && "flex-row-reverse"
          )}>
            {/* Copy */}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleCopy}
              className="h-6 w-6 md:h-8 md:w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            
            {/* Edit (User messages only) */}
            {isUser && onEdit && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 md:h-8 md:w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
            
            {/* Regenerate (AI messages only) */}
            {isAI && onRegenerate && message.status === 'completed' && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onRegenerate(message.id)}
                className="h-6 w-6 md:h-8 md:w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            
            {/* Delete */}
            {onDelete && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onDelete(message.id)}
                className="h-6 w-6 md:h-8 md:w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}