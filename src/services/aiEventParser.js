/**
 * AI Event Parser Service
 * Uses Cloudflare Workers AI to parse natural language event descriptions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Parse natural language event description using AI
 * @param {string} description - Natural language event description
 * @param {string} adminEmail - Email of admin making the request
 * @returns {Promise<Object>} Parsed event data
 */
export async function parseEventWithAI(description, adminEmail) {
  const response = await fetch(`${API_BASE_URL}/api/admin/parse-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description,
      adminEmail
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse event with AI');
  }

  return response.json();
}
