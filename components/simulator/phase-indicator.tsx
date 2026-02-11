"use client"

import { cn } from "@/lib/utils"
import type { DecisionPhase } from "@/lib/types"
import { Check } from "lucide-react"

const phases: { id: DecisionPhase; label: string; step: number }[] = [
  { id: "brain-dump", label: "Brain Dump", step: 1 },
  { id: "stress-test", label: "Stress Test", step: 2 },
  { id: "future-cast", label: "Future Cast", step: 3 },
  { id: "weigh-in", label: "Weigh-In", step: 4 },
  { id: "commitment", label: "Commitment", step: 5 },
]

const phaseOrder: DecisionPhase[] = ["brain-dump", "stress-test", "future-cast", "weigh-in", "commitment"]

function getPhaseIndex(phase: DecisionPhase): number {
  return phaseOrder.indexOf(phase)
}

export function PhaseIndicator({ currentPhase }: { currentPhase: DecisionPhase }) {
  const currentIndex = getPhaseIndex(currentPhase)

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:gap-2">
      {phases.map((phase, idx) => {
        const isComplete = idx < currentIndex
        const isCurrent = idx === currentIndex
        return (
          <div key={phase.id} className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all sm:h-8 sm:w-8",
                  isComplete && "bg-success text-success-foreground",
                  isCurrent && "bg-accent text-accent-foreground ring-2 ring-accent/30 ring-offset-2 ring-offset-background",
                  !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : phase.step}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium whitespace-nowrap sm:inline",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {phase.label}
              </span>
            </div>
            {idx < phases.length - 1 && (
              <div
                className={cn(
                  "h-px w-4 shrink-0 sm:w-8",
                  idx < currentIndex ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
