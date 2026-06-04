import type { LLMProvider, ChatMessage } from "../../types";

function extractSteps(context: string[]): string[] {
  const steps: string[] = [];
  const combined = context.join("\n\n");
  const lines = combined.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+[.)\s]/.test(trimmed)) {
      steps.push(trimmed.replace(/^\d+[.)]*\s*/, ""));
    } else if (/^[-*]\s/.test(trimmed) && trimmed.length > 10) {
      steps.push(trimmed.replace(/^[-*]\s*/, ""));
    }
  }

  if (steps.length === 0) {
    const sentences = combined
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
    for (let i = 0; i < Math.min(5, sentences.length); i++) {
      steps.push(sentences[i]);
    }
  }

  return steps.slice(0, 10);
}

function generateTemplate(query: string, context: string[]): string {
  const combined = context.join("\n");
  const hasCode =
    combined.includes("```") ||
    combined.includes("function") ||
    combined.includes("class ");

  if (hasCode) {
    const codeBlocks = combined.match(/```[\s\S]*?```/g);
    if (codeBlocks && codeBlocks.length > 0) {
      return codeBlocks[0];
    }
  }

  const queryLower = query.toLowerCase();

  if (
    queryLower.includes("email") ||
    queryLower.includes("message") ||
    queryLower.includes("letter")
  ) {
    return `Subject: [Topic from your query]\n\nDear [Recipient],\n\nI am writing regarding ${query.toLowerCase()}.\n\n[Key details from the knowledge base]\n\nBased on our guidelines:\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\nPlease let me know if you need further clarification.\n\nBest regards,\n[Your Name]`;
  }

  if (
    queryLower.includes("checklist") ||
    queryLower.includes("list") ||
    queryLower.includes("check")
  ) {
    const steps = extractSteps(context);
    return steps.map((s, i) => `☐ ${i + 1}. ${s}`).join("\n");
  }

  if (
    queryLower.includes("plan") ||
    queryLower.includes("process") ||
    queryLower.includes("procedure")
  ) {
    return `# Process: ${query}\n\n## Objective\n[Derived from knowledge base]\n\n## Prerequisites\n- [Requirement 1]\n- [Requirement 2]\n\n## Steps\n${extractSteps(context)
      .map((s, i) => `### Step ${i + 1}: ${s}`)
      .join("\n\n")}\n\n## Expected Outcome\n[Result description]\n\n## Notes\n- [Additional considerations]`;
  }

  return `# ${query}\n\n## Overview\n[Summary based on knowledge articles]\n\n## Details\n${extractSteps(context)
    .map((s) => `- ${s}`)
    .join("\n")}\n\n## Next Steps\n- Review and adapt to your specific needs\n- Consult the source knowledge articles for more detail`;
}

export class MockLLMProvider implements LLMProvider {
  async generateResponse(
    query: string,
    context: string[],
    _conversationHistory: ChatMessage[]
  ): Promise<{ answer: string; steps: string[]; template: string }> {
    if (context.length === 0) {
      return {
        answer:
          "I don't have any knowledge articles to reference yet. Please upload or paste some articles first, then ask me a question about them.",
        steps: [
          "Go to the Knowledge panel on the left",
          "Click 'Add Article' to upload or paste content",
          "Once articles are loaded, ask your question again",
        ],
        template:
          "# Getting Started\n\n1. Upload your knowledge articles\n2. Ask a question about the content\n3. Get step-by-step guidance and templates",
      };
    }

    const steps = extractSteps(context);
    const template = generateTemplate(query, context);

    const relevantExcerpts = context
      .map((c) => {
        const sentences = c.split(/[.!?]+/).filter((s) => s.trim().length > 15);
        return sentences.slice(0, 3).join(". ") + ".";
      })
      .join("\n\n");

    const answer = `Based on the knowledge articles, here's what I found regarding your question:\n\n${relevantExcerpts}\n\n💡 **Demo Mode**: This response uses keyword-based retrieval. For AI-powered answers, configure an LLM provider (Gemini or OpenAI) in your backend .env file.`;

    return {
      answer,
      steps: steps.length > 0 ? steps : ["Review the answer above", "Check the template below for a ready-to-use format", "Upload more articles for better coverage"],
      template,
    };
  }
}
