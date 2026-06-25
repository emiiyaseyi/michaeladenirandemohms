// Minimal OpenAI chat client (no SDK dependency). Env-gated + best-effort:
// returns null on a missing key or any error and never throws into the request path.
// Mirrors the defensive style of src/lib/email.ts (Resend).

const ENDPOINT = "https://api.openai.com/v1/chat/completions"

export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

// Run a single system+user chat completion. Returns the assistant text, or null.
export async function chat(system: string, user: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) { console.error("[openai] SKIP: no OPENAI_API_KEY"); return null }
  const model = process.env.OPENAI_MODEL || "gpt-5.1"
  // GPT-5 / o-series are reasoning models: they reject a custom `temperature`, use
  // `max_completion_tokens` (not `max_tokens`), and need a larger budget (reasoning
  // tokens count against it). Older gpt-4* models take the classic params.
  const reasoning = /^(gpt-5|o\d)/.test(model)
  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_completion_tokens: opts?.maxTokens ?? (reasoning ? 3000 : 900),
    }
    if (!reasoning) body.temperature = opts?.temperature ?? 0.2
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[openai] HTTP ${res.status}: ${body.slice(0, 300)}`)
      return null
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    return typeof content === "string" && content.trim() ? content.trim() : null
  } catch (e) {
    console.error("[openai] EXCEPTION:", e)
    return null
  }
}
