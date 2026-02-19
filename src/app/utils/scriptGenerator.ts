export type ContentStyle =
  | 'summary'
  | 'podcast'
  | 'narration'
  | 'storytelling'
  | 'debate'
  | 'lecture';

export interface StyleOption {
  value: ContentStyle;
  label: string;
  emoji: string;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    value: 'summary',
    label: 'Summary',
    emoji: '📋',
    description: 'Clear, concise summary for easy listening',
  },
  {
    value: 'podcast',
    label: 'Podcast',
    emoji: '🎙️',
    description: 'Conversational podcast episode',
  },
  {
    value: 'narration',
    label: 'Narration',
    emoji: '🎧',
    description: 'Professional narration',
  },
  {
    value: 'storytelling',
    label: 'Storytelling',
    emoji: '📖',
    description: 'Engaging story format',
  },
  {
    value: 'debate',
    label: 'Debate',
    emoji: '⚖️',
    description: 'Multi-perspective debate',
  },
  {
    value: 'lecture',
    label: 'Lecture',
    emoji: '🎓',
    description: 'Educational lecture',
  },
];

const STYLE_PROMPTS: Record<ContentStyle, string> = {
  summary: `Summarize the provided source material into a short, plain-text abstract.

Rules:
- Output ONLY the summary text. No titles, headings, labels, stage directions, or formatting.
- Do NOT include anything like [PAUSE], [MUSIC], "Announcer:", "Host:", or any script-style markup.
- Write in plain flowing paragraphs. No bullet points, no numbered lists.
- Keep it between 50-100 words — shorter is better.
- Use simple, clear language a listener can easily follow.
- Be factual. Only include information from the source material.
- Do NOT add opinions, filler phrases, or dramatic language.`,

  podcast: `You are a professional podcast script writer. Create an engaging podcast episode script based on the provided source material.

The script must follow this structure:
INTRODUCTION: Welcome the audience, preview the topic, and hook the listener.
BODY: Cover the key points from the source material in a conversational, engaging tone. Use smooth transitions between topics.
CONCLUSION: Summarize the main takeaways and thank the listeners.

Write naturally as if speaking to an audience. The content MUST be grounded in the provided source material.`,

  narration: `You are a professional narrator. Create a polished narration script based on the provided source material.

The script must follow this structure:
INTRODUCTION: Set the scene and draw the listener in with a compelling opening.
BODY: Present the key information in a clear, flowing narrative style with smooth transitions.
CONCLUSION: Wrap up with a memorable closing thought.

Write in a smooth, professional narration style. The content MUST be grounded in the provided source material.`,

  storytelling: `You are a master storyteller. Transform the provided source material into an engaging storytelling script.

The script must follow this structure:
OPENING: Hook the listener with an intriguing, dramatic setup.
NARRATIVE: Weave the key information into a compelling story with vivid descriptions and good pacing.
CLOSING: Deliver a satisfying conclusion with a clear takeaway message.

Make it dramatic and engaging while staying faithful to the facts in the source material.`,

  debate: `You are a debate moderator. Create a structured debate script with two opposing perspectives based on the provided source material.

The script must follow this structure:
INTRODUCTION: Present the topic and introduce the two perspectives being debated.
SIDE A — FOR: Present arguments supporting the key claims, grounded in the source material.
SIDE B — AGAINST: Present counterarguments and opposing views, also grounded in the source material.
CONCLUSION: Summarize both perspectives and present a balanced takeaway.

All arguments must be rooted in the source material. Present both sides fairly.`,

  lecture: `You are a university professor. Create an educational lecture script based on the provided source material.

The script must follow this structure:
INTRODUCTION: Present the topic, its significance, and what the audience will learn.
BODY: Explain the key concepts clearly, using examples and analogies for difficult ideas.
CONCLUSION: Review the main points and suggest areas for further study.

Use an authoritative but approachable teaching tone. The content MUST be grounded in the provided source material.`,
};

