/**
 * AI-powered standup response processor
 * - Content safety checking
 * - Response cleanup and formatting
 * - Professional tone enhancement
 */

/**
 * Check if standup content is safe using LLM-based content moderation
 * @param {Object} ai - Cloudflare AI binding
 * @param {string} workingOn - What they're working on
 * @param {string} canHelpWith - What they can help with
 * @param {string} needHelpWith - What they need help with
 * @returns {Promise<{isSafe: boolean, warnings: string[]}>}
 */
export async function checkStandupSafety(ai, workingOn, canHelpWith, needHelpWith) {
  try {
    const combinedText = `Working on: ${workingOn}\nCan help with: ${canHelpWith}\nNeed help with: ${needHelpWith}`;

    const prompt = `You are a content moderation system for a professional developer community stand-up. Analyze the following stand-up responses and determine if they contain:
- Hate speech, harassment, or discrimination
- Inappropriate or offensive content
- Spam or misleading information
- Personal information or contact details that should be private
- Off-topic or non-professional content

Stand-up responses:
"${combinedText}"

Respond ONLY with a JSON object in this exact format:
{
  "isSafe": true or false,
  "warnings": [\"warning1\", \"warning2\"] or []
}

If the content is appropriate for a professional developer stand-up, set isSafe to true and warnings to []. If unsafe, set isSafe to false and list specific concerns in warnings.`;

    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: prompt,
      max_tokens: 200
    });

    // Parse the response
    let response = result.response || '';

    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isSafe: parsed.isSafe === true,
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
      };
    }

    // If parsing fails, default to safe but log the issue
    console.warn('Standup safety check failed to parse response:', response);
    return { isSafe: true, warnings: [] };

  } catch (error) {
    console.error('Standup safety check error:', error);
    // Default to safe if check fails to avoid blocking legitimate content
    return { isSafe: true, warnings: ['Content safety check unavailable'] };
  }
}

/**
 * Clean up and enhance a standup response using AI
 * @param {Object} ai - Cloudflare AI binding
 * @param {string} text - Raw response text
 * @param {string} questionType - Type of question (working_on, can_help_with, need_help_with)
 * @returns {Promise<string>} Cleaned up response
 */
export async function cleanupStandupResponse(ai, text, questionType) {
  try {
    const questionContext = {
      working_on: "what they're working on today",
      can_help_with: "what they can help others with",
      need_help_with: "what they need help with"
    };

    const prompt = `You are helping clean up developer stand-up responses for a professional community. Your job is to:
- Fix grammar and spelling errors
- Make the response more concise and clear
- Keep the original meaning intact
- Maintain a professional but friendly tone
- Remove any unnecessary filler words
- Keep it brief (1-3 sentences max)
- IMPORTANT: Keep responses in FIRST PERSON (use "I", "I'm", "my", "I am", etc.)
- NEVER convert to third person (do NOT use "they", "the user", "this person", etc.)
- Preserve the personal voice - this is someone talking about themselves

Original response for "${questionContext[questionType]}":
"${text}"

Respond with ONLY the cleaned up version of the text in FIRST PERSON, nothing else. Do not add explanations or commentary.`;

    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: prompt,
      max_tokens: 300
    });

    let cleaned = result.response || text;

    // Remove any quotes that the LLM might have added
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

    // Check if response was accidentally converted to third person
    const thirdPersonIndicators = /\b(they|them|their|the user|this person|he|she|him|her)\b/i;
    const firstPersonIndicators = /\b(I|I'm|my|me|myself|I am)\b/i;

    // If converted to third person but original was first person, return original
    if (thirdPersonIndicators.test(cleaned) && firstPersonIndicators.test(text) && !firstPersonIndicators.test(cleaned)) {
      console.warn('AI converted to third person, using original:', cleaned);
      return text.trim();
    }

    // If the response is too long or seems invalid, return original
    if (cleaned.length > 500 || cleaned.length === 0) {
      return text.trim();
    }

    return cleaned;

  } catch (error) {
    console.error('Standup cleanup error:', error);
    // Return original text if cleanup fails
    return text.trim();
  }
}

/**
 * Process all standup responses through AI
 * @param {Object} ai - Cloudflare AI binding
 * @param {Object} responses - Raw standup responses
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function processStandupResponses(ai, responses) {
  try {
    const { workingOn, canHelpWith, needHelpWith } = responses;

    // Validate required fields
    if (!workingOn?.trim()) {
      return {
        success: false,
        error: 'Please tell us what you\'re working on'
      };
    }

    if (!canHelpWith?.trim()) {
      return {
        success: false,
        error: 'Please tell us what you can help with'
      };
    }

    // needHelpWith is optional
    const hasNeedHelp = needHelpWith?.trim();

    // Step 1: Check content safety
    const { isSafe, warnings } = await checkStandupSafety(
      ai,
      workingOn,
      canHelpWith,
      hasNeedHelp ? needHelpWith : 'Nothing specific'
    );

    if (!isSafe) {
      return {
        success: false,
        error: 'Content flagged as potentially inappropriate for a professional community',
        warnings: warnings
      };
    }

    // Step 2: Clean up each response
    const [cleanedWorkingOn, cleanedCanHelpWith, cleanedNeedHelpWith] = await Promise.all([
      cleanupStandupResponse(ai, workingOn, 'working_on'),
      cleanupStandupResponse(ai, canHelpWith, 'can_help_with'),
      hasNeedHelp
        ? cleanupStandupResponse(ai, needHelpWith, 'need_help_with')
        : Promise.resolve(null)
    ]);

    return {
      success: true,
      data: {
        cleaned: {
          workingOn: cleanedWorkingOn,
          canHelpWith: cleanedCanHelpWith,
          needHelpWith: cleanedNeedHelpWith
        },
        isSafe: isSafe,
        confidence: 0.85,
        contentWarnings: warnings.length > 0 ? warnings : undefined
      }
    };

  } catch (error) {
    console.error('Standup processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process standup responses'
    };
  }
}
