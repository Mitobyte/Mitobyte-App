/**
 * Cloudflare Pages Function: /api/forms/parse-natural-language
 * Parse natural language form description into structured form JSON
 *
 * Example input:
 * "Create a feedback form with name, email, rating from 1-5, and comments"
 *
 * Output:
 * {
 *   title: "Feedback Form",
 *   description: "Feedback collection form",
 *   questions: [
 *     { label: "Name", type: "text", required: true, placeholder: "Enter your name" },
 *     { label: "Email", type: "email", required: true, placeholder: "your@email.com" },
 *     { label: "Rating", type: "rating", required: true },
 *     { label: "Comments", type: "textarea", required: false, placeholder: "Share your feedback" }
 *   ]
 * }
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Parse natural language form description using Workers AI
 */
async function parseFormDescription(ai, description) {
  try {
    // Use Llama 3.1 70B for advanced reasoning
    const response = await ai.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        {
          role: 'system',
          content: `You are a form structure parser. Given a natural language description of a form, extract:
1. Form title (infer from context)
2. Form description (brief summary)
3. List of questions with:
   - label (the question text)
   - type (text, textarea, email, number, select, radio, checkbox, rating)
   - required (true/false, default true for essential fields)
   - placeholder (helpful hint for the user)
   - options (array of strings, only for select/radio/checkbox)

Return ONLY valid JSON in this exact format:
{
  "title": "Form Title",
  "description": "Brief description",
  "questions": [
    {
      "label": "Question text",
      "type": "text",
      "required": true,
      "placeholder": "Hint text",
      "options": []
    }
  ]
}

Field type guidelines:
- text: Short answers (name, title, single line)
- textarea: Long answers (comments, descriptions, paragraphs)
- email: Email addresses
- number: Numeric values
- select: Dropdown with predefined options
- radio: Single choice from options
- checkbox: Multiple selections from options
- rating: 1-5 star rating

DO NOT include markdown code blocks, backticks, or any extra text. Only output raw JSON.`
        },
        {
          role: 'user',
          content: description
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent structured output
      max_tokens: 2000
    });

    // Extract the text response
    let jsonText = response.response || '';

    // Clean up the response - remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse the JSON
    const parsed = JSON.parse(jsonText);

    // Validate the structure
    if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid form structure returned from AI');
    }

    // Validate and clean up questions
    parsed.questions = parsed.questions.map(q => ({
      label: q.label || 'Untitled Question',
      type: ['text', 'textarea', 'email', 'number', 'select', 'radio', 'checkbox', 'rating'].includes(q.type)
        ? q.type
        : 'text',
      required: q.required !== false, // Default to true
      placeholder: q.placeholder || '',
      options: Array.isArray(q.options) ? q.options : []
    }));

    return parsed;
  } catch (error) {
    console.error('AI parsing error:', error);
    throw new Error(`Failed to parse form description: ${error.message}`);
  }
}

/**
 * POST /api/forms/parse-natural-language
 * Body: { description: "natural language form description" }
 */
export async function onRequestPost(context) {
  try {
    const { description } = await context.request.json();

    if (!description || typeof description !== 'string') {
      return jsonResponse({
        error: 'Description is required and must be a string'
      }, 400);
    }

    if (description.length < 10) {
      return jsonResponse({
        error: 'Description is too short. Please provide more details about the form you want to create.'
      }, 400);
    }

    if (description.length > 2000) {
      return jsonResponse({
        error: 'Description is too long. Please keep it under 2000 characters.'
      }, 400);
    }

    // Check if AI binding is available
    if (!context.env.AI) {
      return jsonResponse({
        error: 'AI service is not configured'
      }, 500);
    }

    console.log('Parsing form description:', description);

    // Parse the description using AI
    const formStructure = await parseFormDescription(context.env.AI, description);

    console.log('Generated form structure:', formStructure);

    return jsonResponse({
      success: true,
      form: formStructure,
      raw_description: description
    });
  } catch (error) {
    console.error('Parse natural language form error:', error);
    return jsonResponse({
      error: error.message || 'Failed to parse form description',
      details: error.toString()
    }, 500);
  }
}
