/**
 * AI Utilities for Cloudflare Workers AI
 * Handles embeddings generation and semantic search using Workers AI and Vectorize
 */

/**
 * Generate embeddings for text using Cloudflare Workers AI
 * @param {Ai} ai - Cloudflare AI binding
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export async function generateEmbedding(ai, text) {
  const response = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: [text]
  });

  // Response format: { data: [[embedding_values]] }
  return response.data[0];
}

/**
 * Insert embeddings into Vectorize index
 * @param {VectorizeIndex} vectorize - Cloudflare Vectorize binding
 * @param {Array<{id: string, values: number[], metadata?: object}>} vectors - Vectors to insert
 * @returns {Promise<object>} Insert result
 */
export async function insertVectors(vectorize, vectors) {
  return await vectorize.insert(vectors);
}

/**
 * Search for similar vectors in Vectorize index
 * @param {VectorizeIndex} vectorize - Cloudflare Vectorize binding
 * @param {number[]} queryVector - Query embedding vector
 * @param {object} options - Search options
 * @param {number} options.topK - Number of results to return (default: 10)
 * @param {object} options.filter - Metadata filters
 * @param {boolean} options.returnMetadata - Whether to return metadata (default: true)
 * @returns {Promise<Array>} Search results
 */
export async function searchSimilar(vectorize, queryVector, options = {}) {
  const { topK = 10, returnMetadata = true } = options;

  const results = await vectorize.query(queryVector, {
    topK,
    returnMetadata
  });

  return results.matches || [];
}

/**
 * Generate embedding for a hackathon idea
 * @param {Ai} ai - Cloudflare AI binding
 * @param {string} idea - Idea text
 * @returns {Promise<number[]>} Embedding vector
 */
export async function generateIdeaEmbedding(ai, idea) {
  // Use the entire idea text for embedding
  return await generateEmbedding(ai, idea);
}

/**
 * Search for similar hackathon ideas
 * @param {Ai} ai - Cloudflare AI binding
 * @param {VectorizeIndex} vectorize - Cloudflare Vectorize binding
 * @param {string} query - Search query text
 * @param {object} options - Search options
 * @param {number} options.topK - Number of results (default: 10)
 * @param {number} options.eventId - Filter by event ID
 * @returns {Promise<Array>} Similar ideas with scores
 */
export async function searchSimilarIdeas(ai, vectorize, query, options = {}) {
  const { topK = 10, eventId } = options;

  // Generate embedding for the search query
  const queryVector = await generateEmbedding(ai, query);

  // Search for similar vectors (no filter for now - will filter results after)
  const results = await searchSimilar(vectorize, queryVector, {
    topK: topK * 2, // Get more results to filter
    returnMetadata: true
  });

  // Filter by eventId if provided
  if (eventId) {
    return results
      .filter(r => r.metadata?.eventId === eventId)
      .slice(0, topK);
  }

  return results.slice(0, topK);
}
