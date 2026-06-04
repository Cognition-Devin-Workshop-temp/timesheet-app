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

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
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

    const historyBlock = conversationHistory
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const userMessage = `Context from knowledge articles:\n${contextBlock}\n\n${historyBlock ? `Conversation history:\n${historyBlock}\n\n` : ""}User question: ${query}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
