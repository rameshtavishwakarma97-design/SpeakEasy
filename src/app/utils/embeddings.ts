const EMBEDDING_MODEL = 'BAAI/bge-small-en-v1.5';

// Use local proxy in dev to avoid CORS, direct URL in production (HF Spaces)
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const HF_API_BASE = isDev
  ? '/api/hf'
  : 'https://router.huggingface.co';

/**
 * Process raw embedding output into a single vector (mean pooling if needed)
 */
function processEmbedding(raw: any): number[] {
  // Already a 1D array of numbers
  if (typeof raw[0] === 'number') {
    return raw;
  }

  // 2D array (tokens x dimensions) — mean pool
  if (Array.isArray(raw[0]) && typeof raw[0][0] === 'number') {
    const dims = raw[0].length;
    const pooled = new Array(dims).fill(0);
    for (const tokenEmb of raw) {
      for (let d = 0; d < dims; d++) {
        pooled[d] += tokenEmb[d];
      }
    }
    for (let d = 0; d < dims; d++) {
      pooled[d] /= raw.length;
    }
    return pooled;
  }

  throw new Error('Unexpected embedding format from API');
}

/**
 * Get embeddings for a list of texts using HuggingFace Inference API
 */
export async function getEmbeddings(
  texts: string[],
  apiToken: string
): Promise<number[][]> {
  const response = await fetch(
    `${HF_API_BASE}/hf-inference/models/${EMBEDDING_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: texts,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new Error('Invalid API token. Please check your HuggingFace API token.');
    }
    if (response.status === 503) {
      throw new Error(
        'Embedding model is loading. Please try again in a few seconds.'
      );
    }
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return texts.map((_, i) => processEmbedding(result[i]));
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Simple in-memory vector store for RAG retrieval
 */
export class VectorStore {
  private chunks: string[] = [];
  private embeddings: number[][] = [];

  /**
   * Index chunks by computing their embeddings
   */
  async index(chunks: string[], apiToken: string): Promise<void> {
    this.chunks = chunks;
    this.embeddings = [];

    // Batch embeddings in groups to respect API limits
    const batchSize = 8;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchEmbeddings = await getEmbeddings(batch, apiToken);
      this.embeddings.push(...batchEmbeddings);
    }
  }

  /**
   * Retrieve top-K chunks most similar to the query
   */
  async retrieve(
    query: string,
    apiToken: string,
    topK: number = 5
  ): Promise<string[]> {
    if (this.chunks.length === 0) return [];

    const [queryEmbedding] = await getEmbeddings([query], apiToken);

    const scored = this.chunks.map((chunk, i) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, this.embeddings[i]),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.min(topK, scored.length)).map((s) => s.chunk);
  }

  getChunks(): string[] {
    return this.chunks;
  }
}
