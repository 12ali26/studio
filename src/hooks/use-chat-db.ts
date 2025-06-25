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
} from '@/types/chat';

// Default chat configuration
const DEFAULT_CONFIG: ChatConfig = {
  model: 'openai/gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.',
  userId: 'default-user',
};

// Database-enabled chat state hook
export function useChatDB(initialConfig?: Partial<ChatConfig>): UseChatState {
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
  
  // API utility functions
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  };
  
  // Load conversations from database
  const loadConversations = useCallback(async (userId: string) => {
    try {
      const result = await apiCall(`/api/conversations?userId=${userId}&limit=50`);
      return result.conversations || [];
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  }, []);
  
  // Create new conversation in database
  const createConversationInDB = useCallback(async (title: string, config: ChatConfig) => {
    try {
      const result = await apiCall('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          userId: config.userId,
          title,
          config: {
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            systemPrompt: config.systemPrompt,
          },
        }),
      });
      return result.conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }, []);
  
  // Load conversation with messages from database
  const loadConversationFromDB = useCallback(async (conversationId: string, userId: string) => {
    try {
      const [conversationResult, messagesResult] = await Promise.all([
        apiCall(`/api/conversations/${conversationId}?userId=${userId}`),
        apiCall(`/api/messages?conversationId=${conversationId}&includeReactions=true`)
      ]);
      
      const conversation = conversationResult.conversation;
      const dbMessages = messagesResult.messages || [];
      
      // Convert database messages to chat messages
      const chatMessages: ChatMessage[] = dbMessages.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender === 'user' ? MessageSender.USER : MessageSender.AI,
        content: msg.content,
        timestamp: msg.createdAt,
        status: msg.status,
        model: msg.model,
        metadata: msg.metadata,
        reactions: msg.reactions || [],
      }));
      
      return {
        conversation,
        messages: chatMessages,
      };
    } catch (error) {
      console.error('Failed to load conversation from DB:', error);
      throw error;
    }
  }, []);
  
  // Add message to chat (for UI updates)
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
        // For database mode, we'll use the message ID from the database
        streamingMessageRef.current = event.data.messageId;
        // Add placeholder message for UI
        setMessages(prev => [...prev, {
          id: event.data.messageId,
          sender: MessageSender.AI,
          content: '',
          timestamp: new Date().toISOString(),
          status: 'streaming',
          isStreaming: true,
          model: event.data.model,
        }]);
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
  }, [updateMessage]);
  
  // Send message to AI (with database integration)
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || status === ChatStatus.CONNECTING || !currentConversation) {
      return;
    }
    
    try {
      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: generateId(),
        sender: MessageSender.USER,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: 'completed',
      };
      
      setMessages(prev => [...prev, userMessage]);
      setStatus(ChatStatus.CONNECTING);
      setError(null);
      
      // Prepare messages for API (include conversation history)
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
      
      // Start streaming chat with database integration
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
          conversationId: currentConversation.id,
          userId: config.userId,
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
  }, [status, messages, config, currentConversation, handleChatEvent]);
  
  // Load conversation by ID
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      setStatus(ChatStatus.CONNECTING);
      const result = await loadConversationFromDB(conversationId, config.userId);
      
      setCurrentConversation({
        id: result.conversation.id,
        title: result.conversation.title,
        messages: result.messages,
        createdAt: result.conversation.createdAt,
        updatedAt: result.conversation.updatedAt,
        config: result.conversation.config,
        userId: result.conversation.userId,
      });
      
      setMessages(result.messages);
      setConfig(prev => ({ ...prev, ...result.conversation.config }));
      setStatus(ChatStatus.ACTIVE);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setError('Failed to load conversation');
      setStatus(ChatStatus.ERROR);
    }
  }, [config.userId, loadConversationFromDB]);
  
  // Create new conversation
  const createNewConversation = useCallback(async (title?: string) => {
    try {
      const conversationTitle = title || `Chat ${new Date().toLocaleDateString()}`;
      const conversation = await createConversationInDB(conversationTitle, config);
      
      setCurrentConversation({
        id: conversation.id,
        title: conversation.title,
        messages: [],
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        config: conversation.config,
        userId: conversation.userId,
      });
      
      setMessages([]);
      setStatus(ChatStatus.ACTIVE);
      setError(null);
      
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create conversation');
      throw error;
    }
  }, [config, createConversationInDB]);
  
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
  
  // Save current conversation (not needed with database integration)
  const saveConversation = useCallback(async () => {
    // This is handled automatically by the database integration
    return Promise.resolve();
  }, []);
  
  // Regenerate message (placeholder - would need to implement)
  const regenerateMessage = useCallback(async (messageId: string) => {
    // TODO: Implement regeneration with database integration
    console.log('Regenerate message:', messageId);
  }, []);
  
  // Edit message (placeholder - would need to implement)
  const editMessage = useCallback((messageId: string, newContent: string) => {
    // TODO: Implement editing with database integration
    console.log('Edit message:', messageId, newContent);
  }, []);
  
  // Delete message (placeholder - would need to implement)
  const deleteMessage = useCallback((messageId: string) => {
    // TODO: Implement deletion with database integration
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);
  
  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<ChatConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);
  
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
    
    // Additional database functions
    loadConversations: () => loadConversations(config.userId),
  };
}