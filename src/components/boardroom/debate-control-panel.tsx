'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Settings,
  Zap,
  MessageSquareQuote,
  Users,
  Clock,
  DollarSign,
  Send,
  Bot
} from 'lucide-react';

import { useDebateContext } from '@/contexts/debate-context';
import { DebateStatus } from '@/hooks/use-debate-state';

interface DebateControlPanelProps {
  className?: string;
}

export function DebateControlPanel({ className }: DebateControlPanelProps) {
  const {
    status,
    currentRound,
    totalRounds,
    activePersonas,
    currentSpeaker,
    totalMessages,
    estimatedCost,
    pauseDebate,
    resumeDebate,
    stopDebate,
    clearDebate,
    config,
  } = useDebateContext();

  // Local state for advanced controls
  const [moderationMessage, setModerationMessage] = useState('');
  const [autoModeration, setAutoModeration] = useState(true);
  const [responseSpeed, setResponseSpeed] = useState([5]); // 1-10 scale
  const [creativityLevel, setCreativityLevel] = useState([7]); // 1-10 scale

  // Handle sending moderator message
  const handleSendModeration = () => {
    if (!moderationMessage.trim()) return;
    
    // In a real implementation, this would send a moderation message to the debate
    console.log('Sending moderation message:', moderationMessage);
    setModerationMessage('');
  };

  // Handle debate controls
  const handlePause = () => {
    pauseDebate();
  };

  const handleResume = () => {
    resumeDebate();
  };

  const handleStop = () => {
    const confirmed = window.confirm('Are you sure you want to stop the debate? This cannot be undone.');
    if (confirmed) {
      stopDebate();
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm('Are you sure you want to reset the debate? All progress will be lost.');
    if (confirmed) {
      clearDebate();
    }
  };

  // Get status-specific controls
  const getStatusControls = () => {
    switch (status) {
      case DebateStatus.ACTIVE:
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button variant="destructive" size="sm" onClick={handleStop}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        );
      
      case DebateStatus.PAUSED:
        return (
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleResume}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
            <Button variant="destructive" size="sm" onClick={handleStop}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        );
      
      case DebateStatus.COMPLETED:
      case DebateStatus.ERROR:
        return (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Debate
          </Button>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Debate Controls
            </CardTitle>
            <CardDescription>
              Monitor and control the debate in real-time
            </CardDescription>
          </div>
          {getStatusControls()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Round {currentRound}/{totalRounds}
              </Badge>
              {currentSpeaker && (
                <Badge variant="secondary">
                  {currentSpeaker} speaking
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Participants</span>
            </div>
            <div className="text-lg font-semibold">
              {activePersonas.length} AI personas
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
              <span>Messages</span>
            </div>
            <div className="text-lg font-semibold">
              {totalMessages}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Cost</span>
            </div>
            <div className="text-lg font-semibold">
              ${estimatedCost.toFixed(4)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Active Personas */}
        {activePersonas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4" />
              Active Personas
            </div>
            <div className="flex flex-wrap gap-2">
              {activePersonas.map((persona) => (
                <Badge 
                  key={persona} 
                  variant={currentSpeaker === persona ? "default" : "outline"}
                  className={currentSpeaker === persona ? "animate-pulse" : ""}
                >
                  {persona}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Real-time Controls (only show during active debate) */}
        {status === DebateStatus.ACTIVE && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Live Controls
            </div>

            {/* Moderation Message */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Send Moderator Message
              </label>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Guide the debate direction..."
                  value={moderationMessage}
                  onChange={(e) => setModerationMessage(e.target.value)}
                  className="min-h-[60px] text-sm"
                  rows={2}
                />
                <Button 
                  size="sm" 
                  onClick={handleSendModeration}
                  disabled={!moderationMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Auto Moderation Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Auto Moderation</div>
                <div className="text-xs text-muted-foreground">
                  Automatically guide debate flow
                </div>
              </div>
              <Switch
                checked={autoModeration}
                onCheckedChange={setAutoModeration}
              />
            </div>

            {/* Response Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Response Speed</label>
                <span className="text-xs text-muted-foreground">
                  {responseSpeed[0]}/10
                </span>
              </div>
              <Slider
                value={responseSpeed}
                onValueChange={setResponseSpeed}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Careful</span>
                <span>Rapid</span>
              </div>
            </div>

            {/* Creativity Level Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Creativity Level</label>
                <span className="text-xs text-muted-foreground">
                  {creativityLevel[0]}/10
                </span>
              </div>
              <Slider
                value={creativityLevel}
                onValueChange={setCreativityLevel}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>
          </div>
        )}

        {/* Debate Configuration Summary */}
        {config && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="text-sm font-medium">Configuration</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Mode</div>
                  <div className="capitalize">{config.debateMode.replace('-', ' ')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Max Rounds</div>
                  <div>{config.maxRounds}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Moderation</div>
                  <div>{config.includeModeration ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Topic</div>
                  <div className="truncate" title={config.topic}>
                    {config.topic.length > 20 ? config.topic.substring(0, 20) + '...' : config.topic}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}