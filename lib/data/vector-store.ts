// Simple cosine-similarity vector search over document corpus
// Uses Gemini embedding API (free tier) for generating embeddings

import { DOCUMENT_CORPUS, DocumentChunk } from "./documents";

interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

let embeddedCorpus: EmbeddedChunk[] | null = null;

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

// Call Gemini Embedding API
async function embedText(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${err}`);
  }
  const data = await response.json();
  return data.embedding.values as number[];
}

// Build the embedded corpus (called once, cached in module scope)
export async function buildVectorStore(apiKey: string): Promise<void> {
  if (embeddedCorpus) return; // already built

  const embedded: EmbeddedChunk[] = [];
  for (const chunk of DOCUMENT_CORPUS) {
    const text = `${chunk.source_name} - ${chunk.section}\n\n${chunk.content}`;
    const embedding = await embedText(text, apiKey);
    embedded.push({ ...chunk, embedding });
    // Small delay to avoid rate limits on free tier
    await new Promise((r) => setTimeout(r, 100));
  }
  embeddedCorpus = embedded;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

// Search documents with optional customer scope filter
export async function searchDocuments(
  query: string,
  apiKey: string,
  options: {
    customerScope?: string | null; // account_id or null for "applies to all"
    topK?: number;
    includeDeprecated?: boolean;
  } = {}
): Promise<SearchResult[]> {
  const { customerScope = null, topK = 5, includeDeprecated = false } = options;

  await buildVectorStore(apiKey);

  // Embed the query
  const queryEmbedding = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: query }] },
        taskType: "RETRIEVAL_QUERY",
      }),
    }
  ).then((r) => r.json());

  const queryVec = queryEmbedding.embedding.values as number[];

  // Filter and score chunks
  const results: SearchResult[] = [];
  for (const chunk of embeddedCorpus!) {
    // Skip deprecated unless explicitly requested
    if (chunk.is_deprecated && !includeDeprecated) continue;

    // Filter by customer scope:
    // Include chunk if: chunk applies to all (null scope) OR chunk is for this specific customer
    if (
      chunk.customer_scope !== null &&
      chunk.customer_scope !== customerScope
    ) {
      // This chunk is for a different customer — exclude it
      continue;
    }

    const score = cosineSimilarity(queryVec, chunk.embedding);
    results.push({ chunk, score });
  }

  // Sort by score descending, then by authority level descending as tiebreaker
  results.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
    return b.chunk.authority_level - a.chunk.authority_level;
  });

  return results.slice(0, topK);
}

// Format search results for inclusion in LLM context
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "No relevant documents found.";

  return results
    .map((r, i) => {
      const authorityLabel = [
        "Historical (context only)",
        "Deprecated (ignore)",
        "Product Docs",
        "SOP",
        "Current Policy",
        "Customer Agreement (highest authority)",
      ][r.chunk.authority_level];

      return `--- Source ${i + 1} ---
Document: ${r.chunk.source_name}
Section: ${r.chunk.section}
Authority: ${authorityLabel} (level ${r.chunk.authority_level}/5)
${r.chunk.is_deprecated ? "⚠️  DEPRECATED - Do not use as current guidance\n" : ""}${r.chunk.customer_scope ? `Customer Scope: ${r.chunk.customer_scope} only\n` : ""}Relevance Score: ${r.score.toFixed(3)}

Content:
${r.chunk.content}`;
    })
    .join("\n\n");
}
