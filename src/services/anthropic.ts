import Anthropic from '@anthropic-ai/sdk';
import { PracticeSession } from '../types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

export async function generatePracticeCoaching(sessions: PracticeSession[]): Promise<string> {
  const sessionSummary = formatSessionsForPrompt(sessions);

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content:
          `Here are my practice sessions from the last 30 days:\n\n${sessionSummary}\n\n` +
          'Please give me personalised coaching advice based on this history.',
      },
    ],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) throw new Error('No text response from Anthropic');
  return textBlock.text;
}
