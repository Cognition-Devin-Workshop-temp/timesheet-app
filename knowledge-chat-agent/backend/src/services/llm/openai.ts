import type { LLMProvider, ChatMessage } from "../../types";

const SYSTEM_PROMPT = `You are a helpful knowledge-base assistant. You answer questions using ONLY the provided knowledge article excerpts. 

You MUST structure every response as valid JSON with exactly these three fields:
{
  "answer": "A clear, detailed conversational answer to the user's question based on the knowledge articles.",
  "steps": ["Step 1 description", "Step 2 description", ...],
  "template": "A ready-to-use template, checklist, or code snippet the user can copy and adapt."
}

Rules:
- Ground all answers in the provided context. If the context doesn't cover the question, say so.
- Always provide actionable steps (3-10 items).
- Always provide a practical template the user can copy.
- The template should be formatted appropriately (markdown, code, email format, checklist, etc.) depending on the question.
- Return ONLY the JSON object, no markdown fences or extra text.`;

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(
    query: string,
    context: string[],
    conversationHistory: ChatMessage[]
  ): Promise<{ answer: string; steps: string[]; template: string }> {
    const contextBlock = context
      .map((c, i) => `[Article Excerpt ${i + 1}]:\n${c}`)
      .join("\n\n");

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user" as const,
        content: `Context from knowledge articles:\n${contextBlock}\n\nUser question: ${query}`,
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content || "";

    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        answer: parsed.answer || "No answer generated.",
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        template: parsed.template || "",
      };
    } catch {
      return {
        answer: text,
        steps: ["Review the answer above for guidance"],
        template: "",
      };
    }
  }
}
