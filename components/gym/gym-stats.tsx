"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { DailyProgress } from "@/lib/types"
import { Target, Flame, TrendingUp } from "lucide-react"

interface GymStatsProps {
  progress: DailyProgress[]
  completedToday: number
  totalToday: number
}

export function GymStats({ progress, completedToday, totalToday }: GymStatsProps) {
  const streak = progress[0]?.streak ?? 0
  const totalCompleted = progress.reduce((acc, p) => acc + p.exercisesCompleted, 0)
  const totalCorrect = progress.reduce((acc, p) => acc + p.correctAnswers, 0)
  const accuracy = totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0
  const todayPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  const stats = [
    {
      label: "Today's Progress",
      value: `${completedToday}/${totalToday}`,
      sublabel: `${todayPercent}% complete`,
      icon: Target,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Current Streak",
      value: `${streak}`,
      sublabel: streak === 1 ? "day" : "days",
      icon: Flame,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Overall Accuracy",
      value: `${accuracy}%`,
      sublabel: `${totalCorrect}/${totalCompleted} correct`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-semibold text-card-foreground">{stat.value}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Daily goal</span>
          <span className="font-medium text-foreground">{completedToday} of {totalToday}</span>
        </div>
        <Progress value={todayPercent} className="h-2" />
      </div>
    </div>
  )
}
