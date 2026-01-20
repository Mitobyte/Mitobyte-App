/**
 * AI Semantic Search for Community Members
 * Uses Cloudflare Workers AI to understand natural language queries
 * and match them with relevant community members
 */

interface Env {
  AI: any;
  DB: D1Database;
}

interface Member {
  wallet_hash: string;
  display_name: string;
  email: string;
  bio: string;
  tagline: string;
  skills: string;
  interests: string;
  location: string;
  avatar_url: string | null;
  website: string | null;
  github_username: string | null;
  twitter_username: string | null;
  linkedin_url: string | null;
  discord_username: string | null;
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

    // Fetch all public members
    const { results: members } = await context.env.DB.prepare(`
      SELECT
        up.user_wallet_hash as wallet_hash,
        u.display_name,
        u.email,
        up.bio,
        up.tagline,
        up.skills,
        up.interests,
        up.location,
        up.avatar_url,
        up.website,
        up.github_username,
        up.twitter_username,
        up.linkedin_url,
        up.discord_username
      FROM user_profiles up
      JOIN users u ON up.user_wallet_hash = u.wallet_hash
      WHERE up.visibility = 'public'
      ORDER BY u.created_at DESC
    `).all();

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        members: [],
        query
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create enriched member descriptions for AI analysis
    const memberDescriptions = members.map((member: any) => {
      const skills = member.skills ? JSON.parse(member.skills).join(', ') : '';
      const interests = member.interests ? JSON.parse(member.interests).join(', ') : '';

      let description = `${member.display_name || 'Member'}`;

      if (member.tagline) description += `. ${member.tagline}`;
      if (member.bio) description += `. ${member.bio}`;
      if (skills) description += `. Skills: ${skills}`;
      if (interests) description += `. Interests: ${interests}`;
      if (member.location) description += `. Location: ${member.location}`;

      // Add social presence info
      const socials = [];
      if (member.github_username) socials.push('GitHub');
      if (member.twitter_username) socials.push('Twitter');
      if (member.linkedin_url) socials.push('LinkedIn');
      if (member.website) socials.push('personal website');
      if (socials.length > 0) description += `. Active on: ${socials.join(', ')}`;

      return {
        wallet_hash: member.wallet_hash,
        text: description
      };
    });

    // Use AI to analyze query and match with members
    const prompt = `You are a community member matching system. Analyze this search query and match it with the most relevant community members.

User query: "${query}"

Available members:
${memberDescriptions.map((m, i) => `${i + 1}. [HASH:${m.wallet_hash}] ${m.text}`).join('\n')}

Return ONLY a valid JSON array of member wallet hashes ranked by relevance (most relevant first), with a brief reason why each matches. Format:
[
  {"wallet_hash": "<wallet_hash>", "score": <0.0-1.0>, "reason": "brief match explanation"},
  ...
]

Rules:
- Match based on skills, interests, location, expertise, social presence, experience level
- Understand intent: "backend developer" → match Node.js, Python, databases; "designer" → match UI/UX, Figma
- Include at least top 5-8 matches if available
- Score from 0.0 (no match) to 1.0 (perfect match)
- Be generous with matches - help users discover relevant connections
- Consider complementary skills for collaboration queries (e.g., "React developer to learn from" → experienced React devs)
- Return ONLY the JSON array, no additional text

JSON:`;

    const aiResponse = await context.env.AI.run(
      '@cf/meta/llama-3.1-8b-instruct',
      {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      }
    );

    // Parse AI response
    let rankedResults: Array<{ wallet_hash: string; score: number; reason: string }> = [];
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
        typeof result.wallet_hash === 'string' &&
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
      rankedResults = members
        .filter((member: any) => {
          const searchText = `${member.display_name} ${member.bio} ${member.tagline} ${member.skills} ${member.interests} ${member.location}`.toLowerCase();
          return searchText.includes(queryLower);
        })
        .map((member: any) => ({
          wallet_hash: member.wallet_hash,
          score: 0.7,
          reason: 'Text match fallback'
        }));
    }

    // Build final results with member details
    const rankedMembers = rankedResults
      .map(result => {
        const member = members.find((m: any) => m.wallet_hash === result.wallet_hash);
        if (!member) return null;

        return {
          ...member,
          relevance_score: result.score,
          match_reason: result.reason
        };
      })
      .filter((m): m is Member => m !== null);

    return new Response(JSON.stringify({
      success: true,
      members: rankedMembers,
      query,
      count: rankedMembers.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in AI member search:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to search members',
      members: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
