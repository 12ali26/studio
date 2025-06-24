'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { type ChatConversation } from '@/types/chat';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Calendar,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  currentConversation: ChatConversation | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  className?: string;
}

export function ChatSidebar({
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  className,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);

  // Load conversations from localStorage
  const loadConversations = () => {
    try {
      const stored = localStorage.getItem('chat_conversations');
      if (stored) {
        const conversationsObj = JSON.parse(stored);
        const conversationsList = Object.values(conversationsObj) as ChatConversation[];
        // Sort by most recent first
        conversationsList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setConversations(conversationsList);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Filter conversations based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.messages.some(msg => 
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchTerm]);

  // Load conversations on mount and set up storage listener
  useEffect(() => {
    loadConversations();
    
    // Listen for storage changes to update conversations list
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chat_conversations') {
        loadConversations();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also reload periodically to catch local changes
    const interval = setInterval(loadConversations, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Delete conversation
  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const stored = localStorage.getItem('chat_conversations');
      if (stored) {
        const conversationsObj = JSON.parse(stored);
        delete conversationsObj[conversationId];
        localStorage.setItem('chat_conversations', JSON.stringify(conversationsObj));
        loadConversations();
        
        if (onDeleteConversation) {
          onDeleteConversation(conversationId);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get conversation preview (first user message or title)
  const getConversationPreview = (conv: ChatConversation) => {
    const userMessages = conv.messages.filter(msg => msg.sender === 'user');
    if (userMessages.length > 0) {
      return userMessages[0].content.slice(0, 100) + (userMessages[0].content.length > 100 ? '...' : '');
    }
    return conv.title;
  };

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 border-r", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Conversations</h2>
          <Button size="sm" onClick={onNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? (
                <div>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations found</p>
                </div>
              ) : (
                <div>
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new chat to begin</p>
                </div>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "group p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted",
                  currentConversation?.id === conv.id && "bg-primary/10 border border-primary/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-medium truncate">
                      {conv.title}
                    </h3>
                    
                    {/* Preview */}
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {getConversationPreview(conv)}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {conv.messages.length} messages
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(conv.updatedAt)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {onDeleteConversation && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>{conversations.length} total conversations</span>
        </div>
      </div>
    </div>
  );
}