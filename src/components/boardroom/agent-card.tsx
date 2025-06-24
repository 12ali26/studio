"use client"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "../ui/skeleton"

type AgentCardProps = {
  icon: React.ReactNode
  personaName: string
  message: string
  isUser?: boolean
  isLoading?: boolean
}

export function AgentCard({
  icon,
  personaName,
  message,
  isUser = false,
  isLoading = false,
}: AgentCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 animate-in fade-in-50 slide-in-from-bottom-5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-accent" : "bg-primary"
        )}
      >
        <AvatarFallback className="bg-transparent text-primary-foreground">
          {icon}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex-grow rounded-xl border p-4 max-w-[75%]",
          "bg-card/50 backdrop-blur-sm",
          isUser
            ? "rounded-br-none bg-accent/20 border-accent/30"
            : "rounded-bl-none border-border"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 mb-2",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <p className="font-bold font-headline text-sm">{personaName}</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        ) : (
          <div className="prose prose-sm prose-invert text-foreground max-w-none">
            {message.split('\n').map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">{line}</p>
            ))}
            {/* Blinking cursor effect for streaming messages */}
            {message.length === 0 && !isUser && <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-1"></span>}
          </div>
        )}
      </div>
    </div>
  )
}
