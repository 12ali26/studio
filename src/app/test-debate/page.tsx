'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  multiAiDebateFlow, 
  streamMultiAiDebate, 
  generateDebateSummary,
  type DebateConfig,
  type DebateState 
} from '@/ai/flows/multi-ai-debate-orchestrator';
import { personas } from '@/lib/personas';
import { AlertCircle, Play, Users, MessageSquare } from 'lucide-react';
import { TestNavigation } from '@/components/layout/test-nav';

export default function TestDebatePage() {
  const [topic, setTopic] = useState('Should we implement AI-powered customer service chatbots?');
  const [isLoading, setIsLoading] = useState(false);
  const [debateResult, setDebateResult] = useState<DebateState | null>(null);
  const [streamingEvents, setStreamingEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Test the basic debate flow
  const testBasicDebate = async () => {
    setIsLoading(true);
    setError(null);
    setDebateResult(null);

    try {
      const config: DebateConfig = {
        topic,
        debateMode: 'expert-panel',
        maxRounds: 2,
        includeModeration: true,
      };

      const result = await multiAiDebateFlow(config);
      setDebateResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Test the streaming debate flow
  const testStreamingDebate = async () => {
    setIsLoading(true);
    setError(null);
    setStreamingEvents([]);

    try {
      const config: DebateConfig = {
        topic,
        debateMode: 'boardroom',
        maxRounds: 2,
        includeModeration: true,
      };

      const events: any[] = [];
      for await (const event of streamMultiAiDebate(config)) {
        events.push({
          ...event,
          timestamp: new Date().toISOString(),
        });
        setStreamingEvents([...events]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Test debate summary generation
  const testSummaryGeneration = async () => {
    if (!debateResult) {
      alert('Please run a debate first to generate a summary!');
      return;
    }

    try {
      const summary = await generateDebateSummary(debateResult);
      alert(`Summary Generated!\n\n${summary.summary}\n\nKey Points: ${summary.keyConsensusPoints.join(', ')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <TestNavigation />
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Multi-AI Debate Testing</h1>
          <p className="text-muted-foreground">
            Test the multi-AI debate orchestration system
          </p>
        </div>

        {/* Topic Input */}
        <Card>
          <CardHeader>
            <CardTitle>Debate Topic</CardTitle>
            <CardDescription>
              Enter a business topic for the AI executives to debate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your business topic or decision..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[100px]"
            />
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={testBasicDebate} 
                disabled={!topic.trim() || isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Test Basic Debate
              </Button>
              <Button 
                onClick={testStreamingDebate} 
                disabled={!topic.trim() || isLoading}
                variant="outline"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Streaming Debate
              </Button>
              <Button 
                onClick={testSummaryGeneration} 
                disabled={!debateResult}
                variant="outline"
              >
                Generate Summary
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Personas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available AI Personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map((persona) => (
                <div key={persona.name} className="p-3 border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    {persona.icon}
                    <div>
                      <div className="font-medium">{persona.name}</div>
                      <div className="text-xs text-muted-foreground">{persona.title}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {persona.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {persona.expertise.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {streamingEvents.length > 0 ? 'Streaming debate in progress...' : 'Starting debate...'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Basic Debate Results */}
        {debateResult && (
          <Card>
            <CardHeader>
              <CardTitle>Debate Results</CardTitle>
              <CardDescription>
                Topic: {debateResult.topic} • 
                Mode: {debateResult.mode} • 
                {debateResult.messages.length} messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {debateResult.messages.map((message, index) => (
                <div key={index} className="p-4 border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Round {message.round}</Badge>
                    <Badge variant="secondary">{message.persona}</Badge>
                  </div>
                  <p className="text-sm">{message.message}</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(message.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Streaming Events */}
        {streamingEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Streaming Events</CardTitle>
              <CardDescription>
                Real-time events from the streaming debate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {streamingEvents.map((event, index) => (
                  <div key={index} className="p-3 bg-muted rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{event.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}