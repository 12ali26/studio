'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatInterface } from './chat-interface';
import { ChatSidebar } from './chat-sidebar';
import { ChatSettings } from './chat-settings';
import { ConversationSearch } from './conversation-search';
import { ConversationExport } from './conversation-export';
import { useChatDB } from '@/hooks/use-chat-db';
import { useUser } from '@/contexts/user-context';
import { 
  Menu, 
  Settings, 
  MessageSquare,
  ArrowLeft,
  Plus,
  Search,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPageDB() {
  const { user, signOut } = useUser();
  const chatState = useChatDB({
    userId: user?.id || 'default-user',
    model: user?.preferences?.defaultModel || 'openai/gpt-3.5-turbo',
    temperature: parseFloat(user?.preferences?.defaultTemperature || '0.7'),
    maxTokens: user?.preferences?.defaultMaxTokens || 500,
    systemPrompt: user?.preferences?.defaultSystemPrompt || 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.',
  });

  const {
    currentConversation,
    messages,
    loadConversation,
    createNewConversation,
    clearChat,
    loadConversations,
  } = chatState;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations().then(setConversations);
    }
  }, [user, loadConversations]);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    loadConversation(conversationId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle new conversation
  const handleNewConversation = async () => {
    try {
      await createNewConversation();
      if (isMobile) {
        setSidebarOpen(false);
      }
      // Refresh conversations list
      const updatedConversations = await loadConversations();
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  // Handle clear chat
  const handleClearChat = () => {
    clearChat();
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-[#1E3A8A] flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-white/60 text-xs">{user?.subscriptionTier}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-white/60 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <Button
          onClick={handleNewConversation}
          className="w-full justify-start bg-[#1E3A8A] hover:bg-[#1E3A8A]/80 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setSearchOpen(true)}
          className="w-full justify-start border-white/20 text-white hover:bg-white/10"
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-hidden">
        <ChatSidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={(id) => {
            // TODO: Implement delete conversation
            console.log('Delete conversation:', id);
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#0A192F] flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-80 border-r border-white/10 bg-black/20">
          <SidebarContent />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-white/10 bg-black/20 flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0 bg-[#0A192F] border-white/10">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            )}
            
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-[#7E57C2]" />
              <h1 className="text-white font-semibold">
                {currentConversation?.title || 'New Chat'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportOpen(true)}
              className="text-white/60 hover:text-white"
            >
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="text-white/60 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1">
          <ChatInterface {...chatState} />
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <ConversationSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          conversations={conversations}
          onSelectConversation={(id) => {
            handleSelectConversation(id);
            setSearchOpen(false);
          }}
        />
      )}

      {/* Export Modal */}
      {exportOpen && currentConversation && (
        <ConversationExport
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          conversation={currentConversation}
          messages={messages}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <ChatSettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={chatState.config}
          onUpdateConfig={chatState.updateConfig}
        />
      )}
    </div>
  );
}