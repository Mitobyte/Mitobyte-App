/**
 * AI Profile Generation API Endpoint
 * Accepts free-form text about a user and uses Workers AI to extract structured profile data
 */

import { z } from 'zod';

// Define the expected structure for extracted profile data
const ProfileDataSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email().nullable().catch(null),
  location: z.string().nullable(),
  website: z.string().url().nullable().catch(null),
  bio: z.string().max(500).nullable(),
  tagline: z.string().max(100).nullable(),
  skills: z.array(z.string()).max(20).default([]),
  interests: z.array(z.string()).max(20).default([]),
  github_username: z.string().nullable(),
  linkedin_url: z.string().url().nullable().catch(null),
  twitter_username: z.string().nullable()
});

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Parse the JSON body
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate text length
    const minLength = 50;
    const maxLength = 5000;

    if (text.trim().length < minLength) {
      return new Response(JSON.stringify({
        error: `Please provide at least ${minLength} characters about yourself.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (text.length > maxLength) {
      return new Response(JSON.stringify({
        error: `Text is too long. Maximum ${maxLength} characters allowed.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Generating profile from text, length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));

    // Use Workers AI to extract structured data
    const extractedData = await extractProfileDataWithAI(text.trim(), env);

    return new Response(JSON.stringify({
      success: true,
      data: extractedData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Profile generation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate profile',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Use Workers AI to extract structured profile data from user's text
 */
async function extractProfileDataWithAI(text, env) {
  try {
    const prompt = `Extract information from this text and return ONLY a JSON object. No markdown, no explanations.

JSON format (use null if not found):
{
  "name": "string or null",
  "email": "string or null",
  "location": "string or null",
  "website": "string or null",
  "bio": "string or null (max 500 chars, write a compelling bio based on the text)",
  "tagline": "string or null (max 100 chars, write a catchy tagline)",
  "skills": ["skill1", "skill2"],
  "interests": ["interest1", "interest2"],
  "github_username": "string or null (just username, not full URL)",
  "linkedin_url": "string or null",
  "twitter_username": "string or null (just username, not @ or URL)"
}

User's text:
${text}

JSON:`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: prompt,
      max_tokens: 2048,
      temperature: 0.1
    });

    console.log('Workers AI response:', JSON.stringify(response, null, 2));

    // Parse the AI response
    let extractedData;
    try {
      const responseText = response.response || JSON.stringify(response);
      console.log('Response text:', responseText);

      // Remove markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      console.log('Cleaned JSON text:', jsonText);
      extractedData = JSON.parse(jsonText.trim());
      console.log('Parsed extracted data:', extractedData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Failed to parse AI response, using fallback');

      // Fallback: try to extract key information with regex
      extractedData = extractFallbackData(text);
    }

    // Clean usernames before validation
    const cleanedData = {
      ...extractedData,
      github_username: cleanUsername(extractedData.github_username),
      twitter_username: cleanUsername(extractedData.twitter_username)
    };

    // Validate and clean the extracted data using Zod schema
    const validated = ProfileDataSchema.parse(cleanedData);
    console.log('Validated profile data:', validated);
    return validated;

  } catch (error) {
    console.error('AI extraction error:', error);

    // Try fallback extraction
    const fallbackData = extractFallbackData(text);

    // Validate fallback data
    try {
      return ProfileDataSchema.parse(fallbackData);
    } catch (validationError) {
      console.error('Fallback data validation error:', validationError);
      // Return empty but valid structure
      return ProfileDataSchema.parse({
        name: null,
        email: null,
        location: null,
        website: null,
        bio: null,
        tagline: null,
        skills: [],
        interests: [],
        github_username: null,
        linkedin_url: null,
        twitter_username: null
      });
    }
  }
}

/**
 * Fallback data extraction using regex patterns
 */
function extractFallbackData(text) {
  const data = {
    name: null,
    email: null,
    location: null,
    website: null,
    bio: null,
    tagline: null,
    skills: [],
    interests: [],
    github_username: null,
    linkedin_url: null,
    twitter_username: null
  };

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) data.email = emailMatch[0];

  // Extract GitHub
  const githubMatch = text.match(/github\.com\/([a-zA-Z0-9-]+)/i);
  if (githubMatch) data.github_username = githubMatch[1];

  // Extract LinkedIn
  const linkedinMatch = text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+/i);
  if (linkedinMatch) data.linkedin_url = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;

  // Extract Twitter/X
  const twitterMatch = text.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
  if (twitterMatch) data.twitter_username = twitterMatch[1];

  // Extract common skills (basic pattern matching)
  const skillPatterns = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
    'HTML', 'CSS', 'Git', 'AWS', 'Docker', 'Kubernetes', 'REST API'
  ];

  data.skills = skillPatterns.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  );

  // Use first 500 chars as bio if nothing else
  if (text.length >= 100) {
    data.bio = text.substring(0, 500);
  }

  return data;
}

/**
 * Clean username by removing @ symbol and URLs
 */
function cleanUsername(username) {
  if (!username) return null;
  return username
    .replace(/^@/, '')
    .replace(/^https?:\/\/[^\/]+\//, '')
    .trim() || null;
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
