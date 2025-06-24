'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChatStatus,
  MessageSender,
  type ChatMessage,
  type ChatConfig,
  type ChatConversation,
  type ChatEvent,
  type UseChatState,
  type AIModelKey,
} from '@/types/chat';

// Default chat configuration
const DEFAULT_CONFIG: ChatConfig = {
  model: 'openai/gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.',
  userId: 'default-user',
};

// Custom hook for single AI chat state management
export function useChatState(initialConfig?: Partial<ChatConfig>): UseChatState {
  // Core state
  const [status, setStatus] = useState<ChatStatus>(ChatStatus.IDLE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ChatConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Statistics
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  
  // Refs for managing streaming
  const controllerRef = useRef<AbortController | null>(null);
  const streamingMessageRef = useRef<string | null>(null);
  
  // Generate unique IDs
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Load conversation from localStorage
  const loadStoredConversations = useCallback(() => {
    try {
      const stored = localStorage.getItem('chat_conversations');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);
  
  // Save conversation to localStorage
  const saveConversationToStorage = useCallback((conversation: ChatConversation) => {
    try {
      const stored = loadStoredConversations();
      stored[conversation.id] = conversation;
      localStorage.setItem('chat_conversations', JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }, [loadStoredConversations]);
  
  // Add message to chat
  const addMessage = useCallback((messageData: Omit<ChatMessage, 'id'>) => {
    const message: ChatMessage = {
      ...messageData,
      id: generateId(),
    };
    
    setMessages(prev => [...prev, message]);
    return message.id;
  }, []);
  
  // Update existing message
  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);
  
  // Handle incoming chat events during streaming
  const handleChatEvent = useCallback((event: ChatEvent) => {
    console.log('Chat event received:', event.type, event.data);
    
    switch (event.type) {
      case 'connection-established':
        setIsConnected(true);
        setConnectionError(null);
        setStatus(ChatStatus.CONNECTING);
        break;
        
      case 'message-start':
        setIsTyping(true);
        // Create pending AI message
        const messageId = addMessage({
          sender: MessageSender.AI,
          content: '',
          timestamp: new Date().toISOString(),
          status: 'streaming',
          isStreaming: true,
          model: event.data.model,
        });
        streamingMessageRef.current = messageId;
        break;
        
      case 'message-chunk':
        // Update streaming message with new chunk
        if (streamingMessageRef.current) {
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMessageRef.current
              ? { ...msg, content: msg.content + event.data.chunk }
              : msg
          ));
        }
        break;
        
      case 'message-complete':
        setIsTyping(false);
        if (streamingMessageRef.current) {
          updateMessage(streamingMessageRef.current, {
            content: event.data.content,
            status: 'completed',
            isStreaming: false,
            metadata: event.data.metadata,
          });
          streamingMessageRef.current = null;
        }
        setStatus(ChatStatus.ACTIVE);
        break;
        
      case 'error':
        console.error('Chat error:', event.data);
        setError(event.data.message);
        setStatus(ChatStatus.ERROR);
        setIsTyping(false);
        
        // Update streaming message to error state
        if (streamingMessageRef.current) {
          updateMessage(streamingMessageRef.current, {
            status: 'error',
            isStreaming: false,
          });
          streamingMessageRef.current = null;
        }
        break;
        
      case 'stream-complete':
        setIsConnected(false);
        setStatus(ChatStatus.ACTIVE);
        break;
    }
  }, [addMessage, updateMessage]);
  
  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || status === ChatStatus.CONNECTING) {
      return;
    }
    
    try {
      // Add user message
      const userMessageId = addMessage({
        sender: MessageSender.USER,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: 'completed',
      });
      
      setStatus(ChatStatus.CONNECTING);
      setError(null);
      
      // Prepare messages for API
      const apiMessages = [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        ...messages.map(msg => ({
          role: msg.sender === MessageSender.USER ? 'user' : 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: content.trim() },
      ];
      
      // Create abort controller
      controllerRef.current = new AbortController();
      
      // Start streaming chat
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
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
                handleChatEvent(eventData as ChatEvent);
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
        return; // Request was aborted
      }
      
      console.error('Error sending message:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      setStatus(ChatStatus.ERROR);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  }, [status, addMessage, messages, config, handleChatEvent]);
  
  // Regenerate last AI message
  const regenerateMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].sender !== MessageSender.AI) {
      return;
    }
    
    // Find the user message that prompted this AI response
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].sender !== MessageSender.USER) {
      return;
    }
    
    // Remove the AI message and regenerate
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    await sendMessage(messages[userMessageIndex].content);
  }, [messages, sendMessage]);
  
  // Edit message (user messages only)
  const editMessage = useCallback((messageId: string, newContent: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || message.sender !== MessageSender.USER) {
      return;
    }
    
    updateMessage(messageId, {
      content: newContent,
      metadata: { 
        ...message.metadata, 
        edited: true, 
        originalContent: message.content 
      },
    });
  }, [messages, updateMessage]);
  
  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);
  
  // Clear current chat
  const clearChat = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setMessages([]);
    setCurrentConversation(null);
    setStatus(ChatStatus.IDLE);
    setError(null);
    setIsTyping(false);
    setIsConnected(false);
    streamingMessageRef.current = null;
  }, []);
  
  // Load conversation by ID
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const stored = loadStoredConversations();
      const conversation = stored[conversationId];
      
      if (conversation) {
        setCurrentConversation(conversation);
        setMessages(conversation.messages);
        setConfig(conversation.config);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setError('Failed to load conversation');
    }
  }, [loadStoredConversations]);
  
  // Save current conversation
  const saveConversation = useCallback(async () => {
    if (messages.length === 0) return;
    
    const conversation: ChatConversation = {
      id: currentConversation?.id || generateId(),
      title: currentConversation?.title || `Chat ${new Date().toLocaleDateString()}`,
      messages,
      createdAt: currentConversation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
      userId: config.userId || 'default-user',
    };
    
    setCurrentConversation(conversation);
    saveConversationToStorage(conversation);
  }, [messages, currentConversation, config, saveConversationToStorage]);
  
  // Create new conversation
  const createNewConversation = useCallback(() => {
    clearChat();
    setCurrentConversation(null);
  }, [clearChat]);
  
  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<ChatConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);
  
  // Auto-save conversation when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveConversation();
    }
  }, [messages, saveConversation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);
  
  // Calculate total messages
  const totalMessages = messages.length;
  
  return {
    // State
    status,
    messages,
    currentConversation,
    isTyping,
    error,
    config,
    
    // Statistics
    totalMessages,
    estimatedCost,
    
    // Core functions
    sendMessage,
    regenerateMessage,
    editMessage,
    deleteMessage,
    clearChat,
    
    // Conversation management
    loadConversation,
    saveConversation,
    createNewConversation,
    
    // Configuration
    updateConfig,
    
    // Connection
    isConnected,
    connectionError,
  };
}