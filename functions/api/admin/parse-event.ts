/**
 * AI Event Parser API Endpoint
 * Uses Cloudflare Workers AI to parse natural language event descriptions
 * and extract structured event data
 */

interface Env {
  AI: any;
}

interface EventParseResult {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  event_type: string;
  capacity: number | null;
  confidence: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as any;
    const { description: userInput, adminEmail } = body;

    // Validate admin access
    if (!adminEmail || !adminEmail.startsWith('carl@craftthefuture.xyz')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!userInput || typeof userInput !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Event description is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Current date for context
    const today = new Date().toISOString().split('T')[0];

    // Construct the AI prompt
    const prompt = `You are an event planning assistant. Extract structured event information from the following natural language description.

Current date: ${today}

Event description:
"${userInput}"

Extract and return ONLY a valid JSON object with these exact fields:
{
  "title": "event title (short, catchy)",
  "description": "detailed event description (1-3 sentences)",
  "date": "YYYY-MM-DD format (infer from description, use ${today} if not specified)",
  "time": "HH:MM format in 24-hour time (infer reasonable time, default 18:00)",
  "location": "event location (extract from description or use 'TBD' if not mentioned)",
  "event_type": "one of: code_and_coffee, code_and_brews, hackathon, workshop, meetup",
  "capacity": number or null (extract if mentioned, otherwise null),
  "confidence": 0.0 to 1.0 (how confident you are in the extraction)
}

Guidelines:
- For event_type: code_and_coffee for morning coding sessions, code_and_brews for evening/social coding, hackathon for competitions, workshop for educational/training, meetup for general tech gatherings
- If date is relative like "next Friday", calculate the actual date
- If time is mentioned like "6pm" or "evening", convert to 24-hour format (18:00)
- Extract capacity if mentioned (e.g., "limited to 50 people" -> 50)
- Be concise but informative in title and description
- Return ONLY the JSON object, no additional text

JSON:`;

    // Call Workers AI
    const aiResponse = await context.env.AI.run(
      '@cf/meta/llama-3.1-8b-instruct',
      {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }
    );

    // Parse AI response
    let parsedEvent: EventParseResult;
    try {
      const responseText = aiResponse.response || '';

      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      parsedEvent = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsedEvent.title || !parsedEvent.description || !parsedEvent.date) {
        throw new Error('Missing required fields in parsed event');
      }

      // Validate event_type
      const validTypes = ['code_and_coffee', 'code_and_brews', 'hackathon', 'workshop', 'meetup'];
      if (!validTypes.includes(parsedEvent.event_type)) {
        parsedEvent.event_type = 'meetup'; // Default fallback
      }

      // Ensure confidence is set
      if (!parsedEvent.confidence || parsedEvent.confidence < 0 || parsedEvent.confidence > 1) {
        parsedEvent.confidence = 0.7; // Default confidence
      }

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse event information. Please try rephrasing your description.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return parsed event
    return new Response(JSON.stringify({
      success: true,
      event: parsedEvent,
      raw_ai_response: aiResponse.response // For debugging
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error parsing event with AI:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process event description'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
