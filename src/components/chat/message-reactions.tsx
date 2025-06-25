'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Heart, Star, ThumbsUp, ThumbsDown, Smile, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Common emoji reactions
const QUICK_REACTIONS = [
  { emoji: '👍', name: 'thumbs_up', icon: ThumbsUp },
  { emoji: '👎', name: 'thumbs_down', icon: ThumbsDown },
  { emoji: '❤️', name: 'heart', icon: Heart },
  { emoji: '⭐', name: 'star', icon: Star },
  { emoji: '😊', name: 'smile', icon: Smile },
  { emoji: '🎉', name: 'party', icon: null },
  { emoji: '🔥', name: 'fire', icon: null },
  { emoji: '💯', name: 'hundred', icon: null },
];

// Extended emoji categories
const EMOJI_CATEGORIES = {
  emotions: {
    name: 'Emotions',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐']
  },
  gestures: {
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏']
  },
  symbols: {
    name: 'Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '⭐', '🌟', '💫', '⚡', '💥', '💢', '💨', '💤', '💦', '💧', '🔥', '💯']
  }
};

interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
  userReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  reactions?: MessageReaction[];
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onToggleFavorite?: (messageId: string) => void;
  isFavorited?: boolean;
  className?: string;
}

export function MessageReactions({
  messageId,
  reactions = [],
  onAddReaction,
  onRemoveReaction,
  onToggleFavorite,
  isFavorited = false,
  className
}: MessageReactionsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('emotions');

  // Handle reaction click
  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    
    if (existingReaction?.userReacted) {
      onRemoveReaction?.(messageId, emoji);
    } else {
      onAddReaction?.(messageId, emoji);
    }
  };

  // Handle emoji picker selection
  const handleEmojiSelect = (emoji: string) => {
    handleReactionClick(emoji);
    setIsPickerOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {/* Existing Reactions */}
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant={reaction.userReacted ? "default" : "outline"}
          size="sm"
          onClick={() => handleReactionClick(reaction.emoji)}
          className={cn(
            "h-6 px-2 text-xs rounded-full transition-all duration-200",
            reaction.userReacted && "bg-primary/20 text-primary border-primary/30"
          )}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}

      {/* Favorite Button */}
      {onToggleFavorite && (
        <Button
          variant={isFavorited ? "default" : "ghost"}
          size="sm"
          onClick={() => onToggleFavorite(messageId)}
          className={cn(
            "h-6 w-6 p-0 rounded-full transition-all duration-200",
            isFavorited && "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
          )}
        >
          <Star className={cn("h-3 w-3", isFavorited && "fill-current")} />
        </Button>
      )}

      {/* Add Reaction Button */}
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full hover:bg-muted transition-colors duration-200"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          {/* Quick Reactions */}
          <div className="mb-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Quick Reactions</div>
            <div className="flex gap-1 flex-wrap">
              {QUICK_REACTIONS.map((reaction) => (
                <Button
                  key={reaction.emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmojiSelect(reaction.emoji)}
                  className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors duration-200"
                >
                  <span className="text-lg">{reaction.emoji}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="border-t pt-3">
            <div className="flex gap-1 mb-3">
              {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(key as keyof typeof EMOJI_CATEGORIES)}
                  className="text-xs px-2 h-6"
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
              {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors duration-200"
                >
                  <span className="text-base">{emoji}</span>
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Hook for managing message reactions
export function useMessageReactions() {
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load from localStorage on mount (client-side only)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const storedReactions = localStorage.getItem('message_reactions');
      const storedFavorites = localStorage.getItem('message_favorites');
      
      if (storedReactions) {
        setReactions(JSON.parse(storedReactions));
      }
      
      if (storedFavorites) {
        setFavorites(new Set(JSON.parse(storedFavorites)));
      }
    } catch (error) {
      console.error('Failed to load reactions from storage:', error);
    }
  }, []);

  // Save to localStorage when reactions change (client-side only)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('message_reactions', JSON.stringify(reactions));
    } catch (error) {
      console.error('Failed to save reactions to storage:', error);
    }
  }, [reactions]);

  // Save to localStorage when favorites change (client-side only)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('message_favorites', JSON.stringify(Array.from(favorites)));
    } catch (error) {
      console.error('Failed to save favorites to storage:', error);
    }
  }, [favorites]);

  const addReaction = (messageId: string, emoji: string) => {
    setReactions(prev => {
      const messageReactions = prev[messageId] || [];
      const existingReaction = messageReactions.find(r => r.emoji === emoji);
      
      if (existingReaction) {
        // Add user to existing reaction
        return {
          ...prev,
          [messageId]: messageReactions.map(r =>
            r.emoji === emoji
              ? { 
                  ...r, 
                  count: r.count + 1, 
                  userReacted: true,
                  users: [...r.users, 'current-user']
                }
              : r
          )
        };
      } else {
        // Create new reaction
        return {
          ...prev,
          [messageId]: [
            ...messageReactions,
            {
              emoji,
              count: 1,
              users: ['current-user'],
              userReacted: true
            }
          ]
        };
      }
    });
  };

  const removeReaction = (messageId: string, emoji: string) => {
    setReactions(prev => {
      const messageReactions = prev[messageId] || [];
      
      return {
        ...prev,
        [messageId]: messageReactions
          .map(r =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: Math.max(0, r.count - 1),
                  userReacted: false,
                  users: r.users.filter(u => u !== 'current-user')
                }
              : r
          )
          .filter(r => r.count > 0)
      };
    });
  };

  const toggleFavorite = (messageId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(messageId)) {
        newFavorites.delete(messageId);
      } else {
        newFavorites.add(messageId);
      }
      return newFavorites;
    });
  };

  const getReactions = (messageId: string) => reactions[messageId] || [];
  const isFavorited = (messageId: string) => favorites.has(messageId);

  return {
    addReaction,
    removeReaction,
    toggleFavorite,
    getReactions,
    isFavorited,
  };
}