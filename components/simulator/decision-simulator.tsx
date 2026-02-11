"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { GraphCanvas } from "./graph-canvas"
import { AIPanel, type AISuggestion } from "./ai-panel"
import { CommitmentOverlay } from "./commitment-overlay"
import type { DecisionSession, DecisionOption, CommitmentCard } from "@/lib/types"
import type { GraphState } from "@/lib/graph-types"
import {
  createInitialGraph,
  layoutOptionsRadially,
  addConsequenceNodes,
} from "@/lib/graph-types"
import { addDecision } from "@/lib/store"
import { Plus, Compass, Check, Sparkles, Loader2, ArrowRight, Vote } from "lucide-react"
import { cn } from "@/lib/utils"

type SimPhase = "start" | "brain-dump" | "map" | "commit-ready" | "complete"

export function DecisionSimulator() {
  const [phase, setPhase] = useState<SimPhase>("start")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [options, setOptions] = useState<DecisionOption[]>([])
  const [graph, setGraph] = useState<GraphState>(createInitialGraph("", 900, 600))
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [commitment, setCommitment] = useState<CommitmentCard | null>(null)
  const [showCommitment, setShowCommitment] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [completedSession, setCompletedSession] = useState<DecisionSession | null>(null)

  // AI state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [isAILoading, setIsAILoading] = useState(false)

  // Blind vote
  const [showBlindVote, setShowBlindVote] = useState(false)
  const [blindVoteResult, setBlindVoteResult] = useState<"relief" | "dread" | null>(null)

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId)

  // --- Brain Dump: get AI to auto-generate options ---
  async function handleGenerateWithAI() {
    if (!description.trim()) return
    setIsAILoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "brain-dump", title, description }),
      })
      const data = await res.json()
      if (data?.options) {
        const newOptions: DecisionOption[] = data.options.map(
          (opt: { label: string; consequences: { text: string; risk: "low" | "medium" | "high" }[] }) => ({
            id: crypto.randomUUID(),
            label: opt.label,
            consequences: opt.consequences.map((c) => ({
              id: crypto.randomUUID(),
              text: c.text,
              risk: c.risk,
              order: 1,
            })),
          })
        )
        setOptions(newOptions)

        // Auto-title from description
        if (!title.trim() && description.length > 10) {
          const autoTitle = description.slice(0, 60).split(".")[0].trim()
          setTitle(autoTitle || "My Decision")
        }

        // Build graph
        const finalTitle = title.trim() || description.slice(0, 60).split(".")[0].trim() || "My Decision"
        let g = createInitialGraph(finalTitle, 450, 300)
        g = layoutOptionsRadially(
          g,
          newOptions.map((o) => ({ id: o.id, label: o.label }))
        )
        // Add consequence nodes
        for (const opt of newOptions) {
          g = addConsequenceNodes(
            g,
            opt.id,
            opt.consequences.map((c) => ({ id: c.id, text: c.text, risk: c.risk }))
          )
        }
        setGraph(g)

        // Add insight as a suggestion
        if (data.insight) {
          setSuggestions((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "insight",
              content: data.insight,
            },
          ])
        }

        setPhase("map")
      }
    } catch {
      // fallback to generic
      const fallbackOptions: DecisionOption[] = [
        { id: crypto.randomUUID(), label: "Go for it", consequences: [] },
        { id: crypto.randomUUID(), label: "Stay the course", consequences: [] },
        { id: crypto.randomUUID(), label: "Find a compromise", consequences: [] },
      ]
      setOptions(fallbackOptions)
      const finalTitle = title.trim() || "My Decision"
      let g = createInitialGraph(finalTitle, 450, 300)
      g = layoutOptionsRadially(
        g,
        fallbackOptions.map((o) => ({ id: o.id, label: o.label }))
      )
      setGraph(g)
      setPhase("map")
    } finally {
      setIsAILoading(false)
    }
  }

  // --- Stress-test: get AI to suggest more consequences ---
  async function handleRequestSuggestions() {
    setIsAILoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stress-test",
          title,
          description,
          options: options.map((o) => ({
            id: o.id,
            label: o.label,
            consequences: o.consequences,
          })),
        }),
      })
      const data = await res.json()
      if (data?.suggestions) {
        const newSuggestions: AISuggestion[] = data.suggestions.map(
          (s: { optionLabel: string; consequence: string; risk: "low" | "medium" | "high"; reasoning: string }) => ({
            id: crypto.randomUUID(),
            type: "consequence" as const,
            content: s.consequence,
            detail: s.reasoning,
            risk: s.risk,
            optionLabel: s.optionLabel,
          })
        )
        setSuggestions((prev) => [...prev, ...newSuggestions])
      }
    } catch {
      // silently fail
    } finally {
      setIsAILoading(false)
    }
  }

  // --- Accept AI suggestion: add as consequence to the matching option ---
  function handleAcceptSuggestion(suggestion: AISuggestion) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, accepted: true } : s))
    )

    if (suggestion.type === "consequence" && suggestion.optionLabel) {
      const matchingOption = options.find(
        (o) => o.label.toLowerCase() === suggestion.optionLabel?.toLowerCase()
      )
      if (matchingOption) {
        const newCons = {
          id: crypto.randomUUID(),
          text: suggestion.content,
          risk: suggestion.risk ?? ("medium" as const),
          order: matchingOption.consequences.length + 1,
        }
        const updatedOptions = options.map((o) =>
          o.id === matchingOption.id
            ? { ...o, consequences: [...o.consequences, newCons] }
            : o
        )
        setOptions(updatedOptions)

        // Update graph
        setGraph((g) =>
          addConsequenceNodes(
            g,
            matchingOption.id,
            updatedOptions
              .find((o) => o.id === matchingOption.id)!
              .consequences.map((c) => ({ id: c.id, text: c.text, risk: c.risk }))
          )
        )
      }
    }
  }

  function handleRejectSuggestion(id: string) {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, rejected: true } : s)))
  }

  // --- Node drag ---
  const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }))
  }, [])

  // --- Select node: determine which option is highlighted ---
  function handleSelectNode(id: string | null) {
    setSelectedNodeId(id)
    if (!id) return
    const node = graph.nodes.find((n) => n.id === id)
    if (!node) return
    if (node.type === "option") {
      setSelectedOptionId(node.id)
    } else if (node.type === "consequence" && node.parentId) {
      setSelectedOptionId(node.parentId)
    }
  }

  // --- Blind vote ---
  function handleBlindVote(answer: "relief" | "dread") {
    setBlindVoteResult(answer)
    setShowBlindVote(false)
  }

  // --- Commitment AI draft ---
  async function handleAICommitmentDraft() {
    if (!selectedOptionId) return
    setIsAILoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "commitment",
          title,
          description,
          options: options.map((o) => ({
            ...o,
            selected: o.id === selectedOptionId,
          })),
        }),
      })
      const data = await res.json()
      if (data?.action) {
        setCommitment(data as CommitmentCard)
      }
    } catch {
      // silently fail
    } finally {
      setIsAILoading(false)
    }
  }

  // --- Commit decision ---
  function handleCommit() {
    if (!commitment) return
    const session: DecisionSession = {
      id: crypto.randomUUID(),
      title: title || "Untitled Decision",
      description,
      options,
      phase: "complete",
      selectedOptionId,
      commitment,
      createdAt: new Date().toISOString(),
      reflections: [],
    }
    addDecision(session)
    setCompletedSession(session)
    setJustCompleted(true)
    setPhase("complete")
  }

  // ===== START SCREEN =====
  if (phase === "start") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mx-auto max-w-lg space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <Compass className="h-8 w-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
              Decision Simulator
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              A graph-based workspace to map your decision, stress-test each option with AI,
              and commit with confidence.
            </p>
          </div>
          <Button
            onClick={() => setPhase("brain-dump")}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            Start New Decision
          </Button>
        </div>
      </div>
    )
  }

  // ===== BRAIN DUMP SCREEN =====
  if (phase === "brain-dump") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Brain Dump</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Describe the decision weighing on your mind. Be messy -- the AI will help you
            structure it into a visual map.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="space-y-4 pt-6">
            <Input
              placeholder="Give your decision a short title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-medium"
            />
            <Textarea
              placeholder="Describe your situation in detail. What's the context? What are you feeling? What's at stake? Don't filter yourself..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none text-sm leading-relaxed"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerateWithAI}
            disabled={!description.trim() || isAILoading}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            {isAILoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isAILoading ? "Generating Map..." : "Generate Decision Map"}
            {!isAILoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    )
  }

  // ===== COMPLETE SCREEN =====
  if (phase === "complete" && justCompleted && completedSession?.commitment) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Decision Committed
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your decision has been saved. Revisit it in Decision History to reflect
              on how things unfold.
            </p>
          </div>

          <Card className="border-2 border-accent/20 bg-card">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {completedSession.title}
              </h3>
              <div className="space-y-3 rounded-lg bg-background p-4">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    I am going to
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {completedSession.commitment.action}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-success">
                    WHY
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {completedSession.commitment.reason}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-destructive">
                    TRADE-OFF
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {completedSession.commitment.tradeoff}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setPhase("start")
                setTitle("")
                setDescription("")
                setOptions([])
                setGraph(createInitialGraph("", 900, 600))
                setSelectedNodeId(null)
                setSelectedOptionId(null)
                setCommitment(null)
                setShowCommitment(false)
                setJustCompleted(false)
                setCompletedSession(null)
                setSuggestions([])
                setBlindVoteResult(null)
                setShowBlindVote(false)
              }}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <Plus className="h-4 w-4" />
              Start Another Decision
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ===== GRAPH MAP VIEW (main workspace) =====
  const selectedOptionForCommit = options.find((o) => o.id === selectedOptionId)

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title || "Decision Map"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Click nodes to explore. Drag to rearrange. Use AI to stress-test.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedOptionId && !blindVoteResult && (
            <Button
              onClick={() => setShowBlindVote(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 border-accent/30 text-accent hover:bg-accent/10 bg-transparent"
            >
              <Vote className="h-3.5 w-3.5" />
              Blind Vote
            </Button>
          )}
          {blindVoteResult && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                blindVoteResult === "relief"
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-foreground"
              )}
            >
              Gut: {blindVoteResult}
            </span>
          )}
          {selectedOptionId && (
            <Button
              onClick={() => setShowCommitment(true)}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              size="sm"
            >
              Sign & Commit
            </Button>
          )}
        </div>
      </div>

      {/* Blind vote modal */}
      {showBlindVote && selectedOptionForCommit && (
        <Card className="border-2 border-accent/20 bg-card">
          <CardContent className="flex flex-col items-center gap-5 py-8">
            <h3 className="text-lg font-semibold text-foreground">The Blind Vote</h3>
            <p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              Imagine you are forced to take{" "}
              <strong className="text-foreground">
                &quot;{selectedOptionForCommit.label}&quot;
              </strong>{" "}
              right now. No more deliberation. It&apos;s done.
            </p>
            <p className="text-base font-medium text-foreground">
              Do you feel relief or dread?
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => handleBlindVote("relief")}
                className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                size="lg"
              >
                Relief
              </Button>
              <Button
                onClick={() => handleBlindVote("dread")}
                variant="outline"
                className="gap-2 border-warning/30 text-foreground hover:bg-warning/10 bg-transparent"
                size="lg"
              >
                Dread
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main workspace: graph + AI panel */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <GraphCanvas
            graph={graph}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onNodeDrag={handleNodeDrag}
            highlightedOptionId={selectedOptionId}
            className="h-[500px] lg:h-[560px]"
          />

          {/* Commitment overlay on top of graph */}
          {showCommitment && selectedOptionForCommit && (
            <CommitmentOverlay
              commitment={commitment}
              selectedOptionLabel={selectedOptionForCommit.label}
              onUpdate={setCommitment}
              onCommit={handleCommit}
              onClose={() => setShowCommitment(false)}
              onAISuggest={handleAICommitmentDraft}
              isAILoading={isAILoading}
            />
          )}
        </div>

        {/* AI Side Panel */}
        <div className="hidden lg:block">
          <AIPanel
            suggestions={suggestions}
            isLoading={isAILoading}
            selectedNodeLabel={selectedNode?.label}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
            onRequestSuggestions={handleRequestSuggestions}
          />
        </div>
      </div>

      {/* Mobile AI button */}
      <div className="lg:hidden">
        <MobileAIPanel
          suggestions={suggestions}
          isLoading={isAILoading}
          selectedNodeLabel={selectedNode?.label}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
          onRequestSuggestions={handleRequestSuggestions}
        />
      </div>
    </div>
  )
}

// Mobile-friendly AI panel that expands from bottom
function MobileAIPanel(props: {
  suggestions: AISuggestion[]
  isLoading: boolean
  selectedNodeLabel?: string
  onAccept: (s: AISuggestion) => void
  onReject: (id: string) => void
  onRequestSuggestions: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const activeSuggestions = props.suggestions.filter((s) => !s.accepted && !s.rejected)

  return (
    <div>
      <Button
        onClick={() => setExpanded(!expanded)}
        variant="outline"
        className="w-full gap-2 bg-transparent"
      >
        <Sparkles className="h-4 w-4" />
        AI Coach
        {activeSuggestions.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
            {activeSuggestions.length}
          </span>
        )}
      </Button>
      {expanded && (
        <div className="mt-2">
          <AIPanel {...props} className="w-full" />
        </div>
      )}
    </div>
  )
}
