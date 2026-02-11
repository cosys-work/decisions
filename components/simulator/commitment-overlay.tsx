"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileSignature, X, Loader2, Sparkles } from "lucide-react"
import type { CommitmentCard } from "@/lib/types"

interface CommitmentOverlayProps {
  commitment: CommitmentCard | null
  selectedOptionLabel: string
  onUpdate: (commitment: CommitmentCard) => void
  onCommit: () => void
  onClose: () => void
  onAISuggest: () => void
  isAILoading: boolean
}

export function CommitmentOverlay({
  commitment,
  selectedOptionLabel,
  onUpdate,
  onCommit,
  onClose,
  onAISuggest,
  isAILoading,
}: CommitmentOverlayProps) {
  const [local, setLocal] = useState<CommitmentCard>(
    commitment ?? { action: selectedOptionLabel, reason: "", tradeoff: "" }
  )

  function handleChange(field: keyof CommitmentCard, value: string) {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    onUpdate(updated)
  }

  const canCommit = local.action.trim() && local.reason.trim() && local.tradeoff.trim()

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/5 backdrop-blur-[2px]">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-accent/20 bg-card p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="text-3xl font-bold tracking-tight text-foreground">DECISION</div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-accent">
            <FileSignature className="h-3.5 w-3.5 text-accent" />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              I am going to
            </Label>
            <Input
              placeholder="State your chosen action..."
              value={local.action}
              onChange={(e) => handleChange("action", e.target.value)}
              className="border-none bg-muted/50 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-success">WHY:</Label>
            <Input
              placeholder="Your primary reason..."
              value={local.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
              className="border-none bg-muted/50 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-destructive">TRADE-OFF:</Label>
            <Input
              placeholder="What you're giving up..."
              value={local.tradeoff}
              onChange={(e) => handleChange("tradeoff", e.target.value)}
              className="border-none bg-muted/50 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button
            onClick={onAISuggest}
            disabled={isAILoading}
            variant="outline"
            size="sm"
            className="gap-1.5 bg-transparent text-xs"
          >
            {isAILoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Draft
          </Button>
          <div className="flex-1" />
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
    </div>
  )
}
