'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useChatContext } from '@/contexts/chat-context';
import { 
  AI_MODELS, 
  RESPONSE_LENGTHS, 
  TEMPERATURE_PRESETS,
  type AIModelKey,
  type ResponseLength,
  type TemperaturePreset 
} from '@/types/chat';
import {
  Settings,
  Brain,
  Thermometer,
  FileText,
  Zap,
  DollarSign,
} from 'lucide-react';

interface ChatSettingsProps {
  className?: string;
}

export function ChatSettings({ className }: ChatSettingsProps) {
  const { config, updateConfig } = useChatContext();

  // Handle model change
  const handleModelChange = (model: string) => {
    updateConfig({ model: model as AIModelKey });
  };

  // Handle temperature change
  const handleTemperatureChange = (values: number[]) => {
    updateConfig({ temperature: values[0] });
  };

  // Handle temperature preset
  const handleTemperaturePreset = (preset: TemperaturePreset) => {
    updateConfig({ temperature: TEMPERATURE_PRESETS[preset].value });
  };

  // Handle response length change
  const handleResponseLengthChange = (length: ResponseLength) => {
    updateConfig({ maxTokens: RESPONSE_LENGTHS[length].maxTokens });
  };

  // Handle system prompt change
  const handleSystemPromptChange = (systemPrompt: string) => {
    updateConfig({ systemPrompt });
  };

  // Get current response length preset
  const getCurrentResponseLength = (): ResponseLength => {
    const { maxTokens = 500 } = config;
    for (const [key, value] of Object.entries(RESPONSE_LENGTHS)) {
      if (value.maxTokens === maxTokens) {
        return key as ResponseLength;
      }
    }
    return 'medium';
  };

  // Get current temperature preset
  const getCurrentTemperaturePreset = (): TemperaturePreset | null => {
    const { temperature = 0.7 } = config;
    for (const [key, value] of Object.entries(TEMPERATURE_PRESETS)) {
      if (Math.abs(value.value - temperature) < 0.05) {
        return key as TemperaturePreset;
      }
    }
    return null;
  };

  const currentModel = AI_MODELS[config.model as AIModelKey];
  const currentResponseLength = getCurrentResponseLength();
  const currentTemperaturePreset = getCurrentTemperaturePreset();

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle className="text-lg">Chat Settings</CardTitle>
          </div>
          <CardDescription>
            Customize your AI conversation experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* AI Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <Label className="text-sm font-medium">AI Model</Label>
            </div>
            
            <Select value={config.model} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AI_MODELS).map(([key, model]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.provider} • {model.speed}
                        </span>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        ${model.costPer1kTokens}/1k
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {currentModel && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  <span>Cost: ${currentModel.costPer1kTokens} per 1k tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  <span>Speed: {currentModel.speed}</span>
                </div>
              </div>
            )}
          </div>

          {/* Response Length */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <Label className="text-sm font-medium">Response Length</Label>
            </div>
            
            <Select value={currentResponseLength} onValueChange={handleResponseLengthChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESPONSE_LENGTHS).map(([key, length]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{length.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {length.description} • ~{length.maxTokens} tokens
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              <Label className="text-sm font-medium">Creativity (Temperature)</Label>
            </div>
            
            {/* Preset Buttons */}
            <div className="flex gap-2">
              {Object.entries(TEMPERATURE_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={currentTemperaturePreset === key ? "default" : "outline"}
                  onClick={() => handleTemperaturePreset(key as TemperaturePreset)}
                  className="flex-1"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            
            {/* Slider */}
            <div className="space-y-2">
              <Slider
                value={[config.temperature || 0.7]}
                onValueChange={handleTemperatureChange}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Focused (0.0)</span>
                <span className="font-medium">
                  Current: {(config.temperature || 0.7).toFixed(1)}
                </span>
                <span>Creative (1.0)</span>
              </div>
            </div>
            
            {/* Current preset description */}
            {currentTemperaturePreset && (
              <p className="text-xs text-muted-foreground">
                {TEMPERATURE_PRESETS[currentTemperaturePreset].description}
              </p>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">System Prompt</Label>
            <Textarea
              value={config.systemPrompt || ''}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              placeholder="Define how the AI should behave..."
              className="min-h-[100px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This prompt defines the AI's personality and behavior throughout the conversation.
            </p>
          </div>

          {/* Reset to Defaults */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateConfig({
                model: 'openai/gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 500,
                systemPrompt: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.',
              })}
              className="w-full"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}