"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, X, Lightbulb } from "lucide-react"
import type { CognitiveExercise } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ExerciseCardProps {
  exercise: CognitiveExercise
  onComplete: (exerciseId: string, selectedOptionId: string, correct: boolean) => void
  onBack: () => void
  isCompleted: boolean
}

const typeLabels: Record<string, string> = {
  "bias-detection": "Bias Detection",
  "logical-fallacy": "Logical Fallacy",
  "reframing": "Reframing",
  "second-order": "Second-Order Thinking",
}

export function ExerciseCard({ exercise, onComplete, onBack, isCompleted }: ExerciseCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(isCompleted)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)

  function handleSubmit() {
    if (!selectedId) return
    const correct = selectedId === exercise.correctOptionId
    setWasCorrect(correct)
    setSubmitted(true)
    if (!isCompleted) {
      onComplete(exercise.id, selectedId, correct)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Exercises
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{exercise.title}</h1>
          <Badge variant="outline" className="text-xs">
            {typeLabels[exercise.type] ?? exercise.type}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{exercise.description}</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Scenario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{exercise.scenario}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Select your answer:</h3>
        <div className="space-y-2">
          {exercise.options.map((option) => {
            const isCorrectAnswer = option.id === exercise.correctOptionId
            const isSelected = option.id === selectedId
            let borderClass = "border-border bg-card hover:border-accent/30"
            if (submitted) {
              if (isCorrectAnswer) {
                borderClass = "border-success bg-success/5"
              } else if (isSelected && !isCorrectAnswer) {
                borderClass = "border-destructive bg-destructive/5"
              } else {
                borderClass = "border-border bg-card opacity-50"
              }
            } else if (isSelected) {
              borderClass = "border-accent bg-accent/5"
            }

            return (
              <Card
                key={option.id}
                className={cn(
                  "cursor-pointer border-2 transition-all",
                  borderClass,
                  submitted && "cursor-default"
                )}
                onClick={() => !submitted && setSelectedId(option.id)}
              >
                <CardContent className="flex items-start gap-3 py-3">
                  <div className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    submitted && isCorrectAnswer
                      ? "border-success bg-success"
                      : submitted && isSelected && !isCorrectAnswer
                      ? "border-destructive bg-destructive"
                      : isSelected
                      ? "border-accent bg-accent"
                      : "border-muted-foreground/30"
                  )}>
                    {submitted && isCorrectAnswer && <Check className="h-3 w-3 text-success-foreground" />}
                    {submitted && isSelected && !isCorrectAnswer && <X className="h-3 w-3 text-destructive-foreground" />}
                    {!submitted && isSelected && <div className="h-2 w-2 rounded-full bg-accent-foreground" />}
                  </div>
                  <p className="text-sm leading-relaxed text-card-foreground">{option.text}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {!submitted && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!selectedId}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Submit Answer
          </Button>
        </div>
      )}

      {submitted && wasCorrect !== null && (
        <Card className={cn(
          "border",
          wasCorrect ? "border-success/20 bg-success/5" : "border-warning/20 bg-warning/5"
        )}>
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center gap-2">
              {wasCorrect ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
              <span className={cn("text-sm font-semibold", wasCorrect ? "text-success" : "text-foreground")}>
                {wasCorrect ? "Correct!" : "Not quite."}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm leading-relaxed text-muted-foreground">{exercise.explanation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {submitted && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onBack} className="gap-2 bg-transparent">
            Next Exercise
          </Button>
        </div>
      )}
    </div>
  )
}
