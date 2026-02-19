// Extractive text summarization using a frequency-based algorithm
// Similar to TextRank/LexRank but simplified for client-side processing

interface Sentence {
  text: string;
  score: number;
  position: number;
}

export function summarizeText(text: string, targetSentences: number = 5): string {
  // Clean and split into sentences
  const sentences = splitIntoSentences(text);

  if (sentences.length <= targetSentences) {
    return text; // No need to summarize
  }

  // Calculate target as 20% of original or targetSentences, whichever is larger
  const summaryLength = Math.max(targetSentences, Math.ceil(sentences.length * 0.2));

  // Score sentences based on word frequency
  const wordFrequency = calculateWordFrequency(text);
  const scoredSentences: Sentence[] = sentences.map((sentence, index) => ({
    text: sentence,
    score: scoreSentence(sentence, wordFrequency),
    position: index,
  }));

  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength);

  // Re-sort by original position to maintain narrative flow
  const orderedSummary = topSentences
    .sort((a, b) => a.position - b.position)
    .map((s) => s.text)
    .join(' ');

  return orderedSummary;
}

function splitIntoSentences(text: string): string[] {
  // Split on periods, exclamation marks, and question marks
  // But preserve common abbreviations
  const sentences = text
    .replace(/([.?!])\s+/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 10); // Filter out very short fragments

  return sentences;
}

function calculateWordFrequency(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3); // Filter out short words and stop words

  const stopWords = new Set([
    'this', 'that', 'these', 'those', 'then', 'than', 'them', 'they',
    'their', 'there', 'where', 'when', 'what', 'which', 'who', 'whom',
    'with', 'from', 'have', 'been', 'were', 'was', 'are', 'not', 'but',
    'and', 'the', 'for', 'can', 'will', 'would', 'should', 'could',
    'may', 'might', 'must', 'shall', 'about', 'into', 'through', 'during',
  ]);

  const frequency = new Map<string, number>();
  
  words.forEach((word) => {
    if (!stopWords.has(word)) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  });

  return frequency;
}

function scoreSentence(sentence: string, wordFrequency: Map<string, number>): number {
  const words = sentence
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  if (words.length === 0) return 0;

  const totalScore = words.reduce((sum, word) => {
    return sum + (wordFrequency.get(word) || 0);
  }, 0);

  // Normalize by sentence length to avoid bias toward longer sentences
  return totalScore / words.length;
}

export function getWordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

export function getSentenceCount(text: string): number {
  return splitIntoSentences(text).length;
}
