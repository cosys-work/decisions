"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Plus, AlertTriangle, Shield, Wrench } from "lucide-react"
import type { DecisionOption, Consequence } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StressTestPhaseProps {
  options: DecisionOption[]
  onUpdateOptions: (options: DecisionOption[]) => void
  onNext: () => void
  onBack: () => void
}

export function StressTestPhase({ options, onUpdateOptions, onNext, onBack }: StressTestPhaseProps) {
  function addConsequence(optionId: string) {
    const updated = options.map((opt) => {
      if (opt.id !== optionId) return opt
      return {
        ...opt,
        consequences: [
          ...opt.consequences,
          {
            id: crypto.randomUUID(),
            text: "",
            risk: "medium" as const,
            order: 1,
          },
        ],
      }
    })
    onUpdateOptions(updated)
  }

  function updateConsequence(optionId: string, consequenceId: string, updates: Partial<Consequence>) {
    const updated = options.map((opt) => {
      if (opt.id !== optionId) return opt
      return {
        ...opt,
        consequences: opt.consequences.map((c) =>
          c.id === consequenceId ? { ...c, ...updates } : c
        ),
      }
    })
    onUpdateOptions(updated)
  }

  function removeConsequence(optionId: string, consequenceId: string) {
    const updated = options.map((opt) => {
      if (opt.id !== optionId) return opt
      return {
        ...opt,
        consequences: opt.consequences.filter((c) => c.id !== consequenceId),
      }
    })
    onUpdateOptions(updated)
  }

  const riskColors = {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/10 text-warning-foreground border-warning/20",
    high: "bg-destructive/10 text-destructive border-destructive/20",
  }

  const riskIcons = {
    low: Shield,
    medium: AlertTriangle,
    high: AlertTriangle,
  }

  const allHaveConsequences = options.every((o) => o.consequences.length >= 1)
  const allConsequencesFilled = options.every((o) => o.consequences.every((c) => c.text.trim()))
  const canProceed = allHaveConsequences && allConsequencesFilled

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Stress Test</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Challenge each option. What are the immediate consequences? What could go wrong?
          What's the real cost? Be honest about the risks.
        </p>
      </div>

      <div className="space-y-4">
        {options.map((option, optIdx) => (
          <Card key={option.id} className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <CardTitle className="text-base font-medium text-card-foreground">{option.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {option.consequences.map((consequence) => {
                const RiskIcon = riskIcons[consequence.risk]
                return (
                  <div key={consequence.id} className="flex items-start gap-2">
                    <div className="flex shrink-0 items-center gap-1.5 pt-2">
                      <RiskIcon className={cn("h-3.5 w-3.5", consequence.risk === "high" ? "text-destructive" : consequence.risk === "medium" ? "text-warning" : "text-success")} />
                    </div>
                    <Input
                      placeholder="What happens if you choose this?"
                      value={consequence.text}
                      onChange={(e) => updateConsequence(option.id, consequence.id, { text: e.target.value })}
                      className="flex-1"
                    />
                    <div className="flex shrink-0 items-center gap-1 pt-0.5">
                      {(["low", "medium", "high"] as const).map((risk) => (
                        <button
                          key={risk}
                          type="button"
                          onClick={() => updateConsequence(option.id, consequence.id, { risk })}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize transition-all border",
                            consequence.risk === risk
                              ? riskColors[risk]
                              : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {risk}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => removeConsequence(option.id, consequence.id)}
                        className="ml-1 rounded p-1 text-muted-foreground hover:text-destructive"
                        aria-label="Remove consequence"
                      >
                        <Wrench className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => addConsequence(option.id)}
                className="gap-1.5 text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Consequence
              </Button>

              {option.consequences.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {option.consequences.filter((c) => c.risk === "high").length > 0 && (
                    <Badge variant="outline" className="border-destructive/20 bg-destructive/5 text-destructive text-xs">
                      {option.consequences.filter((c) => c.risk === "high").length} high risk
                    </Badge>
                  )}
                  {option.consequences.filter((c) => c.risk === "low").length > 0 && (
                    <Badge variant="outline" className="border-success/20 bg-success/5 text-success text-xs">
                      {option.consequences.filter((c) => c.risk === "low").length} low risk
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Future Cast
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
