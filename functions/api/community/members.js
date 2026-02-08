/**
 * Community Members Directory API
 * Returns list of community members with profiles
 * Respects privacy settings - only shows users with 'public' or 'community' visibility
 */

export async function onRequestGet(context) {
  try {
    const members = await context.env.DB.prepare(`
      SELECT
        u.wallet_hash,
        u.email,
        COALESCE(up.name, u.display_name, u.email) as display_name,
        u.created_at,
        up.avatar_url,
        up.bio,
        up.tagline,
        up.location,
        up.website,
        up.github_username,
        up.twitter_username,
        up.linkedin_url,
        up.discord_username,
        up.skills,
        up.interests,
        COALESCE(up.profile_visibility, 'public') as profile_visibility
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE COALESCE(up.profile_visibility, 'public') != 'private'
      ORDER BY u.created_at DESC
      LIMIT 100
    `).all();

    const formattedMembers = members.results?.map(member => ({
      wallet_hash: member.wallet_hash,
      email: member.email,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      bio: member.bio,
      tagline: member.tagline,
      location: member.location,
      website: member.website,
      github_username: member.github_username,
      twitter_username: member.twitter_username,
      linkedin_url: member.linkedin_url,
      discord_username: member.discord_username,
      skills: member.skills,
      interests: member.interests,
      joined_at: member.created_at
    })) || [];

    return new Response(JSON.stringify({
      success: true,
      members: formattedMembers,
      count: formattedMembers.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch members:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch members',
      members: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
