"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Send,
  Sparkles,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Brain,
  Target,
  Eye,
  Zap,
  Lightbulb,
} from "lucide-react"
import type { DecisionOption } from "@/lib/types"

export interface ChatMessage {
  id: string
  role: "user" | "ai"
  content: string
  framework?: string
  suggestedNodes?: {
    label: string
    type: "option" | "consequence"
    parentLabel?: string
    risk?: "low" | "medium" | "high"
  }[]
  timestamp: Date
}

interface SocraticSidebarProps {
  title: string
  description: string
  options: DecisionOption[]
  selectedNodeLabel?: string
  onSendMessage: (message: string) => Promise<ChatMessage | null>
  messages: ChatMessage[]
  isLoading: boolean
  onAcceptNode?: (node: { label: string; type: string; parentLabel?: string; risk?: string }) => void
  className?: string
}

const frameworkInfo: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "fear-setting": { label: "Fear Setting", icon: Eye, color: "text-red-400" },
  "opportunity-cost": { label: "Opportunity Cost", icon: Target, color: "text-amber-500" },
  "pre-mortem": { label: "Pre-Mortem", icon: Brain, color: "text-purple-400" },
  "first-principles": { label: "First Principles", icon: Zap, color: "text-blue-400" },
  "general": { label: "Insight", icon: Lightbulb, color: "text-accent" },
}

export function SocraticSidebar({
  title,
  description,
  options,
  selectedNodeLabel,
  onSendMessage,
  messages,
  isLoading,
  onAcceptNode,
  className,
}: SocraticSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  async function handleSend() {
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput("")
    await onSendMessage(msg)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center py-3 px-1", className)}>
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/95 backdrop-blur-sm text-muted-foreground shadow-md transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Open Socratic Sidebar"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {messages.length > 0 && (
          <div className="mt-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] font-semibold text-white">
            {messages.filter(m => m.role === "ai").length}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex w-80 flex-col border-l border-border bg-card/95 backdrop-blur-sm shadow-lg",
        className
      )}
      style={{ height: "100%" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Socratic Guide</span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Collapse panel"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Context bar */}
      {selectedNodeLabel && (
        <div className="border-b border-border bg-purple-50/50 px-4 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400">Observing</p>
          <p className="text-xs font-medium text-foreground truncate">{selectedNodeLabel}</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 chat-scroll space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Brain className="h-6 w-6 text-purple-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">I observe your canvas</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                Ask me anything about your decision. I&apos;ll challenge your thinking with the right mental model.
              </p>
            </div>
            {/* Quick prompts */}
            <div className="flex flex-col gap-1.5 w-full mt-2">
              {[
                "What am I not seeing?",
                "Stress test my options",
                "What's the worst case?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setInput(prompt)
                    inputRef.current?.focus()
                  }}
                  className="rounded-lg border border-dashed border-purple-200 px-3 py-2 text-left text-xs text-purple-600 transition-colors hover:bg-purple-50 hover:border-purple-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-purple-50 border border-purple-100"
              )}
            >
              {/* Framework badge */}
              {msg.framework && msg.framework !== "general" && frameworkInfo[msg.framework] && (
                <div className="flex items-center gap-1 mb-1.5">
                  {(() => {
                    const info = frameworkInfo[msg.framework!]
                    const Icon = info.icon
                    return (
                      <>
                        <Icon className={cn("h-3 w-3", info.color)} />
                        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", info.color)}>
                          {info.label}
                        </span>
                      </>
                    )
                  })()}
                </div>
              )}

              <p className={cn(
                "text-sm leading-relaxed",
                msg.role === "ai" ? "text-foreground" : ""
              )}>
                {msg.content}
              </p>

              {/* Suggested nodes */}
              {msg.suggestedNodes && msg.suggestedNodes.length > 0 && onAcceptNode && (
                <div className="mt-2 space-y-1.5 border-t border-purple-100 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                    Suggested nodes
                  </p>
                  {msg.suggestedNodes.map((node, i) => (
                    <button
                      key={`${msg.id}-node-${i}`}
                      type="button"
                      onClick={() => onAcceptNode(node)}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-purple-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:bg-purple-50 hover:border-purple-400"
                    >
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-100">
                        <span className="text-[8px] font-bold text-purple-500">+</span>
                      </div>
                      <span className="text-xs text-foreground flex-1 break-words">{node.label}</span>
                      {node.risk && (
                        <span className={cn(
                          "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          node.risk === "high" ? "bg-red-50 text-red-500" :
                          node.risk === "medium" ? "bg-amber-50 text-amber-600" :
                          "bg-green-50 text-green-600"
                        )}>
                          {node.risk}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
              <span className="text-xs text-purple-600">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your decision..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-400"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="h-9 w-9 p-0 bg-purple-500 hover:bg-purple-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
