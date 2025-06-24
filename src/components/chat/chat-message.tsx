'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
    <div className={cn(
      "group flex gap-3 p-4 hover:bg-muted/50 transition-colors",
      isUser && "flex-row-reverse",
      isSystem && "justify-center"
    )}>
      {/* Avatar */}
      {!isSystem && (
        <div className="flex-shrink-0">
          {getAvatar()}
        </div>
      )}
      
      {/* Message Content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser && "text-right",
        isSystem && "text-center max-w-md"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 text-sm",
          isUser && "justify-end"
        )}>
          {/* Sender Name */}
          <span className="font-medium">
            {isUser ? 'You' : isAI ? (message.model || 'AI') : 'System'}
          </span>
          
          {/* Metadata */}
          {message.metadata?.edited && (
            <Badge variant="outline" className="text-xs">
              Edited
            </Badge>
          )}
          
          {/* Status Icon */}
          {getStatusIcon()}
          
          {/* Timestamp */}
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
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
            // Display Mode
            <div className={cn(
              "relative rounded-lg px-4 py-3 max-w-[80%]",
              isUser 
                ? "bg-primary text-primary-foreground ml-auto" 
                : isAI 
                  ? "bg-secondary" 
                  : "bg-muted text-muted-foreground",
              message.status === 'error' && "border border-destructive"
            )}>
              {/* Message Content */}
              <div className={cn(
                "whitespace-pre-wrap break-words",
                message.isStreaming && "after:content-['▋'] after:animate-pulse after:ml-1"
              )}>
                {message.content || (message.isStreaming ? '' : 'No content')}
              </div>
              
              {/* Cost Info for AI messages */}
              {isAI && message.metadata?.cost && (
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  Cost: ${message.metadata.cost.toFixed(4)} • 
                  Tokens: {message.metadata.tokensUsed || 0}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions */}
        {showActions && !isEditing && !isSystem && (
          <div className={cn(
            "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser && "justify-end"
          )}>
            {/* Copy */}
            <Button size="sm" variant="ghost" onClick={handleCopy}>
              {copied ? (
                <Check className="h-3 w-3" />
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