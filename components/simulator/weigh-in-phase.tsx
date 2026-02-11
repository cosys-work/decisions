"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Shield, AlertTriangle, Check } from "lucide-react"
import type { DecisionOption } from "@/lib/types"
import { cn } from "@/lib/utils"

interface WeighInPhaseProps {
  options: DecisionOption[]
  selectedOptionId: string | null
  onSelect: (id: string) => void
  onNext: () => void
  onBack: () => void
}

export function WeighInPhase({ options, selectedOptionId, onSelect, onNext, onBack }: WeighInPhaseProps) {
  const [blindVoteComplete, setBlindVoteComplete] = useState(false)
  const [blindVoteAnswer, setBlindVoteAnswer] = useState<"relief" | "dread" | null>(null)
  const [showBlindVote, setShowBlindVote] = useState(false)

  function startBlindVote() {
    setShowBlindVote(true)
  }

  function answerBlindVote(answer: "relief" | "dread") {
    setBlindVoteAnswer(answer)
    setBlindVoteComplete(true)
  }

  const riskSummary = (option: DecisionOption) => {
    const high = option.consequences.filter((c) => c.risk === "high").length
    const medium = option.consequences.filter((c) => c.risk === "medium").length
    const low = option.consequences.filter((c) => c.risk === "low").length
    return { high, medium, low, total: option.consequences.length }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Weigh In</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Time to zoom out and see the full picture. Compare your options side by side,
          then use the Blind Vote to check your gut against your logic.
        </p>
      </div>

      {!showBlindVote ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {options.map((option, idx) => {
              const risks = riskSummary(option)
              const isSelected = selectedOptionId === option.id
              return (
                <Card
                  key={option.id}
                  className={cn(
                    "cursor-pointer border-2 transition-all hover:shadow-md",
                    isSelected
                      ? "border-accent bg-accent/5"
                      : "border-transparent bg-card hover:border-border"
                  )}
                  onClick={() => onSelect(option.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <CardTitle className="text-sm font-medium text-card-foreground">{option.label}</CardTitle>
                      </div>
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                          <Check className="h-3.5 w-3.5 text-accent-foreground" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      {option.consequences.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 text-xs">
                          {c.risk === "high" ? (
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                          ) : c.risk === "low" ? (
                            <Shield className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                          )}
                          <span className="text-muted-foreground">{c.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 border-t border-border pt-2">
                      {risks.low > 0 && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                          {risks.low} safe
                        </span>
                      )}
                      {risks.medium > 0 && (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
                          {risks.medium} moderate
                        </span>
                      )}
                      {risks.high > 0 && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          {risks.high} risky
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedOptionId && !blindVoteComplete && (
            <Card className="border-dashed border-accent/30 bg-accent/5">
              <CardContent className="flex flex-col items-center gap-3 py-6">
                <p className="text-center text-sm font-medium text-foreground">
                  Before you commit, let's check your gut instinct.
                </p>
                <Button
                  onClick={startBlindVote}
                  variant="outline"
                  className="gap-2 border-accent/30 text-accent hover:bg-accent/10 bg-transparent"
                >
                  Start Blind Vote
                </Button>
              </CardContent>
            </Card>
          )}

          {blindVoteComplete && (
            <Card className={cn(
              "border",
              blindVoteAnswer === "relief" ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
            )}>
              <CardContent className="py-4">
                <p className="text-center text-sm">
                  {blindVoteAnswer === "relief" ? (
                    <span className="text-success">
                      Your gut says <strong>relief</strong>. Logic and instinct align -- this is a strong signal.
                    </span>
                  ) : (
                    <span className="text-foreground">
                      Your gut says <strong>dread</strong>. This doesn't mean it's wrong, but examine what's causing
                      the resistance. Sometimes the right choice feels uncomfortable.
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold text-foreground">The Blind Vote</h3>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Imagine you are forced to take{" "}
                <strong className="text-foreground">
                  "{options.find((o) => o.id === selectedOptionId)?.label}"
                </strong>{" "}
                right now. No more deliberation. It's done.
              </p>
              <p className="text-base font-medium text-foreground">Do you feel relief or dread?</p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => answerBlindVote("relief")}
                className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                size="lg"
              >
                Relief
              </Button>
              <Button
                onClick={() => answerBlindVote("dread")}
                variant="outline"
                className="gap-2 border-warning/30 text-foreground hover:bg-warning/10"
                size="lg"
              >
                Dread
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedOptionId || !blindVoteComplete}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Write Commitment
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
