"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, MessageSquare, Calendar } from "lucide-react"
import type { DecisionSession } from "@/lib/types"

interface DecisionCardProps {
  decision: DecisionSession
  onClick: () => void
}

export function DecisionCard({ decision, onClick }: DecisionCardProps) {
  const date = new Date(decision.createdAt)
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const selectedOption = decision.options.find((o) => o.id === decision.selectedOptionId)
  const totalRisks = decision.options.reduce(
    (acc, o) => acc + o.consequences.filter((c) => c.risk === "high").length,
    0
  )

  return (
    <Card
      className="group cursor-pointer border-border bg-card transition-all hover:border-accent/30 hover:shadow-sm"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <span className="text-sm font-semibold text-accent">
            {decision.title.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-card-foreground">{decision.title}</h3>
            {decision.phase === "complete" && (
              <Badge variant="outline" className="shrink-0 border-success/20 bg-success/5 text-[10px] text-success">
                Committed
              </Badge>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
            {selectedOption && (
              <span className="truncate">
                Chose: {selectedOption.label}
              </span>
            )}
            {decision.reflections.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {decision.reflections.length}
              </span>
            )}
            {totalRisks > 0 && (
              <span className="text-destructive">{totalRisks} risks flagged</span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </CardContent>
    </Card>
  )
}
