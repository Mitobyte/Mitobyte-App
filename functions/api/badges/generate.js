/**
 * Badge Generation API
 * Generates a personalized badge using Cloudflare Workers AI
 * - Uses Qwen/Llama for badge concept generation
 * - Uses Flux model for badge image generation
 */

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { eventDetails, userProfile, checkInId } = await request.json();

    // Validate input
    if (!eventDetails || !userProfile) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: eventDetails and userProfile'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🎨 Generating badge for:', {
      event: eventDetails.title,
      user: userProfile.display_name,
      checkInId
    });

    // Step 1: Generate badge concept using text generation model
    const badgePrompt = await generateBadgeConcept(env.AI, eventDetails, userProfile);
    console.log('✨ Badge concept:', badgePrompt);

    // Step 2: Generate badge image using Flux model
    const badgeImage = await generateBadgeImage(env.AI, badgePrompt);
    console.log('🖼️ Badge image generated');

    // Step 3: Store badge in database if checkInId provided
    if (checkInId) {
      await env.DB.prepare(`
        UPDATE checkins
        SET badge_image = ?, badge_prompt = ?
        WHERE id = ?
      `).bind(badgeImage, badgePrompt, checkInId).run();
      console.log('💾 Badge saved to database');
    }

    return new Response(JSON.stringify({
      success: true,
      badge: {
        image: badgeImage,
        prompt: badgePrompt
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Badge generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate badge concept using text generation model
 */
async function generateBadgeConcept(ai, eventDetails, userProfile) {
  const systemPrompt = `You are a creative badge designer for tech events. Generate a detailed visual description for a badge design that represents a user's attendance at an event.

The badge should:
- Be professional and eye-catching
- Incorporate elements from the event theme
- Reflect the user's profile/interests
- Include visual elements like colors, shapes, icons
- Be suitable for digital display (square format, bold colors)

Output ONLY the image generation prompt, nothing else.`;

  const userPrompt = `Create a badge design prompt for:

EVENT: ${eventDetails.title}
EVENT TYPE: ${eventDetails.event_type?.replace('_', ' ') || 'tech meetup'}
EVENT DESCRIPTION: ${eventDetails.description || 'A community tech event'}
LOCATION: ${eventDetails.location || 'Milwaukee'}

USER: ${userProfile.display_name || 'Community Member'}
USER BIO: ${userProfile.bio || 'Tech enthusiast'}
USER SKILLS: ${userProfile.skills || 'Software development'}
USER INTERESTS: ${userProfile.interests || 'Technology'}

Generate a detailed badge design prompt:`;

  try {
    // Use Llama model for text generation
    const response = await ai.run('@cf/meta/llama-3-8b-instruct-awq', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.8
    });

    const generatedPrompt = response.response || response.result?.response || '';

    // Enhance the prompt for better badge generation
    const enhancedPrompt = `Professional event badge design: ${generatedPrompt}. Square format, bold colors, modern typography, digital art style, high contrast, clean design, tech aesthetic`;

    return enhancedPrompt;
  } catch (error) {
    console.error('Text generation error:', error);
    // Fallback to a basic prompt
    return `Professional event badge for ${eventDetails.title}, featuring ${eventDetails.event_type?.replace('_', ' ')} theme, modern design, bold colors, ${userProfile.display_name}, tech aesthetic, square format, digital art`;
  }
}

/**
 * Generate badge image using Flux model
 */
async function generateBadgeImage(ai, prompt) {
  try {
    const response = await ai.run('@cf/black-forest-labs/flux-1-schnell', {
      prompt: prompt,
      steps: 8 // Maximum steps for best quality
    });

    // The response contains base64 encoded image
    const imageBase64 = response.image || response.result?.image;

    if (!imageBase64) {
      throw new Error('No image data returned from Flux model');
    }

    // Return as data URI for easy display
    return `data:image/png;base64,${imageBase64}`;
  } catch (error) {
    console.error('Image generation error:', error);
    throw new Error(`Badge image generation failed: ${error.message}`);
  }
}
