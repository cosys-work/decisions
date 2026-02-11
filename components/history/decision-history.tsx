"use client"

import { useState } from "react"
import { getDecisions, updateDecision } from "@/lib/store"
import { DecisionCard } from "./decision-card"
import { DecisionDetail } from "./decision-detail"
import type { DecisionSession } from "@/lib/types"
import { History, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function DecisionHistory() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [, setRefreshKey] = useState(0)

  const decisions = getDecisions()
  const filtered = decisions.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase())
  )

  const selectedDecision = selectedId ? decisions.find((d) => d.id === selectedId) : null

  function handleAddReflection(decisionId: string, text: string, sentiment: "positive" | "neutral" | "negative") {
    const decision = decisions.find((d) => d.id === decisionId)
    if (!decision) return
    updateDecision(decisionId, {
      reflections: [
        ...decision.reflections,
        {
          id: crypto.randomUUID(),
          text,
          createdAt: new Date().toISOString(),
          sentiment,
        },
      ],
    })
    setRefreshKey((k) => k + 1)
  }

  if (selectedDecision) {
    return (
      <DecisionDetail
        decision={selectedDecision}
        onBack={() => setSelectedId(null)}
        onAddReflection={handleAddReflection}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <History className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Decision History</h1>
            <p className="text-sm text-muted-foreground">
              {decisions.length} decision{decisions.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search decisions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <History className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {search ? "No decisions match your search." : "No decisions yet. Start one in the Simulator."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              onClick={() => setSelectedId(decision.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