/** Style-specific retrieval queries to find the most relevant chunks */
export const STYLE_QUERIES: Record<ContentStyle, string> = {
  summary:
    'main points, key information, important facts, core message, essential takeaways',
  podcast:
    'key topics, interesting discussions, main points for conversation',
  narration:
    'main narrative, important details, key events and information',
  storytelling:
    'compelling events, vivid descriptions, dramatic moments, characters',
  debate:
    'controversial claims, evidence, arguments, counterpoints, opposing views',
  lecture:
    'core concepts, definitions, examples, educational content, key theories',
};

const LLM_MODELS = [
  'meta-llama/Llama-3.1-8B-Instruct',
  'Qwen/Qwen2.5-72B-Instruct',
];

// Use local proxy in dev to avoid CORS, direct URL in production (HF Spaces)
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const HF_API_BASE = isDev
  ? '/api/hf'
  : 'https://router.huggingface.co';

/**
 * Generate a structured script from retrieved chunks using an LLM.
 * Tries multiple models as fallbacks.
 */
export async function generateScript(
  retrievedChunks: string[],
  style: ContentStyle,
  apiToken: string
): Promise<string> {
  const context = retrievedChunks.join('\n\n---\n\n');

  // Try each model in order until one succeeds
  let lastError: Error | null = null;

  for (const model of LLM_MODELS) {
    try {
      const script = await callLLM(
        model,
        STYLE_PROMPTS[style],
        context,
        style,
        apiToken
      );
      return script;
    } catch (err: any) {
      lastError = err;
      // If it's an auth error, don't bother trying other models
      if (err.message?.includes('401') || err.message?.includes('Invalid')) {
        throw err;
      }
      continue;
    }
  }

  throw lastError || new Error('All models failed. Please try again later.');
}

async function callLLM(
  model: string,
  systemPrompt: string,
  context: string,
  style: ContentStyle,
  apiToken: string
): Promise<string> {
  const userMessage = `${systemPrompt}

=== SOURCE MATERIAL ===
${context}
=== END SOURCE MATERIAL ===

Generate a well-structured ${style} script based ONLY on the above source material. Make it engaging, natural-sounding, and suitable for audio delivery. Keep it between 300 and 600 words.`;

  const response = await fetch(`${HF_API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a professional content writer who creates engaging scripts for audio delivery.' },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new Error(
        'Invalid API token. Please check your HuggingFace API token.'
      );
    }
    if (response.status === 503) {
      throw new Error(
        `Model ${model} is loading. Please wait a moment and try again.`
      );
    }
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (
    result.choices &&
    result.choices.length > 0 &&
    result.choices[0].message?.content
  ) {
    return cleanScript(result.choices[0].message.content.trim());
  }

  throw new Error(`No output from model ${model}`);
}

/**
 * Clean up the generated script: remove LLM artifacts, fix formatting
 */
function cleanScript(text: string): string {
  let cleaned = text
    // Remove common LLM intro artifacts
    .replace(/^(Here'?s?|Sure|Okay|Certainly|Of course)[^.:\n]*[.:]\s*/i, '')
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/#{1,3}\s*/g, '') // Remove markdown headers    // Remove stage directions like [PAUSE FOR A MOMENT], [OUTRO MUSIC FADES IN], etc.
    .replace(/\[([^\]]{0,80})\]\s*/g, '')
    // Remove speaker labels like Announcer:, Host:, Narrator:
    .replace(/^(Announcer|Host|Narrator|Speaker\s*\d*)\s*:\s*/gim, '')
    // Remove labels like OVERVIEW:, KEY POINTS:, TAKEAWAY:
    .replace(/^(OVERVIEW|KEY POINTS?|TAKEAWAY|INTRODUCTION|BODY|CONCLUSION|OPENING|CLOSING|NARRATIVE|SIDE [AB])\s*[:—-]?\s*/gim, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')    .trim();

  // If the script is too short, it probably failed
  if (cleaned.length < 50) {
    throw new Error(
      'Generated script is too short. The model may not have produced valid output. Please try again.'
    );
  }

  return cleaned;
}
