'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { type DebateConfig, type DebateState } from '@/ai/flows/multi-ai-debate-orchestrator';

// Types for debate events from the streaming API
export type DebateEvent = 
  | { type: 'connection-established'; data: { status: string; timestamp: string } }
  | { type: 'debate-started'; data: DebateState }
  | { type: 'round-started'; data: { round: number; personas: string[] } }
  | { type: 'turn-started'; data: { persona: string; round: number; turn: number; personaDetails: any } }
  | { type: 'message-generated'; data: { persona: string; message: string; timestamp: string; round: number; turn: number; confidence: number; keyPoints: string[]; agreesWih?: string[]; disagreesWith?: string[] } }
  | { type: 'round-completed'; data: { round: number; messagesInRound: number } }
  | { type: 'debate-completed'; data: DebateState }
  | { type: 'generating-summary'; data: { status: string } }
  | { type: 'summary-ready'; data: { message: string } }
  | { type: 'stream-complete'; data: { status: string; timestamp: string; totalEvents: string } }
  | { type: 'error'; data: { message: string; persona?: string; round?: number; turn?: number; timestamp?: string } };

// Debate status enum
export enum DebateStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting', 
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
}

// Enhanced message type with additional metadata
export interface DebateMessage {
  id: string;
  persona: string;
  message: string;
  timestamp: string;
  round: number;
  turn: number;
  confidence?: number;
  keyPoints?: string[];
  agreesWih?: string[];
  disagreesWith?: string[];
  isStreaming?: boolean;
  status: 'pending' | 'streaming' | 'completed' | 'error';
}

// Debate state interface
export interface UseDebateState {
  // Current state
  status: DebateStatus;
  messages: DebateMessage[];
  currentRound: number;
  currentTurn: number;
  activePersonas: string[];
  currentSpeaker: string | null;
  error: string | null;
  
  // Configuration
  config: DebateConfig | null;
  
  // Statistics
  totalRounds: number;
  totalMessages: number;
  estimatedCost: number;
  
  // Controls
  startDebate: (config: DebateConfig) => Promise<void>;
  pauseDebate: () => void;
  resumeDebate: () => void;
  stopDebate: () => void;
  clearDebate: () => void;
  addMessage: (message: Omit<DebateMessage, 'id'>) => void;
  updateMessage: (id: string, updates: Partial<DebateMessage>) => void;
  
  // Real-time connection
  isConnected: boolean;
  connectionError: string | null;
}

