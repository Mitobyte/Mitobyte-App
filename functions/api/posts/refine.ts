/**
 * AI Post Refinement API
 * Uses Cloudflare AI to help users refine and improve their posts
 */

interface Env {
  AI: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { content, postType } = await context.request.json();

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct the prompt based on post type
    let systemPrompt = '';
    if (postType === 'job') {
      systemPrompt = `You are a professional job posting editor. Help refine this job posting to be clear, professional, and compelling.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown syntax (bold, italic, code blocks, etc.)
- DO NOT use quotation marks around text
- Use plain text with emojis for visual structure
- Use line breaks for spacing
- Keep hashtags as #hashtag format
- Format naturally for a social media platform

Focus on:
- Clear job title and requirements
- Professional tone
- Key responsibilities and qualifications
- Natural formatting with emojis and spacing

Return only the refined post text, formatted ready to post.`;
    } else {
      systemPrompt = `You are a social media content editor. Help refine this post to be clear, engaging, and professional.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown syntax (bold, italic, code blocks, etc.)
- DO NOT use quotation marks around text
- Use plain text naturally
- Keep emojis if present
- Keep hashtags as #hashtag format
- Use line breaks for readability

Focus on:
- Clear and concise messaging
- Proper grammar and punctuation
- Engaging tone appropriate for a professional community
- Remove unnecessary words while keeping the authentic voice

Return only the refined post text, formatted ready to post.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ];

    // Use Cloudflare Workers AI
    const response = await context.env.AI.run(
      '@cf/meta/llama-3.1-8b-instruct',
      {
        messages,
        max_tokens: 500,
        temperature: 0.7
      }
    );

    const refinedContent = response.response || content;

    return new Response(JSON.stringify({
      refined: refinedContent.trim(),
      original: content
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('AI refinement error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to refine post',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
