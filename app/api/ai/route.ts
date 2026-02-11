import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

export const maxDuration = 60

const model = google("gemini-2.5-flash-lite")

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 15000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const isRateLimited = err instanceof Error && (
        err.message?.includes('429') ||
        err.message?.includes('quota') ||
        err.message?.includes('RESOURCE_EXHAUSTED') ||
        err.message?.includes('Too Many Requests') ||
        (err as any)?.statusCode === 429
      )
      if (i < retries && isRateLimited) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries exceeded')
}

const optionSchema = z.object({
  label: z.string(),
  consequences: z.array(
    z.object({
      text: z.string(),
      risk: z.enum(["low", "medium", "high"]),
    })
  ),
})

const suggestionsSchema = z.object({
  options: z.array(optionSchema),
  insight: z.string(),
})

const stressTestSchema = z.object({
  suggestions: z.array(
    z.object({
      optionLabel: z.string(),
      consequence: z.string(),
      risk: z.enum(["low", "medium", "high"]),
      reasoning: z.string(),
    })
  ),
})

const commitmentSchema = z.object({
  action: z.string(),
  reason: z.string(),
  tradeoff: z.string(),
})

const chatSchema = z.object({
  message: z.string(),
  framework: z.enum(["fear-setting", "opportunity-cost", "pre-mortem", "first-principles", "general"]).optional(),
  suggestedNodes: z.array(
    z.object({
      label: z.string(),
      type: z.enum(["option", "consequence"]),
      parentLabel: z.string().optional(),
      risk: z.enum(["low", "medium", "high"]).optional(),
    })
  ).optional(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const { type, title, description, options } = body

  try {
    if (type === "brain-dump") {
      const { object } = await withRetry(() => generateObject({
        model,
        schema: suggestionsSchema,
        prompt: `You are a decision-making coach. A user is working through a complex decision.

Decision title: "${title}"
Description: "${description}"

Generate 3-4 distinct, actionable options for this decision. Each option should have 2-3 consequences with risk levels (low/medium/high). Think creatively - don't just offer the obvious "do it" vs "don't do it" binary. Consider creative compromises, staged approaches, and lateral moves.

Also provide a brief insight (1-2 sentences) that reframes the decision in a useful way.`,
      }))

      return Response.json(object)
    }

    if (type === "stress-test") {
      const optionsSummary = options
        .map(
          (o: { label: string; consequences: { text: string; risk: string }[] }) =>
            `Option: "${o.label}" - Current consequences: ${o.consequences.map((c: { text: string; risk: string }) => `${c.text} (${c.risk})`).join(", ") || "none yet"}`
        )
        .join("\n")

      const { object } = await withRetry(() => generateObject({
        model,
        schema: stressTestSchema,
        prompt: `You are a decision-making coach helping stress-test options. The user has these options:

Decision: "${title}"
${optionsSummary}

For each option, suggest 1-2 additional consequences the user might not have considered. Focus on second-order effects, hidden costs, opportunity costs, and emotional impacts. Be specific and practical, not generic.`,
      }))

      return Response.json(object)
    }

    if (type === "commitment") {
      const selectedOption = options.find((o: { id: string; selected: boolean }) => o.selected)
      const { object } = await withRetry(() => generateObject({
        model,
        schema: commitmentSchema,
        prompt: `You are a decision-making coach. Help the user draft a clear commitment statement.

Decision: "${title}"
Selected option: "${selectedOption?.label}"
Consequences: ${selectedOption?.consequences?.map((c: { text: string; risk: string }) => `${c.text} (${c.risk})`).join(", ")}

Generate a concise commitment statement with:
- action: A clear, specific action statement (what they will do)
- reason: The core reason for this choice (1 sentence)
- tradeoff: What they're consciously accepting/giving up (1 sentence)`,
      }))

      return Response.json(object)
    }

    if (type === "chat") {
      const { message, canvasState } = body

      const canvasContext = canvasState
        ? `\nCurrent canvas state:\n${canvasState.options?.map(
            (o: { label: string; consequences: { text: string; risk: string }[] }) =>
              `Option: "${o.label}" → Consequences: ${o.consequences.map((c: { text: string; risk: string }) => `${c.text} (${c.risk})`).join(", ") || "none yet"}`
          ).join("\n")}`
        : ""

      const { object } = await withRetry(() => generateObject({
        model,
        schema: chatSchema,
        prompt: `You are a Socratic decision-making coach called the "Socratic Sidebar". You observe a user's decision canvas in real-time and ask probing questions. You never give direct answers—you guide through questions.

Decision: "${title}"
Description: "${description}"
${canvasContext}

User message: "${message}"

Your roles:
1. Context Awareness: Observe what the user is working on and ask targeted questions
2. Framework Router: Detect the user's state and apply the right mental model:
   - If paralyzed by fear → Fear Setting (Stoicism): "What is the worst case? How would you prevent it? How would you repair it?"
   - If torn between good options → Opportunity Cost / 10-10-10: "What do you lose by choosing A?" "How will you feel in 10 mins, 10 months, 10 years?"
   - If over-optimistic → Pre-Mortem: "Fast forward 1 year. This failed. List 3 reasons why."
   - If confused by complexity → First Principles: Strip to verifiable facts only
3. Auto-Branching: If you see missing consequences, suggest them as nodes the user can add

Respond with:
- message: Your Socratic question or insight (2-3 sentences max, conversational)
- framework: Which framework you're applying (if any)
- suggestedNodes: Optional array of nodes to suggest adding to the canvas (ghost nodes)`,
      }))

      return Response.json(object)
    }

    return Response.json({ error: "Unknown type" }, { status: 400 })
  } catch (err) {
    console.error("AI API error:", err)
    return Response.json({ error: "AI service temporarily unavailable. Please try again in a moment." }, { status: 503 })
  }
}