// Custom hook for debate state management
export function useDebateState(): UseDebateState {
  // Core state
  const [status, setStatus] = useState<DebateStatus>(DebateStatus.IDLE);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [activePersonas, setActivePersonas] = useState<string[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<DebateConfig | null>(null);
  
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Statistics
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  
  // Refs for managing the streaming connection
  const eventSourceRef = useRef<EventSource | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  
  // Generate unique message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add message to the debate
  const addMessage = useCallback((messageData: Omit<DebateMessage, 'id'>) => {
    const message: DebateMessage = {
      ...messageData,
      id: generateMessageId(),
    };
    
    setMessages(prev => [...prev, message]);
  }, []);
  
  // Update existing message
  const updateMessage = useCallback((id: string, updates: Partial<DebateMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);
  
  // Handle incoming debate events
  const handleDebateEvent = useCallback((event: DebateEvent) => {
    console.log('Debate event received:', event.type, event.data);
    
    switch (event.type) {
      case 'connection-established':
        setIsConnected(true);
        setConnectionError(null);
        setStatus(DebateStatus.CONNECTING);
        break;
        
      case 'debate-started':
        setStatus(DebateStatus.ACTIVE);
        setActivePersonas(event.data.personas);
        setCurrentRound(event.data.currentRound);
        setTotalRounds(config?.maxRounds || 3);
        break;
        
      case 'round-started':
        setCurrentRound(event.data.round);
        break;
        
      case 'turn-started':
        setCurrentTurn(event.data.turn);
        setCurrentSpeaker(event.data.persona);
        
        // Add a pending message for the speaking persona
        addMessage({
          persona: event.data.persona,
          message: '',
          timestamp: new Date().toISOString(),
          round: event.data.round,
          turn: event.data.turn,
          status: 'pending',
          isStreaming: true,
        });
        break;
        
      case 'message-generated':
        // Find the pending message and update it
        setMessages(prev => {
          const messageIndex = prev.findIndex(msg => 
            msg.persona === event.data.persona && 
            msg.round === event.data.round && 
            msg.turn === event.data.turn &&
            msg.status === 'pending'
          );
          
          if (messageIndex !== -1) {
            const updatedMessages = [...prev];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              message: event.data.message,
              confidence: event.data.confidence,
              keyPoints: event.data.keyPoints,
              agreesWih: event.data.agreesWih,
              disagreesWith: event.data.disagreesWith,
              status: 'completed',
              isStreaming: false,
            };
            return updatedMessages;
          }
          
          // If no pending message found, add new one
          return [...prev, {
            id: generateMessageId(),
            persona: event.data.persona,
            message: event.data.message,
            timestamp: event.data.timestamp,
            round: event.data.round,
            turn: event.data.turn,
            confidence: event.data.confidence,
            keyPoints: event.data.keyPoints,
            agreesWih: event.data.agreesWih,
            disagreesWith: event.data.disagreesWith,
            status: 'completed',
            isStreaming: false,
          }];
        });
        
        setCurrentSpeaker(null);
        break;
        
      case 'round-completed':
        // Reset turn counter after round completion
        setCurrentTurn(0);
        break;
        
      case 'debate-completed':
        setStatus(DebateStatus.COMPLETED);
        setCurrentSpeaker(null);
        break;
        
      case 'generating-summary':
        // Could show a summary generation indicator
        break;
        
      case 'summary-ready':
        // Could add summary as a special message type
        addMessage({
          persona: 'System',
          message: event.data.message,
          timestamp: new Date().toISOString(),
          round: 0,
          turn: 0,
          status: 'completed',
        });
        break;
        
      case 'stream-complete':
        setIsConnected(false);
        if (status !== DebateStatus.COMPLETED) {
          setStatus(DebateStatus.COMPLETED);
        }
        break;
        
      case 'error':
        console.error('Debate error:', event.data);
        setError(event.data.message);
        setStatus(DebateStatus.ERROR);
        
        // Update any pending messages to error state
        if (event.data.persona) {
          setMessages(prev => prev.map(msg => 
            msg.persona === event.data.persona && msg.status === 'pending'
              ? { ...msg, status: 'error', isStreaming: false }
              : msg
          ));
        }
        break;
    }
  }, [config?.maxRounds, status, addMessage]);
  
  // Start debate function
  const startDebate = useCallback(async (debateConfig: DebateConfig) => {
    try {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // Reset state
      setConfig(debateConfig);
      setMessages([]);
      setCurrentRound(0);
      setCurrentTurn(0);
      setCurrentSpeaker(null);
      setError(null);
      setStatus(DebateStatus.CONNECTING);
      
      // Create abort controller for cleanup
      controllerRef.current = new AbortController();
      
      // Start streaming debate
      const response = await fetch('/api/debate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(debateConfig),
        signal: controllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      // Set up streaming reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                handleDebateEvent(eventData as DebateEvent);
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, this is expected
        return;
      }
      
      console.error('Error starting debate:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      setStatus(DebateStatus.ERROR);
      setError(error instanceof Error ? error.message : 'Failed to start debate');
    }
  }, [handleDebateEvent]);
  
  // Control functions
  const pauseDebate = useCallback(() => {
    if (status === DebateStatus.ACTIVE) {
      setStatus(DebateStatus.PAUSED);
    }
  }, [status]);
  
  const resumeDebate = useCallback(() => {
    if (status === DebateStatus.PAUSED) {
      setStatus(DebateStatus.ACTIVE);
    }
  }, [status]);
  
  const stopDebate = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setStatus(DebateStatus.IDLE);
    setIsConnected(false);
    setCurrentSpeaker(null);
  }, []);
  
  const clearDebate = useCallback(() => {
    stopDebate();
    setMessages([]);
    setCurrentRound(0);
    setCurrentTurn(0);
    setActivePersonas([]);
    setError(null);
    setConfig(null);
    setTotalRounds(0);
    setEstimatedCost(0);
  }, [stopDebate]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  // Calculate total messages
  const totalMessages = messages.length;
  
  return {
    // State
    status,
    messages,
    currentRound,
    currentTurn,
    activePersonas,
    currentSpeaker,
    error,
    config,
    
    // Statistics
    totalRounds,
    totalMessages,
    estimatedCost,
    
    // Controls
    startDebate,
    pauseDebate,
    resumeDebate,
    stopDebate,
    clearDebate,
    addMessage,
    updateMessage,
    
    // Connection
    isConnected,
    connectionError,
  };
}