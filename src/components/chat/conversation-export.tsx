'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Download,
  FileText,
  File,
  Printer,
  Share2,
  Copy,
  Check,
  Calendar,
  MessageSquare,
  User,
  Bot,
} from 'lucide-react';
import { ChatMessage, ChatConversation, MessageSender } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ExportOptions {
  format: 'pdf' | 'markdown' | 'text' | 'json';
  includeTimestamps: boolean;
  includeMetadata: boolean;
  includeReactions: boolean;
  dateRange: 'all' | 'today' | 'week' | 'month';
  messageTypes: 'all' | 'user' | 'ai';
}

interface ConversationExportProps {
  conversation: ChatConversation;
  messages: ChatMessage[];
  className?: string;
}

export function ConversationExport({ 
  conversation, 
  messages,
  className 
}: ConversationExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'markdown',
    includeTimestamps: true,
    includeMetadata: false,
    includeReactions: false,
    dateRange: 'all',
    messageTypes: 'all',
  });

  // Filter messages based on options
  const getFilteredMessages = (): ChatMessage[] => {
    let filtered = [...messages];

    // Filter by message type
    if (options.messageTypes === 'user') {
      filtered = filtered.filter(m => m.sender === MessageSender.USER);
    } else if (options.messageTypes === 'ai') {
      filtered = filtered.filter(m => m.sender === MessageSender.AI);
    }

    // Filter by date range
    if (options.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (options.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(m => new Date(m.timestamp) >= cutoff);
    }

    return filtered;
  };

  // Generate export content based on format
  const generateExportContent = (format: ExportOptions['format']): string => {
    const filteredMessages = getFilteredMessages();
    
    switch (format) {
      case 'markdown':
        return generateMarkdown(filteredMessages);
      case 'text':
        return generatePlainText(filteredMessages);
      case 'json':
        return generateJSON(filteredMessages);
      default:
        return generateMarkdown(filteredMessages);
    }
  };

  // Generate Markdown format
  const generateMarkdown = (messages: ChatMessage[]): string => {
    const lines: string[] = [];
    
    // Header
    lines.push(`# ${conversation.title}`);
    lines.push('');
    
    if (options.includeMetadata) {
      lines.push('## Conversation Details');
      lines.push(`- **Created:** ${new Date(conversation.createdAt).toLocaleString()}`);
      lines.push(`- **Updated:** ${new Date(conversation.updatedAt).toLocaleString()}`);
      lines.push(`- **Messages:** ${messages.length}`);
      lines.push(`- **AI Model:** ${conversation.config.model}`);
      if (conversation.config.systemPrompt) {
        lines.push(`- **System Prompt:** ${conversation.config.systemPrompt}`);
      }
      lines.push('');
    }
    
    lines.push('## Messages');
    lines.push('');
    
    // Messages
    messages.forEach((message, index) => {
      const sender = message.sender === MessageSender.USER ? '**You**' : '**AI**';
      const timestamp = options.includeTimestamps 
        ? ` _(${new Date(message.timestamp).toLocaleString()})_`
        : '';
      
      lines.push(`### ${sender}${timestamp}`);
      lines.push('');
      lines.push(message.content);
      
      if (options.includeMetadata && message.metadata) {
        const metadata = [];
        if (message.metadata.cost) metadata.push(`Cost: $${message.metadata.cost.toFixed(4)}`);
        if (message.metadata.tokensUsed) metadata.push(`Tokens: ${message.metadata.tokensUsed}`);
        if (message.metadata.edited) metadata.push('Edited');
        
        if (metadata.length > 0) {
          lines.push('');
          lines.push(`_${metadata.join(' • ')}_`);
        }
      }
      
      lines.push('');
      if (index < messages.length - 1) {
        lines.push('---');
        lines.push('');
      }
    });
    
    return lines.join('\n');
  };

  // Generate plain text format
  const generatePlainText = (messages: ChatMessage[]): string => {
    const lines: string[] = [];
    
    // Header
    lines.push(conversation.title);
    lines.push('='.repeat(conversation.title.length));
    lines.push('');
    
    if (options.includeMetadata) {
      lines.push('Conversation Details:');
      lines.push(`Created: ${new Date(conversation.createdAt).toLocaleString()}`);
      lines.push(`Updated: ${new Date(conversation.updatedAt).toLocaleString()}`);
      lines.push(`Messages: ${messages.length}`);
      lines.push(`AI Model: ${conversation.config.model}`);
      lines.push('');
    }
    
    // Messages
    messages.forEach((message, index) => {
      const sender = message.sender === MessageSender.USER ? 'You' : 'AI';
      const timestamp = options.includeTimestamps 
        ? ` (${new Date(message.timestamp).toLocaleString()})`
        : '';
      
      lines.push(`${sender}${timestamp}:`);
      lines.push(message.content);
      
      if (options.includeMetadata && message.metadata) {
        const metadata = [];
        if (message.metadata.cost) metadata.push(`Cost: $${message.metadata.cost.toFixed(4)}`);
        if (message.metadata.tokensUsed) metadata.push(`Tokens: ${message.metadata.tokensUsed}`);
        if (message.metadata.edited) metadata.push('Edited');
        
        if (metadata.length > 0) {
          lines.push(`[${metadata.join(' • ')}]`);
        }
      }
      
      if (index < messages.length - 1) {
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('');
      }
    });
    
    return lines.join('\n');
  };

  // Generate JSON format
  const generateJSON = (messages: ChatMessage[]): string => {
    const exportData = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        config: conversation.config,
      },
      messages: messages.map(message => ({
        id: message.id,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp,
        status: message.status,
        model: message.model,
        metadata: options.includeMetadata ? message.metadata : undefined,
      })),
      exportOptions: options,
      exportedAt: new Date().toISOString(),
    };
    
    return JSON.stringify(exportData, null, 2);
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const content = generateExportContent(options.format);
      
      if (options.format === 'pdf') {
        // For PDF, we'll use the browser's print functionality
        // In a real app, you might want to use a library like jsPDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>${conversation.title}</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 2rem; line-height: 1.6; }
                  .header { border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
                  .message { margin-bottom: 2rem; padding: 1rem; border: 1px solid #eee; border-radius: 8px; }
                  .user { background: #f0f9ff; }
                  .ai { background: #f9fafb; }
                  .sender { font-weight: bold; margin-bottom: 0.5rem; }
                  .timestamp { color: #666; font-size: 0.875rem; }
                  .content { white-space: pre-wrap; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>${conversation.title}</h1>
                  <div class="timestamp">Exported: ${new Date().toLocaleString()}</div>
                </div>
                ${getFilteredMessages().map(message => `
                  <div class="message ${message.sender}">
                    <div class="sender">
                      ${message.sender === MessageSender.USER ? 'You' : 'AI'}
                      ${options.includeTimestamps ? `<span class="timestamp"> - ${new Date(message.timestamp).toLocaleString()}</span>` : ''}
                    </div>
                    <div class="content">${message.content}</div>
                  </div>
                `).join('')}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        // Download as file
        const blob = new Blob([content], { 
          type: options.format === 'json' ? 'application/json' : 'text/plain' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      const content = generateExportContent(options.format);
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const filteredMessages = getFilteredMessages();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={options.format} onValueChange={(value: ExportOptions['format']) => 
              setOptions(prev => ({ ...prev, format: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Markdown (.md)</span>
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <span>Plain Text (.txt)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <span>JSON (.json)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    <span>PDF (Print)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label>Export Options</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="timestamps" className="text-sm">Include timestamps</Label>
              <Switch
                id="timestamps"
                checked={options.includeTimestamps}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeTimestamps: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="metadata" className="text-sm">Include metadata (costs, tokens)</Label>
              <Switch
                id="metadata"
                checked={options.includeMetadata}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeMetadata: checked }))
                }
              />
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <Label>Filters</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Date Range</Label>
                <Select value={options.dateRange} onValueChange={(value: ExportOptions['dateRange']) => 
                  setOptions(prev => ({ ...prev, dateRange: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All messages</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last week</SelectItem>
                    <SelectItem value="month">Last month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Message Types</Label>
                <Select value={options.messageTypes} onValueChange={(value: ExportOptions['messageTypes']) => 
                  setOptions(prev => ({ ...prev, messageTypes: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All messages</SelectItem>
                    <SelectItem value="user">Your messages only</SelectItem>
                    <SelectItem value="ai">AI messages only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview</Label>
              <Badge variant="outline">
                {filteredMessages.length} message{filteredMessages.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <Textarea
              value={generateExportContent(options.format).substring(0, 300) + '...'}
              readOnly
              className="h-24 text-xs font-mono resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copy to Clipboard
          </Button>
          
          <Button
            onClick={handleExport}
            disabled={isExporting || filteredMessages.length === 0}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {options.format === 'pdf' ? 'Print PDF' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}