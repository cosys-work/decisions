import { generateText, Output } from "ai"
import { z } from "zod"

export const maxDuration = 30

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

export async function POST(req: Request) {
  const { type, title, description, options } = await req.json()

  if (type === "brain-dump") {
    const { experimental_output: output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: suggestionsSchema }),
      prompt: `You are a decision-making coach. A user is working through a complex decision.

Decision title: "${title}"
Description: "${description}"

Generate 3-4 distinct, actionable options for this decision. Each option should have 2-3 consequences with risk levels (low/medium/high). Think creatively - don't just offer the obvious "do it" vs "don't do it" binary. Consider creative compromises, staged approaches, and lateral moves.

Also provide a brief insight (1-2 sentences) that reframes the decision in a useful way.`,
      maxOutputTokens: 1000,
    })

    return Response.json(output)
  }

  if (type === "stress-test") {
    const optionsSummary = options
      .map(
        (o: { label: string; consequences: { text: string; risk: string }[] }) =>
          `Option: "${o.label}" - Current consequences: ${o.consequences.map((c: { text: string; risk: string }) => `${c.text} (${c.risk})`).join(", ") || "none yet"}`
      )
      .join("\n")

    const { experimental_output: output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: stressTestSchema }),
      prompt: `You are a decision-making coach helping stress-test options. The user has these options:

Decision: "${title}"
${optionsSummary}

For each option, suggest 1-2 additional consequences the user might not have considered. Focus on second-order effects, hidden costs, opportunity costs, and emotional impacts. Be specific and practical, not generic.`,
      maxOutputTokens: 800,
    })

    return Response.json(output)
  }

  if (type === "commitment") {
    const selectedOption = options.find((o: { id: string; selected: boolean }) => o.selected)
    const { experimental_output: output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({ schema: commitmentSchema }),
      prompt: `You are a decision-making coach. Help the user draft a clear commitment statement.

Decision: "${title}"
Selected option: "${selectedOption?.label}"
Consequences: ${selectedOption?.consequences?.map((c: { text: string; risk: string }) => `${c.text} (${c.risk})`).join(", ")}

Generate a concise commitment statement with:
- action: A clear, specific action statement (what they will do)
- reason: The core reason for this choice (1 sentence)
- tradeoff: What they're consciously accepting/giving up (1 sentence)`,
      maxOutputTokens: 400,
    })

    return Response.json(output)
  }

  return Response.json({ error: "Unknown type" }, { status: 400 })
}
