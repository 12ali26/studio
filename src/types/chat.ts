// Single AI Chat Types
// Simplified from debate types for traditional 1-on-1 AI conversations

// Chat status enum - simplified from DebateStatus
export enum ChatStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  ERROR = 'error',
}

// Message sender type
export enum MessageSender {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

// Chat message interface - simplified from DebateMessage
export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  model?: string; // AI model used for this message
  metadata?: {
    tokensUsed?: number;
    cost?: number;
    regenerated?: boolean;
    edited?: boolean;
    originalContent?: string;
  };
}

// Chat configuration for AI model settings
export interface ChatConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userId?: string;
}

// Chat conversation interface
export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  config: ChatConfig;
  userId: string;
}

// Chat events for streaming - simplified from DebateEvent
export type ChatEvent = 
  | { type: 'connection-established'; data: { status: string; timestamp: string } }
  | { type: 'message-start'; data: { messageId: string; model: string } }
  | { type: 'message-chunk'; data: { messageId: string; chunk: string } }
  | { type: 'message-complete'; data: { messageId: string; content: string; metadata?: any } }
  | { type: 'error'; data: { message: string; messageId?: string; timestamp?: string } }
  | { type: 'stream-complete'; data: { status: string; timestamp: string } };

// Chat state interface - simplified from UseDebateState
export interface UseChatState {
  // Current state
  status: ChatStatus;
  messages: ChatMessage[];
  currentConversation: ChatConversation | null;
  isTyping: boolean;
  error: string | null;
  
  // Configuration
  config: ChatConfig;
  
  // Statistics
  totalMessages: number;
  estimatedCost: number;
  
  // Core chat functions
  sendMessage: (content: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;
  clearChat: () => void;
  
  // Conversation management
  loadConversation: (conversationId: string) => Promise<void>;
  saveConversation: () => Promise<void>;
  createNewConversation: () => void;
  
  // Configuration
  updateConfig: (newConfig: Partial<ChatConfig>) => void;
  
  // Real-time connection
  isConnected: boolean;
  connectionError: string | null;
}

// Available AI models
export const AI_MODELS = {
  'openai/gpt-4': {
    name: 'GPT-4',
    provider: 'OpenAI',
    maxTokens: 8192,
    costPer1kTokens: 0.03,
    speed: 'fast',
  },
  'openai/gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    maxTokens: 4096,
    costPer1kTokens: 0.002,
    speed: 'very-fast',
  },
  'anthropic/claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    maxTokens: 8192,
    costPer1kTokens: 0.003,
    speed: 'fast',
  },
  'anthropic/claude-3-haiku': {
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    maxTokens: 4096,
    costPer1kTokens: 0.001,
    speed: 'very-fast',
  },
  'google/gemini-pro': {
    name: 'Gemini Pro',
    provider: 'Google',
    maxTokens: 8192,
    costPer1kTokens: 0.001,
    speed: 'fast',
  },
} as const;

export type AIModelKey = keyof typeof AI_MODELS;

// Response length presets
export const RESPONSE_LENGTHS = {
  short: { name: 'Short', maxTokens: 150, description: 'Brief, concise responses' },
  medium: { name: 'Medium', maxTokens: 500, description: 'Balanced detail and brevity' },
  detailed: { name: 'Detailed', maxTokens: 1500, description: 'Comprehensive, thorough responses' },
} as const;

export type ResponseLength = keyof typeof RESPONSE_LENGTHS;

// Temperature presets for creativity control
export const TEMPERATURE_PRESETS = {
  focused: { name: 'Focused', value: 0.1, description: 'Precise, deterministic responses' },
  balanced: { name: 'Balanced', value: 0.7, description: 'Natural conversation flow' },
  creative: { name: 'Creative', value: 0.9, description: 'Imaginative, varied responses' },
} as const;

export type TemperaturePreset = keyof typeof TEMPERATURE_PRESETS;