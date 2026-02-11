"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, FileSignature } from "lucide-react"
import type { DecisionOption, CommitmentCard } from "@/lib/types"

interface CommitmentPhaseProps {
  options: DecisionOption[]
  selectedOptionId: string | null
  commitment: CommitmentCard | null
  onUpdateCommitment: (commitment: CommitmentCard) => void
  onCommit: () => void
  onBack: () => void
}

export function CommitmentPhase({
  options,
  selectedOptionId,
  commitment,
  onUpdateCommitment,
  onCommit,
  onBack,
}: CommitmentPhaseProps) {
  const selectedOption = options.find((o) => o.id === selectedOptionId)
  const [localCommitment, setLocalCommitment] = useState<CommitmentCard>(
    commitment ?? {
      action: selectedOption?.label ?? "",
      reason: "",
      tradeoff: "",
    }
  )

  function handleChange(field: keyof CommitmentCard, value: string) {
    const updated = { ...localCommitment, [field]: value }
    setLocalCommitment(updated)
    onUpdateCommitment(updated)
  }

  const canCommit = localCommitment.action.trim() && localCommitment.reason.trim() && localCommitment.tradeoff.trim()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Commitment Contract</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Condense your decision into a clear, honest statement. This becomes your
          reference point for the road ahead.
        </p>
      </div>

      <Card className="border-2 border-accent/20 bg-card">
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4 rounded-lg border border-border bg-background p-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <FileSignature className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Decision Memo
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  I am going to
                </Label>
                <Input
                  id="action"
                  placeholder="State your chosen action clearly..."
                  value={localCommitment.action}
                  onChange={(e) => handleChange("action", e.target.value)}
                  className="border-none bg-muted/50 text-base font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Because
                </Label>
                <Input
                  id="reason"
                  placeholder="Your primary reason for this choice..."
                  value={localCommitment.reason}
                  onChange={(e) => handleChange("reason", e.target.value)}
                  className="border-none bg-muted/50 text-base font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeoff" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  I accept this trade-off
                </Label>
                <Input
                  id="tradeoff"
                  placeholder="What you're giving up or risking..."
                  value={localCommitment.tradeoff}
                  onChange={(e) => handleChange("tradeoff", e.target.value)}
                  className="border-none bg-muted/50 text-base font-medium"
                />
              </div>
            </div>
          </div>

          {selectedOption && selectedOption.consequences.filter((c) => c.risk === "high").length > 0 && (
            <div className="rounded-lg bg-destructive/5 p-4">
              <p className="text-xs font-medium text-destructive">
                Acknowledged Risks:
              </p>
              <ul className="mt-1.5 space-y-1">
                {selectedOption.consequences
                  .filter((c) => c.risk === "high")
                  .map((c) => (
                    <li key={c.id} className="text-xs text-muted-foreground">
                      - {c.text}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onCommit}
          disabled={!canCommit}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          size="lg"
        >
          <FileSignature className="h-4 w-4" />
          Sign & Commit
        </Button>
      </div>
    </div>
  )
}
