import Groq from 'groq-sdk';
import { config } from '../config';
import { AiAnalyzeResponseData } from '../types/api';

let groqClient: Groq | null = null;

export function getGroqClient(): Groq | null {
  if (!config.groqApiKey) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
}

/**
 * Perform AI conversation intelligence analysis via Groq Cloud LLM
 */
export async function analyzeWithGroq(
  conversationId: string,
  text: string,
  customModel?: string
): Promise<AiAnalyzeResponseData> {
  const client = getGroqClient();
  if (!client) {
    throw new Error('Groq client not configured');
  }

  const modelToUse = customModel || config.groqModel || 'llama-3.3-70b-versatile';

  const prompt = `You are CatchUp AI's conversation intelligence engine.
Analyze the following chat conversation export.
Extract key action items, deadlines, important decisions, and provide a concise executive summary.

Return strictly valid JSON matching this schema:
{
  "summary": "1-2 sentence high-level overview of what the discussion was about",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": [
    {
      "task": "description of the task",
      "assignee": "name of person responsible or null",
      "priority": "high" | "medium" | "low"
    }
  ],
  "deadlines": [
    {
      "deadline": "date or timeframe mentioned",
      "context": "what needs to be completed by this deadline"
    }
  ],
  "decisions": [
    "confirmed decision or plan update"
  ]
}

Conversation text:
${text.slice(0, 50000)}
`;

  const completion = await client.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are CatchUp AI, an intelligent assistant that parses group conversations into structured action items, deadlines, decisions, and summaries. Output valid JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    model: modelToUse,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  const rawContent = completion.choices[0]?.message?.content || '{}';
  let parsedJson: {
    summary?: string;
    keyPoints?: string[];
    actionItems?: Array<{ task: string; assignee?: string; priority: 'high' | 'medium' | 'low' }>;
    deadlines?: Array<{ deadline: string; context: string }>;
    decisions?: string[];
  } = {};

  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    parsedJson = {
      summary: rawContent.slice(0, 200),
      keyPoints: [],
      actionItems: [],
      deadlines: [],
      decisions: []
    };
  }

  return {
    conversationId,
    status: 'completed',
    message: 'AI analysis successfully generated via Groq LLM.',
    processedAt: new Date().toISOString(),
    modelUsed: modelToUse,
    analysis: {
      summary: parsedJson.summary || 'Summary generated.',
      keyPoints: Array.isArray(parsedJson.keyPoints) ? parsedJson.keyPoints : [],
      actionItems: Array.isArray(parsedJson.actionItems) ? parsedJson.actionItems : [],
      deadlines: Array.isArray(parsedJson.deadlines) ? parsedJson.deadlines : [],
      decisions: Array.isArray(parsedJson.decisions) ? parsedJson.decisions : []
    }
  };
}
