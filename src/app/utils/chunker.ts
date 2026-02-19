/**
 * Splits text into overlapping chunks suitable for embedding and retrieval.
 * Attempts to split on sentence boundaries for cleaner chunks.
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 500,
  overlapSize: number = 50
): string[] {
  if (!text || text.trim().length === 0) return [];

  const cleanText = text.replace(/\s+/g, ' ').trim();

  if (cleanText.length <= maxChunkSize) {
    return [cleanText];
  }

  // Split into sentences
  const sentences = cleanText
    .replace(/([.!?])\s+/g, '$1|||')
    .split('|||')
    .filter((s) => s.trim().length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if (
      currentChunk.length + trimmedSentence.length + 1 > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      // Create overlap by keeping the last portion of the current chunk
      const words = currentChunk.split(' ');
      const overlapWordCount = Math.max(1, Math.ceil(overlapSize / 5));
      const overlapWords = words.slice(-overlapWordCount);
      currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Returns basic stats about the chunking result
 */
export function getChunkStats(chunks: string[]) {
  return {
    totalChunks: chunks.length,
    avgChunkLength:
      chunks.length > 0
        ? Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length)
        : 0,
    totalCharacters: chunks.reduce((sum, c) => sum + c.length, 0),
  };
}
