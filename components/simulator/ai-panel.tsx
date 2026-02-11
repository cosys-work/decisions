"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, X, Sparkles, Loader2, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react"

export interface AISuggestion {
  id: string
  type: "option" | "consequence" | "insight" | "commitment"
  content: string
  detail?: string
  risk?: "low" | "medium" | "high"
  optionLabel?: string
  accepted?: boolean
  rejected?: boolean
}

interface AIPanelProps {
  suggestions: AISuggestion[]
  isLoading: boolean
  selectedNodeLabel?: string
  onAccept: (suggestion: AISuggestion) => void
  onReject: (id: string) => void
  onRequestSuggestions: () => void
  className?: string
}

export function AIPanel({
  suggestions,
  isLoading,
  selectedNodeLabel,
  onAccept,
  onReject,
  onRequestSuggestions,
  className,
}: AIPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  const activeSuggestions = suggestions.filter((s) => !s.accepted && !s.rejected)
  const processedSuggestions = suggestions.filter((s) => s.accepted || s.rejected)

  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Open AI panel"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {activeSuggestions.length > 0 && (
          <div className="mt-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
            {activeSuggestions.length}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex w-80 flex-col rounded-xl border border-border bg-card shadow-lg",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">AI Coach</span>
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

      {/* Selected node context */}
      {selectedNodeLabel && (
        <div className="border-b border-border bg-secondary/50 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">Focused on</p>
          <p className="text-sm font-medium text-foreground truncate">{selectedNodeLabel}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "400px" }}>
        {suggestions.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">No suggestions yet</p>
              <p className="text-xs text-muted-foreground/70">
                Click below to get AI-powered insights for your decision.
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="text-xs text-muted-foreground">Analyzing your decision...</p>
          </div>
        )}

        <div className="space-y-3">
          {activeSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={() => onAccept(suggestion)}
              onReject={() => onReject(suggestion.id)}
            />
          ))}

          {processedSuggestions.length > 0 && activeSuggestions.length > 0 && (
            <div className="my-2 border-t border-border" />
          )}

          {processedSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={cn(
                "rounded-lg px-3 py-2 text-xs opacity-60",
                suggestion.accepted ? "bg-success/5 text-success" : "bg-muted text-muted-foreground line-through"
              )}
            >
              {suggestion.content}
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="border-t border-border p-3">
        <Button
          onClick={onRequestSuggestions}
          disabled={isLoading}
          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isLoading ? "Thinking..." : "Get AI Suggestions"}
        </Button>
      </div>
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: {
  suggestion: AISuggestion
  onAccept: () => void
  onReject: () => void
}) {
  const riskColors = {
    low: "bg-success/10 text-success",
    medium: "bg-warning/10 text-warning-foreground",
    high: "bg-destructive/10 text-destructive",
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      {suggestion.optionLabel && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {suggestion.optionLabel}
        </p>
      )}
      <p className="text-sm leading-relaxed text-foreground">{suggestion.content}</p>
      {suggestion.detail && (
        <p className="text-xs leading-relaxed text-muted-foreground">{suggestion.detail}</p>
      )}
      {suggestion.risk && (
        <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", riskColors[suggestion.risk])}>
          {suggestion.risk} risk
        </span>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={onAccept}
          size="sm"
          className="h-7 gap-1 bg-success text-success-foreground hover:bg-success/90 text-xs"
        >
          <Check className="h-3 w-3" />
          Accept
        </Button>
        <Button
          onClick={onReject}
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
          Dismiss
        </Button>
      </div>
    </div>
  )
}
