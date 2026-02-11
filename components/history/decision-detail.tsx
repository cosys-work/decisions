"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  FileSignature,
  MessageSquare,
  Plus,
  Shield,
  AlertTriangle,
  ThumbsUp,
  Minus,
  ThumbsDown,
  Clock,
} from "lucide-react"
import type { DecisionSession } from "@/lib/types"
import { cn } from "@/lib/utils"

interface DecisionDetailProps {
  decision: DecisionSession
  onBack: () => void
  onAddReflection: (decisionId: string, text: string, sentiment: "positive" | "neutral" | "negative") => void
}

export function DecisionDetail({ decision, onBack, onAddReflection }: DecisionDetailProps) {
  const [newReflection, setNewReflection] = useState("")
  const [newSentiment, setNewSentiment] = useState<"positive" | "neutral" | "negative">("neutral")
  const [showReflectionForm, setShowReflectionForm] = useState(false)

  const selectedOption = decision.options.find((o) => o.id === decision.selectedOptionId)
  const createdDate = new Date(decision.createdAt)
  const daysSince = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

  function handleSubmitReflection() {
    if (!newReflection.trim()) return
    onAddReflection(decision.id, newReflection.trim(), newSentiment)
    setNewReflection("")
    setNewSentiment("neutral")
    setShowReflectionForm(false)
  }

  const sentimentIcons = {
    positive: ThumbsUp,
    neutral: Minus,
    negative: ThumbsDown,
  }

  const sentimentColors = {
    positive: "text-success",
    neutral: "text-muted-foreground",
    negative: "text-destructive",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{decision.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {createdDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span>{daysSince} days ago</span>
          <Badge variant="outline" className="border-success/20 bg-success/5 text-success">
            Committed
          </Badge>
        </div>
      </div>

      {decision.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{decision.description}</p>
      )}

      {decision.commitment && (
        <Card className="border-2 border-accent/20 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Decision Memo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-background p-4">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">I am going to</span>
                  <p className="text-sm font-medium text-foreground">{decision.commitment.action}</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Because</span>
                  <p className="text-sm font-medium text-foreground">{decision.commitment.reason}</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">I accept this trade-off</span>
                  <p className="text-sm font-medium text-foreground">{decision.commitment.tradeoff}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {decision.options.map((option, idx) => {
          const isChosen = option.id === decision.selectedOptionId
          return (
            <Card
              key={option.id}
              className={cn(
                "border",
                isChosen ? "border-accent/30 bg-accent/5" : "border-border bg-card opacity-60"
              )}
            >
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                    isChosen ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-medium text-card-foreground">{option.label}</span>
                  {isChosen && (
                    <Badge className="ml-auto bg-accent text-accent-foreground text-[10px]">Chosen</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {option.consequences.map((c) => (
                    <div key={c.id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      {c.risk === "high" ? (
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                      ) : (
                        <Shield className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                      )}
                      {c.text}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Reflections</h2>
            <span className="text-sm text-muted-foreground">({decision.reflections.length})</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReflectionForm(!showReflectionForm)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Reflection
          </Button>
        </div>

        {showReflectionForm && (
          <Card className="border-dashed border-accent/30 bg-accent/5">
            <CardContent className="space-y-3 pt-4">
              <Textarea
                placeholder="How are things going since you made this decision? Any new insights, regrets, or unexpected outcomes?"
                value={newReflection}
                onChange={(e) => setNewReflection(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">How are you feeling?</span>
                  {(["positive", "neutral", "negative"] as const).map((s) => {
                    const Icon = sentimentIcons[s]
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewSentiment(s)}
                        className={cn(
                          "rounded-full p-1.5 transition-colors",
                          newSentiment === s ? "bg-muted" : "hover:bg-muted/50"
                        )}
                        aria-label={s}
                      >
                        <Icon className={cn("h-4 w-4", sentimentColors[s])} />
                      </button>
                    )
                  })}
                </div>
                <Button
                  size="sm"
                  onClick={handleSubmitReflection}
                  disabled={!newReflection.trim()}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {decision.reflections.length === 0 && !showReflectionForm ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reflections yet. Check back in a few days to record how things are going.
          </p>
        ) : (
          <div className="space-y-3">
            {decision.reflections
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((reflection) => {
                const Icon = sentimentIcons[reflection.sentiment]
                const reflDate = new Date(reflection.createdAt)
                return (
                  <Card key={reflection.id} className="border-border bg-card">
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          reflection.sentiment === "positive" && "bg-success/10",
                          reflection.sentiment === "neutral" && "bg-muted",
                          reflection.sentiment === "negative" && "bg-destructive/10"
                        )}>
                          <Icon className={cn("h-3.5 w-3.5", sentimentColors[reflection.sentiment])} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-relaxed text-foreground">{reflection.text}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {reflDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
