export interface DecisionOption {
  id: string
  label: string
  consequences: Consequence[]
}

export interface Consequence {
  id: string
  text: string
  risk: "low" | "medium" | "high"
  order: number
}

export interface DecisionSession {
  id: string
  title: string
  description: string
  options: DecisionOption[]
  phase: DecisionPhase
  selectedOptionId: string | null
  commitment: CommitmentCard | null
  createdAt: string
  reflections: Reflection[]
}

export type DecisionPhase =
  | "brain-dump"
  | "stress-test"
  | "future-cast"
  | "weigh-in"
  | "commitment"
  | "complete"

export interface CommitmentCard {
  action: string
  reason: string
  tradeoff: string
}

export interface Reflection {
  id: string
  text: string
  createdAt: string
  sentiment: "positive" | "neutral" | "negative"
}

export interface CognitiveExercise {
  id: string
  type: "bias-detection" | "logical-fallacy" | "reframing" | "second-order"
  title: string
  description: string
  scenario: string
  options: ExerciseOption[]
  correctOptionId: string
  explanation: string
}

export interface ExerciseOption {
  id: string
  text: string
}

export interface ExerciseResult {
  exerciseId: string
  selectedOptionId: string
  correct: boolean
  completedAt: string
}

export interface DailyProgress {
  date: string
  exercisesCompleted: number
  correctAnswers: number
  streak: number
}
