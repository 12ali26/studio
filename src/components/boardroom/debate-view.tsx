"use client"

import * as React from "react"
import {
  BrainCircuit,
  Mic,
  Paperclip,
  Send,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AgentCard } from "@/components/boardroom/agent-card"
import { Separator } from "@/components/ui/separator"
import { conversationStarter } from "@/ai/flows/conversation-starter"
import { suggestAIPersonas } from "@/ai/flows/ai-persona-selector"
import { getOpenRouterModels, type OpenRouterModel } from "@/ai/flows/get-openrouter-models"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getPersonaByName, userPersona, type Persona } from "@/lib/personas"

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  persona: Persona
}

export function DebateView() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [suggestedTitle, setSuggestedTitle] = React.useState("New Debate")
  const [models, setModels] = React.useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<string>("openai/gpt-3.5-turbo");

  const formRef = React.useRef<HTMLFormElement>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  React.useEffect(() => {
    async function fetchModels() {
      try {
        const { models: fetchedModels } = await getOpenRouterModels();
        setModels(fetchedModels);
        if (fetchedModels.length > 0 && !fetchedModels.find(m => m.id === selectedModel)) {
          setSelectedModel(fetchedModels[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch models", error);
        toast({
            variant: "destructive",
            title: "Failed to fetch models",
            description: "Could not retrieve model list from OpenRouter.",
        })
      }
    }
    fetchModels();
  }, [toast, selectedModel]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector("div[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }

  React.useEffect(() => {
    scrollToBottom();
  }, [messages])

  const handleInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInput(event.target.value)
  }

  const startDebate = async (topic: string) => {
    setIsLoading(true);
    setMessages([]);

    try {
      const titleResult = await conversationStarter({ topic });
      setSuggestedTitle(titleResult.suggestedTitle);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: topic,
        persona: userPersona,
      };
      setMessages([userMessage]);

      const personaResult = await suggestAIPersonas({ topic });
      const personasToDebate = personaResult.personas
        .map(personaName => getPersonaByName(personaName))
        .filter((p): p is Persona => !!p);

      if (personasToDebate.length === 0) {
        throw new Error("Could not select relevant AI personas for the topic.");
      }

      let currentHistory: {role: 'user' | 'assistant', content: string}[] = [{ role: 'user', content: topic }];

      for (const persona of personasToDebate) {
        const assistantId = (Date.now() + Math.random()).toString();
        const assistantMessage: Message = {
          id: assistantId,
          role: 'assistant',
          content: '',
          persona: persona,
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Use the detailed prompt from the persona object
        const systemPrompt = `${persona.prompt} The user's topic is: "${topic}". Base your response on the conversation so far. Provide a concise, well-reasoned opening statement from your perspective.`;
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...currentHistory
                ],
            }),
        });

        if (!response.ok || !response.body) {
          const errorText = response ? await response.text() : 'No response from server';
          throw new Error(`API error: ${response.status} ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data:')) continue;
            
            const jsonStr = line.replace(/^data: /, '');
            if (jsonStr === '[DONE]') {
              break;
            }
            
            try {
              const chunk = JSON.parse(jsonStr);
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, content: fullResponse } : m
                ));
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', jsonStr, e);
            }
          }
        }
        currentHistory.push({ role: 'assistant', content: fullResponse });
      }

    } catch (error: any) {
        console.error("Debate failed:", error);
        toast({
            variant: "destructive",
            title: "Debate Generation Failed",
            description: error.message || "An unknown error occurred.",
        })
    } finally {
        setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    startDebate(input)
    setInput("")
  }

  const modelCategories = models.reduce((acc, model) => {
    const category = model.category || 'Standard';
    if (!acc[category]) acc[category] = [];
    acc[category].push(model);
    return acc;
  }, {} as Record<string, OpenRouterModel[]>);

  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
       <div className="flex-1">
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold font-headline text-center mb-2">{suggestedTitle}</h1>
            <p className="text-center text-muted-foreground mb-6">An AI-powered boardroom discussion</p>
        </div>
        <ScrollArea className="h-[calc(100vh-25rem)]" ref={scrollAreaRef}>
          <div className="container mx-auto py-4 space-y-8">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground pt-16">
                <BrainCircuit size={48} className="mx-auto mb-4 text-accent" />
                <h2 className="text-xl font-headline">Welcome to the Boardroom</h2>
                <p>Enter a topic and select a model below to begin the debate.</p>
              </div>
            )}
            {messages.map((message) => (
              <AgentCard
                key={message.id}
                personaName={message.persona.name}
                personaTitle={message.persona.title}
                icon={message.persona.icon}
                message={message.content}
                isUser={message.role === "user"}
                isLoading={isLoading && message.role === 'assistant' && message.content.length === 0}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="px-4">
        <Separator className="my-4" />
        <div className="mx-auto max-w-2xl">
          <div className="mb-4">
              <Label htmlFor="model-select" className="mb-2 block">Select AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                  <SelectTrigger id="model-select" className="w-full">
                      <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                      {['Premium', 'Standard', 'Budget'].map(category => 
                          modelCategories[category] && (
                              <SelectGroup key={category}>
                                  <SelectLabel>{category}</SelectLabel>
                                  {modelCategories[category].map(model => (
                                      <SelectItem key={model.id} value={model.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{model.name}</span>
                                            <span className="text-xs text-muted-foreground ml-4">
                                              {model.pricing.prompt ? `$${(parseFloat(model.pricing.prompt) * 1000).toFixed(4)}/1k` : ''}
                                            </span>
                                        </div>
                                      </SelectItem>
                                  ))}
                              </SelectGroup>
                          )
                      )}
                  </SelectContent>
              </Select>
          </div>
          <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
          >
              <Textarea
              id="message"
              placeholder="Enter a topic to debate, e.g., 'Should we invest in quantum computing?'"
              className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      formRef.current?.requestSubmit();
                  }
              }}
              disabled={isLoading}
              />
              <div className="flex items-center p-3 pt-0">
              <TooltipProvider>
                  <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" disabled>
                      <Paperclip className="h-4 w-4" />
                      <span className="sr-only">Attach file</span>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Attach File</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" disabled>
                      <Mic className="h-4 w-4" />
                      <span className="sr-only">Use Microphone</span>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Use Microphone</TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <Button type="submit" size="sm" className="ml-auto gap-1.5" disabled={isLoading || !input.trim()}>
                  {isLoading ? 'Generating...' : 'Start Debate'}
                  <Send className="h-3.5 w-3.5" />
              </Button>
              </div>
          </form>
        </div>
      </div>
    </div>
  )
}
