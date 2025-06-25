'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  X,
  Clock,
  MessageSquare,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { ChatMessage, MessageSender } from '@/types/chat';
import { cn } from '@/lib/utils';

interface SearchResult {
  messageId: string;
  message: ChatMessage;
  relevanceScore: number;
  highlightedContent: string;
  context: {
    before: ChatMessage[];
    after: ChatMessage[];
  };
}

interface ConversationSearchProps {
  messages: ChatMessage[];
  onJumpToMessage?: (messageId: string) => void;
  className?: string;
}

export function ConversationSearch({ 
  messages, 
  onJumpToMessage,
  className 
}: ConversationSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSender, setSelectedSender] = useState<MessageSender | 'all'>('all');
  const [selectedResult, setSelectedResult] = useState<number>(0);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Search function with relevance scoring
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    messages.forEach((message, index) => {
      // Skip system messages if not specifically searching for them
      if (message.sender === MessageSender.SYSTEM && selectedSender !== MessageSender.SYSTEM) {
        return;
      }

      // Filter by sender
      if (selectedSender !== 'all' && message.sender !== selectedSender) {
        return;
      }

      const content = message.content.toLowerCase();
      
      // Check if query matches
      if (content.includes(query)) {
        // Calculate relevance score
        let score = 0;
        
        // Exact phrase match gets highest score
        if (content.includes(query)) score += 10;
        
        // Word boundary matches get higher score
        const words = query.split(' ');
        words.forEach(word => {
          if (word.length > 2 && content.includes(word)) {
            score += 5;
          }
        });
        
        // Position in message affects score (earlier = higher)
        const position = content.indexOf(query);
        if (position === 0) score += 3;
        else if (position < content.length * 0.3) score += 2;
        
        // Shorter messages with matches are more relevant
        if (message.content.length < 100) score += 1;
        
        // Recent messages get slight boost
        const messageTime = new Date(message.timestamp).getTime();
        const now = Date.now();
        const hoursAgo = (now - messageTime) / (1000 * 60 * 60);
        if (hoursAgo < 24) score += 1;

        // Create highlighted content
        const highlightedContent = highlightMatches(message.content, query);

        // Get context (2 messages before and after)
        const contextBefore = messages.slice(Math.max(0, index - 2), index);
        const contextAfter = messages.slice(index + 1, Math.min(messages.length, index + 3));

        results.push({
          messageId: message.id,
          message,
          relevanceScore: score,
          highlightedContent,
          context: {
            before: contextBefore,
            after: contextAfter,
          },
        });
      }
    });

    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [searchQuery, messages, selectedSender]);

  // Highlight matching text
  const highlightMatches = (text: string, query: string): string => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900 rounded px-1">$1</mark>');
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResult(prev => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResult(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const result = searchResults[selectedResult];
        if (result) {
          handleJumpToMessage(result.messageId);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, searchResults, selectedResult]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedResult(0);
  }, [searchResults]);

  // Handle jumping to message
  const handleJumpToMessage = (messageId: string) => {
    onJumpToMessage?.(messageId);
    setIsOpen(false);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="pl-10 pr-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center gap-2 h-6 px-2"
            >
              <Filter className="h-3 w-3" />
              <span className="text-xs">Filters</span>
              {isAdvancedOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {isAdvancedOpen && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedSender === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSender('all')}
                  className="h-6 px-3 text-xs"
                >
                  All Messages
                </Button>
                <Button
                  variant={selectedSender === MessageSender.USER ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSender(MessageSender.USER)}
                  className="h-6 px-3 text-xs"
                >
                  <User className="h-3 w-3 mr-1" />
                  Your Messages
                </Button>
                <Button
                  variant={selectedSender === MessageSender.AI ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSender(MessageSender.AI)}
                  className="h-6 px-3 text-xs"
                >
                  <Bot className="h-3 w-3 mr-1" />
                  AI Messages
                </Button>
              </div>
            )}
          </div>

          {/* Results Info */}
          {searchQuery && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {searchResults.length === 0 
                  ? 'No messages found' 
                  : `${searchResults.length} message${searchResults.length === 1 ? '' : 's'} found`
                }
              </span>
              {searchResults.length > 0 && (
                <span>Use ↑↓ to navigate, Enter to jump</span>
              )}
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div
                  key={result.messageId}
                  onClick={() => handleJumpToMessage(result.messageId)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                    index === selectedResult 
                      ? "bg-primary/10 border-primary/30" 
                      : "hover:bg-muted/50 border-border/50"
                  )}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.message.sender === MessageSender.USER ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Bot className="h-4 w-4 text-secondary-foreground" />
                      )}
                      <span className="font-medium text-sm">
                        {result.message.sender === MessageSender.USER ? 'You' : 'AI'}
                      </span>
                      <Badge variant="outline" className="text-xs h-4">
                        {result.relevanceScore}% match
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(result.message.timestamp)}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div 
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
                  />

                  {/* Context Preview */}
                  {(result.context.before.length > 0 || result.context.after.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <div className="text-xs text-muted-foreground space-y-1">
                        {result.context.before.map((msg, i) => (
                          <div key={i} className="truncate">
                            <span className="font-medium">
                              {msg.sender === MessageSender.USER ? 'You' : 'AI'}:
                            </span>
                            <span className="ml-1">{msg.content.substring(0, 50)}...</span>
                          </div>
                        ))}
                        <div className="font-medium text-primary">→ Found message</div>
                        {result.context.after.map((msg, i) => (
                          <div key={i} className="truncate">
                            <span className="font-medium">
                              {msg.sender === MessageSender.USER ? 'You' : 'AI'}:
                            </span>
                            <span className="ml-1">{msg.content.substring(0, 50)}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {searchResults.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages found for "{searchQuery}"</p>
                  <p className="text-sm mt-1">Try different keywords or check your filters</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}