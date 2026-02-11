"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Clock } from "lucide-react"
import type { DecisionOption } from "@/lib/types"
import { cn } from "@/lib/utils"

interface FutureCastPhaseProps {
  options: DecisionOption[]
  onNext: () => void
  onBack: () => void
}

interface TimelineEntry {
  optionId: string
  tenMinutes: string
  tenMonths: string
  tenYears: string
}

export function FutureCastPhase({ options, onNext, onBack }: FutureCastPhaseProps) {
  const [timelines, setTimelines] = useState<TimelineEntry[]>(
    options.map((o) => ({ optionId: o.id, tenMinutes: "", tenMonths: "", tenYears: "" }))
  )
  const [activeOption, setActiveOption] = useState(options[0]?.id ?? "")

  function updateTimeline(optionId: string, field: keyof Omit<TimelineEntry, "optionId">, value: string) {
    setTimelines((prev) =>
      prev.map((t) => (t.optionId === optionId ? { ...t, [field]: value } : t))
    )
  }

  const currentTimeline = timelines.find((t) => t.optionId === activeOption)
  const allFilled = timelines.every((t) => t.tenMinutes.trim() && t.tenMonths.trim() && t.tenYears.trim())

  const timeframes = [
    { key: "tenMinutes" as const, label: "10 Minutes After", sublabel: "Immediate emotional reaction", icon: "flash" },
    { key: "tenMonths" as const, label: "10 Months After", sublabel: "Medium-term reality", icon: "calendar" },
    { key: "tenYears" as const, label: "10 Years After", sublabel: "Long-term trajectory", icon: "horizon" },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Future Cast</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Apply the 10-10-10 framework. For each option, imagine how you'll feel in 10 minutes,
          10 months, and 10 years. This reveals whether you're optimizing for comfort or growth.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((option, idx) => (
          <Button
            key={option.id}
            variant={activeOption === option.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveOption(option.id)}
            className={cn(
              "shrink-0 gap-1.5",
              activeOption === option.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold">
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="max-w-[120px] truncate">{option.label}</span>
          </Button>
        ))}
      </div>

      {currentTimeline && (
        <div className="space-y-4">
          {timeframes.map((tf, idx) => (
            <Card key={tf.key} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    idx === 0 && "bg-accent/10",
                    idx === 1 && "bg-warning/10",
                    idx === 2 && "bg-success/10"
                  )}>
                    <Clock className={cn(
                      "h-5 w-5",
                      idx === 0 && "text-accent",
                      idx === 1 && "text-warning",
                      idx === 2 && "text-success"
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-card-foreground">{tf.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{tf.sublabel}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={
                    idx === 0
                      ? "How will you feel right after making this choice? Relief? Dread? Excitement?"
                      : idx === 1
                      ? "What does your life look like? What's changed? What new challenges have emerged?"
                      : "Where has this path led you? What do you wish you had known?"
                  }
                  value={currentTimeline[tf.key]}
                  onChange={(e) => updateTimeline(activeOption, tf.key, e.target.value)}
                  rows={3}
                  className="resize-none text-sm leading-relaxed"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!allFilled}
          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Weigh In
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
