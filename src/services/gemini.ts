import { GoogleGenerativeAI } from '@google/generative-ai';
import { PracticeSession } from '../types';

const SYSTEM_PROMPT =
  'You are a music practice coach. Analyze the user\'s practice session history ' +
  'and give specific, actionable advice. Be encouraging but honest. Keep responses under 200 words.';

function formatSessionsForPrompt(sessions: PracticeSession[]): string {
  if (sessions.length === 0) return 'No sessions recorded yet.';

  return sessions
    .map(
      (s) =>
        `- ${new Date(s.date).toLocaleDateString()}: ${s.instrument}, ` +
        `${s.duration} minutes${s.notes ? `, notes: "${s.notes}"` : ''}`,
    )
    .join('\n');
}

function buildPrompt(sessions: PracticeSession[], userPrompt?: string): string {
  const sessionSummary = formatSessionsForPrompt(sessions);
  let prompt = `Here are my practice sessions from the last 30 days:\n\n${sessionSummary}\n\n`;

  if (userPrompt) {
    prompt += `The user has a specific question: "${userPrompt}"\n\nPlease answer their question based on their practice history.`;
  } else {
    prompt += 'Please give me personalised coaching advice based on this history.';
  }

  return prompt;
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });
}

export async function generatePracticeCoaching(
  sessions: PracticeSession[],
  userPrompt?: string,
): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(buildPrompt(sessions, userPrompt));
  const text = result.response.text();
  if (!text) throw new Error('No text response from Gemini');
  return text;
}

export async function* streamPracticeCoaching(
  sessions: PracticeSession[],
  userPrompt?: string,
): AsyncGenerator<string> {
  const model = getModel();
  const result = await model.generateContentStream(buildPrompt(sessions, userPrompt));

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
