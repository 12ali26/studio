"use client"

import * as React from "react"
import {
  Briefcase,
  Code,
  CornerDownLeft,
  Lightbulb,
  Mic,
  Paperclip,
  Scale,
  Send,
  User,
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

type Message = {
  id: number
  type: "user" | "ai"
  persona?: {
    name: string
    icon: React.ReactNode
  }
  content: string
}

const aiPersonas = [
  { name: "Chief Financial Officer", icon: <Briefcase className="h-6 w-6" /> },
  { name: "Legal Counsel", icon: <Scale className="h-6 w-6" /> },
  { name: "Tech Lead", icon: <Code className="h-6 w-6" /> },
  { name: "Marketing Strategist", icon: <Lightbulb className="h-6 w-6" /> },
]

export function DebateView() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [suggestedTitle, setSuggestedTitle] = React.useState("New Debate")

  const formRef = React.useRef<HTMLFormElement>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)

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

    // AI generates a title
    const titleResult = await conversationStarter({ topic });
    setSuggestedTitle(titleResult.suggestedTitle);

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        content: topic,
        persona: { name: "You", icon: <User className="h-6 w-6" /> },
      },
    ]);

    // AI suggests personas
    const personaResult = await suggestAIPersonas({ topic });

    // Simulate AI responses
    const simulatedResponses = personaResult.personas.map((personaName, index) => {
      const persona = aiPersonas.find(p => personaName.includes(p.name)) || aiPersonas[index % aiPersonas.length];
      return {
        id: Date.now() + index + 1,
        type: "ai",
        persona: persona,
        content: `Simulating response from ${persona.name} about "${topic}"... Key arguments would focus on financial viability, risk analysis, and long-term profitability. We need to consider market trends and potential ROI before committing resources. This is a placeholder for a real AI-generated response.`,
      };
    });

    for (let i = 0; i < simulatedResponses.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        setMessages(prev => [...prev, simulatedResponses[i]]);
    }
    
    setIsLoading(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    startDebate(input)
    setInput("")
  }

  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
       <div className="flex-1">
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold font-headline text-center mb-2">{suggestedTitle}</h1>
            <p className="text-center text-muted-foreground mb-6">An AI-powered boardroom discussion</p>
        </div>
        <ScrollArea className="h-[calc(100vh-20rem)]" ref={scrollAreaRef}>
          <div className="container mx-auto py-4 space-y-8">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground pt-16">
                <BrainCircuit size={48} className="mx-auto mb-4 text-accent" />
                <h2 className="text-xl font-headline">Welcome to the Boardroom</h2>
                <p>Enter a topic below to begin the debate.</p>
              </div>
            )}
            {messages.map((message) => (
              <AgentCard
                key={message.id}
                personaName={message.persona?.name || "Agent"}
                icon={message.persona?.icon || <User />}
                message={message.content}
                isUser={message.type === "user"}
              />
            ))}
            {isLoading && messages.length > 0 && (
                <AgentCard
                    personaName="Thinking..."
                    icon={<Lightbulb className="h-6 w-6 animate-pulse" />}
                    message="The board is deliberating..."
                    isLoading
                />
            )}
          </div>
        </ScrollArea>
      </div>
      <div className="px-4">
      <Separator className="my-4" />
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
          <Button type="submit" size="sm" className="ml-auto gap-1.5" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Start Debate'}
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
