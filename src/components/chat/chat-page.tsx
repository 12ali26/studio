'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatInterface } from './chat-interface';
import { ChatSidebar } from './chat-sidebar';
import { ChatSettings } from './chat-settings';
import { ConversationSearch } from './conversation-search';
import { ConversationExport } from './conversation-export';
import { useChatContext } from '@/contexts/chat-context';
import { 
  Menu, 
  Settings, 
  MessageSquare,
  ArrowLeft,
  Plus,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPage() {
  const {
    currentConversation,
    messages,
    loadConversation,
    createNewConversation,
    clearChat,
  } = useChatContext();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    loadConversation(conversationId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle new conversation
  const handleNewConversation = () => {
    createNewConversation();
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle delete conversation
  const handleDeleteConversation = (conversationId: string) => {
    if (currentConversation?.id === conversationId) {
      clearChat();
    }
  };

  // Handle jump to message (for search)
  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      element.classList.add('bg-primary/20');
      setTimeout(() => {
        element.classList.remove('bg-primary/20');
      }, 2000);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-80 border-r bg-muted/30">
          <ChatSidebar
            currentConversation={currentConversation}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b bg-background/95 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Toggle */}
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <ChatSidebar
                    currentConversation={currentConversation}
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={handleDeleteConversation}
                  />
                </SheetContent>
              </Sheet>
            )}

            {/* Chat Title */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">
                  {currentConversation?.title || 'New Chat'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  AI Assistant • Online
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Button */}
            {messages.length > 0 && (
              <ConversationSearch
                messages={messages}
                onJumpToMessage={handleJumpToMessage}
              />
            )}

            {/* Export Button */}
            {currentConversation && messages.length > 0 && (
              <ConversationExport
                conversation={currentConversation}
                messages={messages}
              />
            )}

            {/* New Chat Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNewConversation}
              className="md:hidden"
            >
              <Plus className="h-5 w-5" />
            </Button>

            {/* Settings Toggle */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSettingsOpen(false)}
                      className="md:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold">Settings</h2>
                  </div>
                  <ChatSettings />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatInterface 
            className={cn(
              "flex-1",
              // Mobile optimizations
              isMobile && "pb-safe"
            )}
            showWelcome={!currentConversation}
          />
        </div>
      </div>
    </div>
  );
}