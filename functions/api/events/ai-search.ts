/**
 * AI Semantic Search for Events
 * Uses Cloudflare Workers AI to understand natural language queries
 * and match them with relevant events
 */

interface Env {
  AI: any;
  DB: D1Database;
}

interface Event {
  id: number;
  title: string;
  description: string;
  event_type: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  thumbnail_url: string | null;
  relevance_score?: number;
  match_reason?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as any;
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Search query is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch all upcoming events
    const { results: events } = await context.env.DB.prepare(`
      SELECT
        id,
        title,
        description,
        event_type,
        date,
        time,
        location,
        capacity,
        thumbnail_url
      FROM events
      WHERE date >= date('now')
      ORDER BY date ASC
    `).all();

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        events: [],
        query
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create enriched event descriptions for AI analysis
    const eventDescriptions = events.map((event: any) => {
      const typeLabels: Record<string, string> = {
        code_and_coffee: 'morning coding meetup with coffee',
        code_and_brews: 'evening coding meetup with drinks',
        hackathon: 'competitive coding event',
        workshop: 'learning and skill-building session',
        meetup: 'social networking event'
      };

      return {
        id: event.id,
        text: `${event.title}. ${event.description}. This is a ${typeLabels[event.event_type] || event.event_type} at ${event.location}.`
      };
    });

    // Use AI to analyze query and match with events
    const prompt = `You are an event recommendation system. Analyze this search query and match it with the most relevant events.

User query: "${query}"

Available events:
${eventDescriptions.map((e, i) => `${i + 1}. [ID:${e.id}] ${e.text}`).join('\n')}

Return ONLY a valid JSON array of event IDs ranked by relevance (most relevant first), with a brief reason why each matches. Format:
[
  {"id": <event_id>, "score": <0.0-1.0>, "reason": "brief match explanation"},
  ...
]

Rules:
- Match based on topic, type, time preference (morning/evening), location preference, skill level
- Include at least top 3-5 matches if available
- Score from 0.0 (no match) to 1.0 (perfect match)
- Be generous with matches - help users discover relevant events
- Return ONLY the JSON array, no additional text

JSON:`;

    const aiResponse = await context.env.AI.run(
      '@cf/meta/llama-3.1-8b-instruct',
      {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      }
    );

    // Parse AI response
    let rankedResults: Array<{ id: number; score: number; reason: string }> = [];
    try {
      const responseText = aiResponse.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }

      rankedResults = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(rankedResults)) {
        throw new Error('AI response is not an array');
      }

      // Filter and validate results
      rankedResults = rankedResults.filter((result: any) =>
        typeof result.id === 'number' &&
        typeof result.score === 'number' &&
        typeof result.reason === 'string' &&
        result.score >= 0 &&
        result.score <= 1
      );

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI Response:', aiResponse.response);

      // Fallback: simple text matching
      const queryLower = query.toLowerCase();
      rankedResults = events
        .filter((event: any) => {
          const searchText = `${event.title} ${event.description} ${event.event_type} ${event.location}`.toLowerCase();
          return searchText.includes(queryLower);
        })
        .map((event: any) => ({
          id: event.id,
          score: 0.7,
          reason: 'Text match fallback'
        }));
    }

    // Build final results with event details
    const rankedEvents = rankedResults
      .map(result => {
        const event = events.find((e: any) => e.id === result.id);
        if (!event) return null;

        return {
          ...event,
          relevance_score: result.score,
          match_reason: result.reason
        };
      })
      .filter((e): e is Event => e !== null);

    return new Response(JSON.stringify({
      success: true,
      events: rankedEvents,
      query,
      count: rankedEvents.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in AI event search:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to search events',
      events: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
