"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { GraphCanvas } from "./graph-canvas"
import { SocraticSidebar, type ChatMessage } from "./socratic-sidebar"
import { CommitmentOverlay } from "./commitment-overlay"
import type { DecisionSession, DecisionOption, CommitmentCard } from "@/lib/types"
import type { GraphState } from "@/lib/graph-types"
import {
  createInitialGraph,
  layoutOptionsRadially,
  addConsequenceNodes,
} from "@/lib/graph-types"
import { addDecision } from "@/lib/store"
import { Plus, Compass, Check, Sparkles, Loader2, ArrowRight, Vote, Wand2 } from "lucide-react"
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

  // Chat / Socratic Sidebar state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
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

        if (!title.trim() && description.length > 10) {
          const autoTitle = description.slice(0, 60).split(".")[0].trim()
          setTitle(autoTitle || "My Decision")
        }

        const finalTitle = title.trim() || description.slice(0, 60).split(".")[0].trim() || "My Decision"
        let g = createInitialGraph(finalTitle, 450, 300)
        g = layoutOptionsRadially(
          g,
          newOptions.map((o) => ({ id: o.id, label: o.label }))
        )
        for (const opt of newOptions) {
          g = addConsequenceNodes(
            g,
            opt.id,
            opt.consequences.map((c) => ({ id: c.id, text: c.text, risk: c.risk }))
          )
        }
        setGraph(g)

        // Add AI's initial insight as a chat message
        if (data.insight) {
          setChatMessages([{
            id: crypto.randomUUID(),
            role: "ai",
            content: data.insight,
            framework: "general",
            timestamp: new Date(),
          }])
        }

        setPhase("map")
      }
    } catch {
      // Fallback: create basic options from description keywords when API fails
      const finalTitle = title.trim() || description.slice(0, 60).split(".")[0].trim() || "My Decision"
      setTitle((t) => t || finalTitle)
      
      const fallbackOptions: DecisionOption[] = [
        { id: crypto.randomUUID(), label: "Go ahead with it", consequences: [] },
        { id: crypto.randomUUID(), label: "Stay the current course", consequences: [] },
        { id: crypto.randomUUID(), label: "Find a middle ground", consequences: [] },
      ]
      setOptions(fallbackOptions)
      
      let g = createInitialGraph(finalTitle, 450, 300)
      g = layoutOptionsRadially(
        g,
        fallbackOptions.map((o) => ({ id: o.id, label: o.label }))
      )
      setGraph(g)

      // Inform via chat that AI is unavailable
      setChatMessages([{
        id: crypto.randomUUID(),
        role: "ai",
        content: "I couldn't connect to the AI service. Please check that your GOOGLE_GENERATIVE_AI_API_KEY is configured in .env.local. You can still use the canvas manually — drag out branches, add consequences, and explore your options.",
        timestamp: new Date(),
      }])

      setPhase("map")
    } finally {
      setIsAILoading(false)
    }
  }

  // --- Socratic Sidebar: send chat message ---
  async function handleSendChatMessage(message: string): Promise<ChatMessage | null> {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMsg])
    setIsAILoading(true)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chat",
          title,
          description,
          message,
          canvasState: {
            options: options.map((o) => ({
              label: o.label,
              consequences: o.consequences.map((c) => ({ text: c.text, risk: c.risk })),
            })),
          },
        }),
      })
      const data = await res.json()
      if (data?.message) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "ai",
          content: data.message,
          framework: data.framework,
          suggestedNodes: data.suggestedNodes,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, aiMsg])

        // Auto-add ghost nodes to canvas if suggested
        if (data.suggestedNodes && data.suggestedNodes.length > 0) {
          addGhostNodesToCanvas(data.suggestedNodes)
        }

        return aiMsg
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: "I had trouble processing that. Could you rephrase your question?",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsAILoading(false)
    }
    return null
  }

  // --- Add ghost nodes to canvas (AI suggestions) ---
  function addGhostNodesToCanvas(suggestedNodes: { label: string; type: string; parentLabel?: string; risk?: string }[]) {
    setGraph((g) => {
      let newGraph = { ...g, nodes: [...g.nodes], edges: [...g.edges] }
      for (const sn of suggestedNodes) {
        const ghostId = `ghost-${crypto.randomUUID()}`
        if (sn.type === "consequence" && sn.parentLabel) {
          const parentOption = newGraph.nodes.find(
            (n) => n.type === "option" && n.label.toLowerCase() === sn.parentLabel?.toLowerCase()
          )
          if (parentOption) {
            // Position near the parent option
            const angle = Math.random() * Math.PI * 0.8 + Math.PI * 0.1
            const dist = 130
            newGraph.nodes.push({
              id: ghostId,
              type: "consequence",
              label: sn.label,
              x: parentOption.x + dist * Math.cos(angle),
              y: parentOption.y + dist * Math.sin(angle),
              risk: (sn.risk as "low" | "medium" | "high") || "medium",
              parentId: parentOption.id,
              optionId: parentOption.id,
              isGhost: true,
            })
            newGraph.edges.push({
              id: `edge-ghost-${ghostId}`,
              from: parentOption.id,
              to: ghostId,
            })
          }
        } else if (sn.type === "option") {
          const centerNode = newGraph.nodes.find((n) => n.type === "center")
          if (centerNode) {
            const angle = Math.random() * Math.PI * 2
            const dist = 220
            newGraph.nodes.push({
              id: ghostId,
              type: "option",
              label: sn.label,
              x: centerNode.x + dist * Math.cos(angle),
              y: centerNode.y + dist * Math.sin(angle),
              isGhost: true,
            })
            newGraph.edges.push({
              id: `edge-ghost-${ghostId}`,
              from: "center",
              to: ghostId,
            })
          }
        }
      }
      return newGraph
    })
  }

  // --- Accept ghost node: convert to real node ---
  function handleAcceptGhost(nodeId: string) {
    const ghostNode = graph.nodes.find((n) => n.id === nodeId && n.isGhost)
    if (!ghostNode) return

    // Convert ghost to real node
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === nodeId ? { ...n, isGhost: false } : n
      ),
    }))

    // Add to options data model if it's a consequence
    if (ghostNode.type === "consequence" && ghostNode.parentId) {
      const newCons = {
        id: nodeId,
        text: ghostNode.label,
        risk: ghostNode.risk ?? ("medium" as const),
        order: 99,
      }
      setOptions((prev) =>
        prev.map((o) =>
          o.id === ghostNode.parentId
            ? { ...o, consequences: [...o.consequences, newCons] }
            : o
        )
      )
    }
  }

  // --- Reject ghost node: remove from canvas ---
  function handleRejectGhost(nodeId: string) {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => n.id !== nodeId),
      edges: g.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    }))
  }

  // --- Accept suggested node from sidebar ---
  function handleAcceptNodeFromSidebar(node: { label: string; type: string; parentLabel?: string; risk?: string }) {
    addGhostNodesToCanvas([node])
  }

  // --- Magic Expand: AI auto-suggests consequences for all options ---
  async function handleMagicExpand() {
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
        const ghostNodes = data.suggestions.map(
          (s: { optionLabel: string; consequence: string; risk: string }) => ({
            label: s.consequence,
            type: "consequence" as const,
            parentLabel: s.optionLabel,
            risk: s.risk,
          })
        )
        addGhostNodesToCanvas(ghostNodes)

        // Add chat message about the expansion
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ai",
            content: `I've added ${ghostNodes.length} suggested consequences as ghost nodes on your canvas. Review each one and accept or dismiss it.`,
            framework: "general",
            timestamp: new Date(),
          },
        ])
      }
    } catch {
      // silently fail
    } finally {
      setIsAILoading(false)
    }
  }

  // --- Node drag ---
  const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }))
  }, [])

  // --- Select node ---
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

  // --- Reset ---
  function handleReset() {
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
    setChatMessages([])
    setBlindVoteResult(null)
    setShowBlindVote(false)
  }

  // ===== START SCREEN =====
  if (phase === "start") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mx-auto max-w-lg space-y-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5">
            <Compass className="h-10 w-10 text-accent" />
          </div>
          <div className="space-y-3">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
              Cognitive Canvas
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground max-w-md mx-auto">
              From confusion to clarity in 15 minutes. Map your decision, stress-test it with AI, and commit with confidence.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => setPhase("brain-dump")}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Start a Decision
            </Button>
            <p className="text-xs text-muted-foreground">
              Brain dump your thoughts. AI will structure them into a visual decision map.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ===== BRAIN DUMP SCREEN =====
  if (phase === "brain-dump") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-sm font-bold text-accent">1</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Brain Dump</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground pl-10">
            Describe the decision weighing on your mind. Be messy — the AI will help you structure it into a visual map.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                What is the decision?
              </label>
              <Input
                placeholder="e.g., Should I change careers to data science?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tell me everything
              </label>
              <Textarea
                placeholder="Describe your situation in detail. What's the context? What are you feeling? What's at stake? Don't filter yourself..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="resize-none text-sm leading-relaxed"
              />
            </div>
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
              Your decision has been saved. Revisit it in Decision History to reflect on how things unfold.
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
                    Because
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {completedSession.commitment.reason}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-destructive">
                    I accept this trade-off
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
              onClick={handleReset}
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

  // ===== COGNITIVE CANVAS (main workspace) =====
  const selectedOptionForCommit = options.find((o) => o.id === selectedOptionId)
  const ghostCount = graph.nodes.filter((n) => n.isGhost).length

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title || "Decision Map"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Click nodes to explore &middot; Drag to rearrange &middot; Chat with AI to stress-test
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Magic Expand button */}
          <Button
            onClick={handleMagicExpand}
            disabled={isAILoading || options.length === 0}
            variant="outline"
            size="sm"
            className="gap-1.5 border-purple-200 text-purple-600 hover:bg-purple-50 bg-transparent"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Magic Expand
            {ghostCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] font-semibold text-white">
                {ghostCount}
              </span>
            )}
          </Button>

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

      {/* Main workspace: Canvas + Socratic Sidebar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <GraphCanvas
            graph={graph}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onNodeDrag={handleNodeDrag}
            highlightedOptionId={selectedOptionId}
            onAcceptGhost={handleAcceptGhost}
            onRejectGhost={handleRejectGhost}
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

        {/* Socratic Sidebar (chat) */}
        <div className="hidden lg:block">
          <SocraticSidebar
            title={title}
            description={description}
            options={options}
            selectedNodeLabel={selectedNode?.label}
            onSendMessage={handleSendChatMessage}
            messages={chatMessages}
            isLoading={isAILoading}
            onAcceptNode={handleAcceptNodeFromSidebar}
          />
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden">
        <MobileSocraticSidebar
          title={title}
          description={description}
          options={options}
          selectedNodeLabel={selectedNode?.label}
          onSendMessage={handleSendChatMessage}
          messages={chatMessages}
          isLoading={isAILoading}
          onAcceptNode={handleAcceptNodeFromSidebar}
        />
      </div>
    </div>
  )
}

// Mobile-friendly Socratic Sidebar toggle
function MobileSocraticSidebar(props: {
  title: string
  description: string
  options: DecisionOption[]
  selectedNodeLabel?: string
  onSendMessage: (message: string) => Promise<ChatMessage | null>
  messages: ChatMessage[]
  isLoading: boolean
  onAcceptNode?: (node: { label: string; type: string; parentLabel?: string; risk?: string }) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <Button
        onClick={() => setExpanded(!expanded)}
        variant="outline"
        className="w-full gap-2 bg-transparent border-purple-200 text-purple-600 hover:bg-purple-50"
      >
        <Sparkles className="h-4 w-4" />
        Socratic Guide
        {props.messages.filter(m => m.role === "ai").length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] font-semibold text-white">
            {props.messages.filter(m => m.role === "ai").length}
          </span>
        )}
      </Button>
      {expanded && (
        <div className="mt-2">
          <SocraticSidebar {...props} className="w-full" />
        </div>
      )}
    </div>
  )
}
