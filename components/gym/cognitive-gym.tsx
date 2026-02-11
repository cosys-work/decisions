"use client"

import React from "react"

import { useState } from "react"
import { exercises, addExerciseResult, getDailyProgress, getExerciseResults } from "@/lib/store"
import { ExerciseCard } from "./exercise-card"
import { GymStats } from "./gym-stats"
import type { CognitiveExercise } from "@/lib/types"
import { Dumbbell, ChevronRight, Brain, Target, Lightbulb, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const typeInfo: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "bias-detection": { label: "Bias Detection", color: "bg-destructive/10 text-destructive", icon: Brain },
  "logical-fallacy": { label: "Logical Fallacy", color: "bg-warning/10 text-warning-foreground", icon: Target },
  "reframing": { label: "Reframing", color: "bg-accent/10 text-accent", icon: Lightbulb },
  "second-order": { label: "Second-Order", color: "bg-success/10 text-success", icon: ArrowRight },
}

export function CognitiveGym() {
  const [activeExercise, setActiveExercise] = useState<CognitiveExercise | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    const results = getExerciseResults()
    const today = new Date().toISOString().split("T")[0]
    const todayResults = results.filter((r) => r.completedAt.startsWith(today))
    return new Set(todayResults.map((r) => r.exerciseId))
  })
  const [, setRefreshKey] = useState(0)

  function handleComplete(exerciseId: string, selectedOptionId: string, correct: boolean) {
    addExerciseResult({
      exerciseId,
      selectedOptionId,
      correct,
      completedAt: new Date().toISOString(),
    })
    setCompletedIds((prev) => new Set([...prev, exerciseId]))
    setRefreshKey((k) => k + 1)
  }

  const progress = getDailyProgress()
  const todayProgress = progress[0]
  const totalExercises = exercises.length
  const completedToday = completedIds.size

  if (activeExercise) {
    return (
      <ExerciseCard
        exercise={activeExercise}
        onComplete={handleComplete}
        onBack={() => setActiveExercise(null)}
        isCompleted={completedIds.has(activeExercise.id)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Dumbbell className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cognitive Gym</h1>
            <p className="text-sm text-muted-foreground">Daily exercises to sharpen your reasoning</p>
          </div>
        </div>

        {todayProgress && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-accent/20 bg-accent/5 text-accent">
              {todayProgress.streak} day streak
            </Badge>
          </div>
        )}
      </div>

      <GymStats progress={progress} completedToday={completedToday} totalToday={totalExercises} />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {"Today's Exercises"}
        </h2>
        <div className="space-y-2">
          {exercises.map((exercise) => {
            const completed = completedIds.has(exercise.id)
            const info = typeInfo[exercise.type] ?? typeInfo["bias-detection"]
            const Icon = info.icon
            return (
              <Card
                key={exercise.id}
                className={cn(
                  "group cursor-pointer border-border transition-all hover:border-accent/30 hover:shadow-sm",
                  completed && "opacity-60"
                )}
                onClick={() => setActiveExercise(exercise)}
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", info.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-card-foreground">{exercise.title}</h3>
                      <Badge variant="outline" className={cn("text-[10px]", info.color)}>
                        {info.label}
                      </Badge>
                      {completed && (
                        <Badge variant="outline" className="border-success/20 bg-success/5 text-[10px] text-success">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{exercise.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {completedToday === totalExercises && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="flex flex-col items-center gap-2 py-6">
            <Dumbbell className="h-8 w-8 text-success" />
            <p className="text-center text-sm font-medium text-success">
              All exercises complete for today. Great work strengthening your reasoning muscles.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
