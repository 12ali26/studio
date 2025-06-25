'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Users, 
  MessageSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';

import { useDebateContext } from '@/contexts/debate-context';
import { DebateStatus } from '@/hooks/use-debate-state';
import { personas } from '@/lib/personas';
import { EnhancedAgentCard } from './enhanced-agent-card';

// Debate mode options
const DEBATE_MODES = [
  { value: 'expert-panel', label: 'Expert Panel (2-3 AIs)', description: 'AI selects most relevant personas' },
  { value: 'boardroom', label: 'Full Boardroom (5 AIs)', description: 'Complete executive team debate' },
  { value: 'quick-consult', label: 'Quick Consult (1 AI)', description: 'Single AI expert consultation' },
  { value: 'custom', label: 'Custom Selection', description: 'Choose specific personas' },
] as const;

// Models with pricing (placeholder values)
const AI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4 Turbo', category: 'Premium', costPer1k: 0.03 },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', category: 'Premium', costPer1k: 0.015 },
  { value: 'gemini-pro', label: 'Gemini Pro', category: 'Standard', costPer1k: 0.001 },
  { value: 'mixtral-8x7b', label: 'Mixtral 8x7B', category: 'Budget', costPer1k: 0.0005 },
] as const;

export function EnhancedDebateView() {
  const {
    status,
    messages,
    currentRound,
    currentTurn,
    activePersonas,
    currentSpeaker,
    error,
    config,
    totalRounds,
    totalMessages,
    startDebate,
    pauseDebate,
    resumeDebate,
    stopDebate,
    clearDebate,
    isConnected,
    connectionError,
  } = useDebateContext();

  // Local state for form inputs
  const [topic, setTopic] = useState('');
  const [debateMode, setDebateMode] = useState<'expert-panel' | 'boardroom' | 'quick-consult' | 'custom'>('expert-panel');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [maxRounds, setMaxRounds] = useState(2);
  const [selectedModel, setSelectedModel] = useState('claude-3-sonnet');
  const [soundEnabled, setSoundEnabled] = useState(false);

  // UI state
  const [isFormValid, setIsFormValid] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Form validation
  useEffect(() => {
    const topicValid = topic.trim().length >= 10;
    const personasValid = debateMode !== 'custom' || selectedPersonas.length > 0;
    setIsFormValid(topicValid && personasValid);
  }, [topic, debateMode, selectedPersonas]);

  // Cost estimation
  useEffect(() => {
    const model = AI_MODELS.find(m => m.value === selectedModel);
    if (model) {
      const estimatedTokens = topic.length * 4 * activePersonas.length * maxRounds; // Rough estimate
      setEstimatedCost((estimatedTokens / 1000) * model.costPer1k);
    }
  }, [topic, selectedModel, activePersonas.length, maxRounds]);

  // Handle form submission
  const handleStartDebate = async () => {
    if (!isFormValid) return;

    try {
      await startDebate({
        topic: topic.trim(),
        debateMode,
        selectedPersonas: debateMode === 'custom' ? selectedPersonas : undefined,
        maxRounds,
        includeModeration: true,
      });
    } catch (error) {
      console.error('Failed to start debate:', error);
    }
  };

  // Handle persona selection for custom mode
  const handlePersonaToggle = (personaName: string) => {
    setSelectedPersonas(prev => 
      prev.includes(personaName) 
        ? prev.filter(p => p !== personaName)
        : [...prev, personaName]
    );
  };

  // Get status color and icon
  const getStatusDisplay = () => {
    switch (status) {
      case DebateStatus.IDLE:
        return { color: 'bg-gray-500', icon: MessageSquare, text: 'Ready to start' };
      case DebateStatus.CONNECTING:
        return { color: 'bg-yellow-500', icon: Loader2, text: 'Connecting...' };
      case DebateStatus.ACTIVE:
        return { color: 'bg-green-500', icon: Play, text: 'Debate in progress' };
      case DebateStatus.PAUSED:
        return { color: 'bg-orange-500', icon: Pause, text: 'Paused' };
      case DebateStatus.COMPLETED:
        return { color: 'bg-blue-500', icon: CheckCircle, text: 'Completed' };
      case DebateStatus.ERROR:
        return { color: 'bg-red-500', icon: AlertCircle, text: 'Error occurred' };
      default:
        return { color: 'bg-gray-500', icon: MessageSquare, text: 'Unknown' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  // Calculate progress
  const progress = totalRounds > 0 ? (currentRound / totalRounds) * 100 : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header with status and controls */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${statusDisplay.color}`} />
              <StatusIcon className={`h-4 w-4 ${status === DebateStatus.CONNECTING ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">{statusDisplay.text}</span>
            </div>
            
            {(status === DebateStatus.ACTIVE || status === DebateStatus.COMPLETED) && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Round {currentRound}/{totalRounds}</span>
                <span>•</span>
                <span>{totalMessages} messages</span>
                <span>•</span>
                <span>${estimatedCost.toFixed(4)} estimated</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {status === DebateStatus.ACTIVE && (
              <Button variant="outline" size="sm" onClick={pauseDebate}>
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {status === DebateStatus.PAUSED && (
              <Button variant="outline" size="sm" onClick={resumeDebate}>
                <Play className="h-4 w-4" />
              </Button>
            )}

            {(status === DebateStatus.ACTIVE || status === DebateStatus.PAUSED) && (
              <Button variant="outline" size="sm" onClick={stopDebate}>
                <Square className="h-4 w-4" />
              </Button>
            )}

            {status !== DebateStatus.IDLE && (
              <Button variant="outline" size="sm" onClick={clearDebate}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        </div>

        {/* Progress bar for active debates */}
        {(status === DebateStatus.ACTIVE || status === DebateStatus.PAUSED) && (
          <div className="mt-3 flex justify-center">
            <div className="w-full max-w-6xl">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden justify-center">
        <div className="w-full max-w-6xl flex flex-1 overflow-hidden">
        {/* Sidebar with debate setup */}
        <div className="w-80 border-r bg-muted/50 p-4">
          <Tabs defaultValue="setup" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="personas">Personas</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="mt-4 space-y-4">
              <form ref={formRef} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Topic</label>
                  <Textarea
                    placeholder="Enter your business topic or decision to debate..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-1"
                    rows={3}
                    disabled={status === DebateStatus.ACTIVE}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {topic.length}/500 characters (minimum 10)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Debate Mode</label>
                  <Select value={debateMode} onValueChange={(value: any) => setDebateMode(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEBATE_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          <div>
                            <div className="font-medium">{mode.label}</div>
                            <div className="text-xs text-muted-foreground">{mode.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Max Rounds</label>
                  <Select value={maxRounds.toString()} onValueChange={(value) => setMaxRounds(parseInt(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Round</SelectItem>
                      <SelectItem value="2">2 Rounds</SelectItem>
                      <SelectItem value="3">3 Rounds</SelectItem>
                      <SelectItem value="4">4 Rounds</SelectItem>
                      <SelectItem value="5">5 Rounds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">AI Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="font-medium">{model.label}</div>
                              <div className="text-xs text-muted-foreground">
                                ${model.costPer1k}/1K tokens
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {model.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleStartDebate}
                  disabled={!isFormValid || status === DebateStatus.ACTIVE || status === DebateStatus.CONNECTING}
                  className="w-full"
                >
                  {status === DebateStatus.CONNECTING ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Debate
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="personas" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {debateMode === 'custom' ? (
                    personas.map((persona) => (
                      <Card 
                        key={persona.name}
                        className={`cursor-pointer transition-colors ${
                          selectedPersonas.includes(persona.name) 
                            ? 'ring-2 ring-primary' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handlePersonaToggle(persona.name)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            {persona.icon}
                            <div>
                              <div className="font-medium text-sm">{persona.name}</div>
                              <div className="text-xs text-muted-foreground">{persona.title}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Personas will be selected automatically based on your chosen debate mode.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="stats" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Debate Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex justify-between text-sm">
                    <span>Messages:</span>
                    <span className="font-medium">{totalMessages}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active Personas:</span>
                    <span className="font-medium">{activePersonas.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current Round:</span>
                    <span className="font-medium">{currentRound}/{totalRounds}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estimated Cost:</span>
                    <span className="font-medium">${estimatedCost.toFixed(4)}</span>
                  </div>
                </CardContent>
              </Card>

              {currentSpeaker && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    {currentSpeaker} is currently speaking...
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col">
          {/* Error display */}
          {(error || connectionError) && (
            <Alert variant="destructive" className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || connectionError}
              </AlertDescription>
            </Alert>
          )}

          {/* Messages area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && status === DebateStatus.IDLE && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Ready to Start a Debate</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Configure your debate settings in the sidebar and start a multi-AI business discussion.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <EnhancedAgentCard
                  key={message.id}
                  message={message}
                  isActive={currentSpeaker === message.persona}
                />
              ))}

              {/* Loading states for active personas */}
              {status === DebateStatus.ACTIVE && activePersonas.map((persona) => (
                !messages.some(m => m.persona === persona && m.round === currentRound && m.turn === currentTurn) &&
                currentSpeaker !== persona && (
                  <div key={`loading-${persona}`} className="flex items-start gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                )
              ))}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
        </div>
      </div>
    </div>
  );
}