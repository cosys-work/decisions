"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, ArrowRight, Sparkles } from "lucide-react"
import type { DecisionOption } from "@/lib/types"

interface BrainDumpPhaseProps {
  title: string
  description: string
  options: DecisionOption[]
  onUpdateTitle: (title: string) => void
  onUpdateDescription: (desc: string) => void
  onUpdateOptions: (options: DecisionOption[]) => void
  onNext: () => void
}

export function BrainDumpPhase({
  title,
  description,
  options,
  onUpdateTitle,
  onUpdateDescription,
  onUpdateOptions,
  onNext,
}: BrainDumpPhaseProps) {
  const [showOptions, setShowOptions] = useState(options.length > 0)

  function handleGenerateOptions() {
    if (!description.trim()) return
    const words = description.toLowerCase()
    const generated: DecisionOption[] = []

    if (words.includes("job") || words.includes("career") || words.includes("work")) {
      generated.push(
        { id: crypto.randomUUID(), label: "Stay in current role", consequences: [] },
        { id: crypto.randomUUID(), label: "Make the change", consequences: [] },
        { id: crypto.randomUUID(), label: "Negotiate a middle ground", consequences: [] }
      )
    } else if (words.includes("move") || words.includes("relocat")) {
      generated.push(
        { id: crypto.randomUUID(), label: "Relocate now", consequences: [] },
        { id: crypto.randomUUID(), label: "Stay put", consequences: [] },
        { id: crypto.randomUUID(), label: "Try it temporarily", consequences: [] }
      )
    } else {
      generated.push(
        { id: crypto.randomUUID(), label: "Option A: Go for it", consequences: [] },
        { id: crypto.randomUUID(), label: "Option B: Stay the course", consequences: [] },
        { id: crypto.randomUUID(), label: "Option C: Find a compromise", consequences: [] }
      )
    }

    onUpdateOptions(generated)
    setShowOptions(true)

    if (!title && description.length > 10) {
      const autoTitle = description.slice(0, 60).split(".")[0].trim()
      onUpdateTitle(autoTitle || "My Decision")
    }
  }

  function addOption() {
    onUpdateOptions([
      ...options,
      { id: crypto.randomUUID(), label: "", consequences: [] },
    ])
  }

  function removeOption(id: string) {
    onUpdateOptions(options.filter((o) => o.id !== id))
  }

  function updateOptionLabel(id: string, label: string) {
    onUpdateOptions(options.map((o) => (o.id === id ? { ...o, label } : o)))
  }

  const canProceed = title.trim() && options.length >= 2 && options.every((o) => o.label.trim())

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Brain Dump</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Describe the decision weighing on your mind. Be messy -- this is about getting everything
          out of your head and onto the canvas.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-card-foreground">What is the decision?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Give your decision a short title..."
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className="text-base font-medium"
          />
          <Textarea
            placeholder="Describe your situation in detail. What's the context? What are you feeling? What's at stake? Don't filter yourself..."
            value={description}
            onChange={(e) => onUpdateDescription(e.target.value)}
            rows={5}
            className="resize-none text-sm leading-relaxed"
          />
          {!showOptions && (
            <Button
              onClick={handleGenerateOptions}
              disabled={!description.trim()}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="h-4 w-4" />
              Generate Options
            </Button>
          )}
        </CardContent>
      </Card>

      {showOptions && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-card-foreground">Your Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((option, idx) => (
              <div key={option.id} className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {String.fromCharCode(65 + idx)}
                </span>
                <Input
                  placeholder={`Describe option ${String.fromCharCode(65 + idx)}...`}
                  value={option.label}
                  onChange={(e) => updateOptionLabel(option.id, e.target.value)}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(option.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove option ${String.fromCharCode(65 + idx)}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <Button variant="outline" size="sm" onClick={addOption} className="gap-1.5 text-muted-foreground bg-transparent">
                <Plus className="h-3.5 w-3.5" />
                Add Option
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Stress Test
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
