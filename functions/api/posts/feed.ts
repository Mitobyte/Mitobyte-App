import type { FederationEnv } from '../../federation/config';

export const onRequestGet: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const userEmail = url.searchParams.get('userEmail');
  const tag = url.searchParams.get('tag');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const feedType = url.searchParams.get('type') || 'all'; // all, following, user, trending

  try {
    let query = `
      SELECT p.*, u.display_name, u.email as user_email,
        COALESCE(ps.likes_count, 0) as likes_count,
        COALESCE(ps.boosts_count, 0) as boosts_count,
        COALESCE(ps.replies_count, 0) as replies_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_email = ?) as user_liked,
        EXISTS(SELECT 1 FROM post_boosts WHERE post_id = p.id AND user_email = ?) as user_boosted
      FROM posts p
      JOIN users u ON p.user_email = u.email
      LEFT JOIN post_stats ps ON p.id = ps.post_id
    `;

    const bindings: any[] = [userEmail || '', userEmail || ''];

    // Filter by tag
    if (tag) {
      query += `
        WHERE p.id IN (SELECT post_id FROM post_tags WHERE tag = ?)
      `;
      bindings.push(tag.toLowerCase());
    } else {
      query += ` WHERE 1=1 `;
    }

    // Filter by feed type
    if (feedType === 'following' && userEmail) {
      query += `
        AND p.user_email IN (
          SELECT following_email FROM user_follows WHERE follower_email = ?
        )
      `;
      bindings.push(userEmail);
    } else if (feedType === 'user' && userEmail) {
      query += ` AND p.user_email = ? `;
      bindings.push(userEmail);
    }

    // Only public posts for now - and only top-level posts (not replies)
    query += ` AND p.visibility = 'public' AND p.reply_to_id IS NULL `;

    // For trending, filter recent posts and order by engagement
    if (feedType === 'trending') {
      query += ` AND p.created_at > datetime('now', '-7 days') `;
      query += `
        ORDER BY (COALESCE(ps.likes_count, 0) + COALESCE(ps.boosts_count, 0) + COALESCE(ps.replies_count, 0)) DESC, p.created_at DESC
        LIMIT ? OFFSET ?
      `;
    } else {
      // Order by most recent
      query += `
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
    }
    bindings.push(limit, offset);

    const posts = await env.DB.prepare(query).bind(...bindings).all();

    // Get tags and replies for each post
    const postsWithTags = await Promise.all(
      posts.results.map(async (post) => {
        const tags = await env.DB.prepare(`
          SELECT tag FROM post_tags WHERE post_id = ?
        `).bind(post.id).all();

        // Get replies for this post
        const replies = await env.DB.prepare(`
          SELECT p.*, u.display_name, u.email as user_email,
            COALESCE(ps.likes_count, 0) as likes_count,
            COALESCE(ps.boosts_count, 0) as boosts_count,
            COALESCE(ps.replies_count, 0) as replies_count,
            EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_email = ?) as user_liked,
            EXISTS(SELECT 1 FROM post_boosts WHERE post_id = p.id AND user_email = ?) as user_boosted
          FROM posts p
          JOIN users u ON p.user_email = u.email
          LEFT JOIN post_stats ps ON p.id = ps.post_id
          WHERE p.reply_to_id = ?
          ORDER BY p.created_at ASC
        `).bind(userEmail || '', userEmail || '', post.id).all();

        // Get tags for each reply
        const repliesWithTags = await Promise.all(
          replies.results.map(async (reply) => {
            const replyTags = await env.DB.prepare(`
              SELECT tag FROM post_tags WHERE post_id = ?
            `).bind(reply.id).all();

            return {
              ...reply,
              tags: replyTags.results.map(t => t.tag)
            };
          })
        );

        return {
          ...post,
          tags: tags.results.map(t => t.tag),
          replies: repliesWithTags
        };
      })
    );

    // Get trending tags
    const trendingTags = await env.DB.prepare(`
      SELECT tag, COUNT(*) as count
      FROM post_tags
      WHERE post_id IN (
        SELECT id FROM posts
        WHERE created_at > datetime('now', '-7 days')
      )
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `).all();

    return new Response(JSON.stringify({
      success: true,
      posts: postsWithTags,
      trendingTags: trendingTags.results,
      hasMore: posts.results.length === limit
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Feed error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch feed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
