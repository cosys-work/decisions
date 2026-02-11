import type { DecisionSession, ExerciseResult, DailyProgress, CognitiveExercise } from "./types"

// In-memory store for the app state (client-side SPA approach for MVP)
let decisions: DecisionSession[] = []

let exerciseResults: ExerciseResult[] = []

export const exercises: CognitiveExercise[] = [
  {
    id: "ex-today-1",
    type: "bias-detection",
    title: "Sunk Cost Fallacy",
    description: "Identify the cognitive bias in this scenario",
    scenario: "You've spent $5,000 renovating a house you plan to sell. A buyer offers $200,000 which is fair market value, but you reject it because \"I've already put $5,000 into renovations, so I need at least $205,000 to break even.\" What bias is at play?",
    options: [
      { id: "a", text: "Anchoring bias - you're anchored to a specific number" },
      { id: "b", text: "Sunk cost fallacy - the renovation cost is irrelevant to market value" },
      { id: "c", text: "Overconfidence bias - you overestimate the home's value" },
      { id: "d", text: "Status quo bias - you prefer keeping things as they are" },
    ],
    correctOptionId: "b",
    explanation: "The $5,000 renovation cost is a sunk cost - it's already spent regardless of your decision. The market value of the house is determined by buyer demand, not by how much you've invested. Rational decision-making should only consider future costs and benefits.",
  },
  {
    id: "ex-today-2",
    type: "logical-fallacy",
    title: "Correlation vs Causation",
    description: "Spot the logical error in this argument",
    scenario: "A company notices that employees who attend the optional Friday yoga class have 30% higher performance reviews. The CEO concludes: \"We should make yoga mandatory for all employees to boost performance.\" What's wrong with this reasoning?",
    options: [
      { id: "a", text: "The sample size is too small to draw conclusions" },
      { id: "b", text: "Yoga has nothing to do with work performance" },
      { id: "c", text: "Correlation is being confused with causation - high performers may self-select into yoga" },
      { id: "d", text: "The CEO is using an appeal to authority" },
    ],
    correctOptionId: "c",
    explanation: "High-performing employees might be more likely to attend optional activities because they're more engaged, better at time management, or more health-conscious. Making yoga mandatory wouldn't necessarily cause performance improvements - the correlation likely reflects a common underlying trait, not a causal relationship.",
  },
  {
    id: "ex-today-3",
    type: "reframing",
    title: "Loss Aversion Reframe",
    description: "Practice reframing a decision to reduce bias",
    scenario: "You're deciding whether to switch jobs. Your current salary is $90,000. The new job offers $100,000 but requires giving up your 4 weeks of vacation (you'd get 2 weeks instead). You find yourself fixating on \"losing\" 2 weeks of vacation. How should you reframe this?",
    options: [
      { id: "a", text: "Focus only on the salary increase since money is more important" },
      { id: "b", text: "Calculate the total compensation value: $10K raise vs. the monetary value of 2 vacation weeks" },
      { id: "c", text: "Ask friends what they would do in this situation" },
      { id: "d", text: "Ignore the vacation difference since it's just a feeling" },
    ],
    correctOptionId: "b",
    explanation: "The best reframe converts both elements to the same unit for comparison. If your daily rate is ~$385, then 10 vacation days = ~$3,850 in equivalent value. You'd net +$6,150 in total value. This removes the emotional framing of 'loss' and turns it into an objective trade-off analysis.",
  },
  {
    id: "ex-today-4",
    type: "second-order",
    title: "Second-Order Thinking",
    description: "Think beyond the immediate consequences",
    scenario: "A city decides to cap ride-sharing prices to make transportation more affordable. What is the most likely second-order consequence?",
    options: [
      { id: "a", text: "Drivers earn less, so fewer drivers operate, leading to longer wait times and less availability" },
      { id: "b", text: "Public transit will immediately improve to fill the gap" },
      { id: "c", text: "Ride-sharing companies will just absorb the cost difference" },
      { id: "d", text: "Everyone will switch to bicycles" },
    ],
    correctOptionId: "a",
    explanation: "Price caps reduce the incentive for drivers to work during high-demand periods. With fewer drivers available, wait times increase and availability drops - potentially making transportation less accessible for the very people the policy was meant to help. This is a classic example of well-intentioned first-order thinking creating negative second-order effects.",
  },
  {
    id: "ex-today-5",
    type: "bias-detection",
    title: "Availability Heuristic",
    description: "Identify how mental shortcuts can mislead",
    scenario: "After seeing three news stories about shark attacks this week, you cancel your family's beach vacation and book a mountain cabin instead. Your spouse points out that the drive to the mountains is statistically far more dangerous than swimming in the ocean. What bias affected your decision?",
    options: [
      { id: "a", text: "Confirmation bias - you only looked for evidence supporting your fear" },
      { id: "b", text: "Availability heuristic - vivid recent information made sharks seem more likely" },
      { id: "c", text: "Negativity bias - you're naturally drawn to bad news" },
      { id: "d", text: "Bandwagon effect - everyone else is also afraid of sharks" },
    ],
    correctOptionId: "b",
    explanation: "The availability heuristic causes us to overestimate the probability of events that are easily recalled - especially vivid, recent, or emotionally charged events. Shark attacks are extremely rare (about 1 in 11.5 million chance) while car accidents are far more common. The news coverage made sharks feel like a bigger threat than they actually are.",
  },
]

export function getDecisions(): DecisionSession[] {
  return [...decisions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getDecision(id: string): DecisionSession | undefined {
  return decisions.find((d) => d.id === id)
}

export function addDecision(decision: DecisionSession): void {
  decisions = [decision, ...decisions]
}

export function updateDecision(id: string, updates: Partial<DecisionSession>): void {
  decisions = decisions.map((d) => (d.id === id ? { ...d, ...updates } : d))
}

export function getExerciseResults(): ExerciseResult[] {
  return exerciseResults
}

export function addExerciseResult(result: ExerciseResult): void {
  exerciseResults = [...exerciseResults, result]
}

export function getDailyProgress(): DailyProgress[] {
  const grouped: Record<string, { completed: number; correct: number }> = {}

  for (const result of exerciseResults) {
    const date = result.completedAt.split("T")[0]
    if (!grouped[date]) {
      grouped[date] = { completed: 0, correct: 0 }
    }
    grouped[date].completed++
    if (result.correct) grouped[date].correct++
  }

  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    if (grouped[dateStr]) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      exercisesCompleted: data.completed,
      correctAnswers: data.correct,
      streak,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}
