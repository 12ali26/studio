'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPersonaByName } from '@/lib/personas';
import type { DebateMessage } from '@/hooks/use-debate-state';

interface EnhancedAgentCardProps {
  message: DebateMessage;
  isActive?: boolean;
  onReact?: (messageId: string, reaction: 'agree' | 'disagree') => void;
  onCopy?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
}

export function EnhancedAgentCard({ 
  message, 
  isActive = false,
  onReact,
  onCopy,
  onShare,
}: EnhancedAgentCardProps) {
  const persona = getPersonaByName(message.persona);
  const isUser = message.persona === 'You';
  const isSystem = message.persona === 'System';

  // Get status display
  const getStatusIcon = () => {
    switch (message.status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'streaming':
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Handle copy message
  const handleCopy = () => {
    navigator.clipboard.writeText(message.message);
    onCopy?.(message.id);
  };

  // Handle share message
  const handleShare = () => {
    onShare?.(message.id);
  };

  return (
    <div className={cn(
      "group relative flex items-start gap-3 p-4",
      isActive && "bg-muted/50 ring-2 ring-primary/20",
      isUser && "flex-row-reverse",
      message.status === 'error' && "bg-red-50 dark:bg-red-950/20"
    )}>
      {/* Avatar */}
      <Avatar className={cn(
        "h-10 w-10 border-2",
        isActive && "ring-2 ring-primary ring-offset-2",
        isUser && "bg-primary text-primary-foreground border-primary",
        isSystem && "bg-muted text-muted-foreground border-muted"
      )}>
        <AvatarFallback>
          {persona?.icon || (
            <span className="text-sm font-bold">
              {message.persona.charAt(0)}
            </span>
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser && "items-end"
      )}>
        {/* Header with persona info and status */}
        <div className={cn(
          "flex items-center gap-2",
          isUser && "justify-end"
        )}>
          <div className={cn(
            "flex items-center gap-2",
            isUser && "flex-row-reverse"
          )}>
            <div className={cn(
              "text-sm font-medium",
              isUser && "text-right"
            )}>
              {message.persona}
            </div>
            
            {persona && !isUser && !isSystem && (
              <Badge variant="outline" className="text-xs">
                {persona.title}
              </Badge>
            )}

            {getStatusIcon()}
          </div>

          {/* Round and turn info */}
          {message.round > 0 && (
            <Badge variant="secondary" className="text-xs">
              R{message.round}T{message.turn}
            </Badge>
          )}

          {/* Confidence indicator */}
          {message.confidence && (
            <div className={cn(
              "text-xs flex items-center gap-1",
              getConfidenceColor(message.confidence)
            )}>
              {message.confidence >= 70 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {message.confidence}%
            </div>
          )}
        </div>

        {/* Message bubble */}
        <Card className={cn(
          "max-w-[75%] transition-all duration-200",
          isUser && "ml-auto bg-primary text-primary-foreground",
          isActive && "shadow-md",
          message.status === 'error' && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
        )}>
          <CardContent className="p-3">
            {/* Main message */}
            <div className={cn(
              "prose prose-sm max-w-none",
              isUser && "prose-invert",
              message.isStreaming && "animate-pulse"
            )}>
              {message.message ? (
                message.message.split('\n').map((paragraph, index) => (
                  <p key={index} className={index > 0 ? "mt-2" : ""}>
                    {paragraph}
                  </p>
                ))
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              
              {/* Streaming indicator */}
              {message.isStreaming && message.message && (
                <span className="inline-block w-2 h-5 bg-current animate-pulse ml-1" />
              )}
            </div>

            {/* Key points */}
            {message.keyPoints && message.keyPoints.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="text-xs font-medium mb-2 text-muted-foreground">Key Points:</div>
                <ul className="text-xs space-y-1">
                  {message.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-muted-foreground">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Agreement/Disagreement indicators */}
            {(message.agreesWih?.length || message.disagreesWith?.length) && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                {message.agreesWih && message.agreesWih.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <ThumbsUp className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">Agrees with:</span>
                    <span>{message.agreesWih.join(', ')}</span>
                  </div>
                )}
                
                {message.disagreesWith && message.disagreesWith.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <ThumbsDown className="h-3 w-3 text-red-500" />
                    <span className="text-muted-foreground">Disagrees with:</span>
                    <span>{message.disagreesWith.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message actions */}
        {message.status === 'completed' && (
          <div className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser && "justify-end"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleShare}
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>

            {/* Reaction buttons for AI messages */}
            {!isUser && !isSystem && onReact && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                  onClick={() => onReact(message.id, 'agree')}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Agree
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                  onClick={() => onReact(message.id, 'disagree')}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Disagree
                </Button>
              </>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          "text-xs text-muted-foreground",
          isUser && "text-right"
        )}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Active speaker indicator */}
      {isActive && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2">
          <div className="h-6 w-1 bg-primary rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}