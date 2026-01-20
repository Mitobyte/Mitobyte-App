import { publishActivity } from '../../federation/utils';
import type { FederationEnv } from '../../federation/config';
import { FedifyUriGenerator, getDomainFromRequest } from '../../federation/uris';

export const onRequestPost: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;

  try {
    const { userEmail, content, tags, visibility = 'public', replyToId } = await request.json();

    if (!userEmail || !content) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: userEmail and content'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify user exists
    const user = await env.DB.prepare(
      'SELECT email, display_name FROM users WHERE email = ?'
    ).bind(userEmail).first();

    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate ActivityPub URIs for federation
    const domain = getDomainFromRequest(request);
    const uriGen = new FedifyUriGenerator(domain);

    // Determine conversation URI (for threading)
    let conversationUri = null;
    if (replyToId) {
      // If this is a reply, inherit conversation_uri from parent
      const parent = await env.DB.prepare(
        'SELECT conversation_uri, id FROM posts WHERE id = ?'
      ).bind(replyToId).first();
      conversationUri = parent?.conversation_uri || uriGen.getConversationUri(parent?.id || replyToId);
    }

    // Create post with federation metadata
    const postResult = await env.DB.prepare(`
      INSERT INTO posts (
        user_email, content, visibility, reply_to_id,
        conversation_uri, federated
      )
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(
      userEmail, content, visibility, replyToId || null,
      conversationUri
    ).run();

    const postId = postResult.meta.last_row_id;

    // Generate post URIs now that we have the post ID
    const postUri = uriGen.getPostUri(postId);
    const activityId = uriGen.getActivityUri('create', postId);

    // Update post with ActivityPub URIs
    await env.DB.prepare(`
      UPDATE posts
      SET activitypub_uri = ?, activitypub_id = ?,
          conversation_uri = COALESCE(conversation_uri, ?)
      WHERE id = ?
    `).bind(postUri, activityId, uriGen.getConversationUri(postId), postId).run();

    // Map post to ActivityPub activity
    await env.DB.prepare(`
      INSERT INTO activitypub_post_mapping (post_id, activity_id, object_uri)
      VALUES (?, ?, ?)
    `).bind(postId, activityId, postUri).run();

    // Add tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await env.DB.prepare(`
          INSERT INTO post_tags (post_id, tag)
          VALUES (?, ?)
        `).bind(postId, tag.toLowerCase()).run();
      }
    }

    // Initialize stats
    await env.DB.prepare(`
      INSERT INTO post_stats (post_id, likes_count, boosts_count, replies_count)
      VALUES (?, 0, 0, 0)
    `).bind(postId).run();

    // Get the created post
    const post = await env.DB.prepare(`
      SELECT p.*, u.display_name, u.email as user_email,
        COALESCE(ps.likes_count, 0) as likes_count,
        COALESCE(ps.boosts_count, 0) as boosts_count,
        COALESCE(ps.replies_count, 0) as replies_count
      FROM posts p
      JOIN users u ON p.user_email = u.email
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.id = ?
    `).bind(postId).first();

    // Get tags for this post
    const postTags = await env.DB.prepare(`
      SELECT tag FROM post_tags WHERE post_id = ?
    `).bind(postId).all();

    const postWithTags = {
      ...post,
      tags: postTags.results.map(t => t.tag)
    };

    // Federate the post to followers (async, don't block on federation)
    if (visibility === 'public') {
      try {
        await publishPostToFollowers(env, postId, userEmail, domain);
      } catch (error) {
        console.error('Failed to federate post:', error);
        // Don't fail the post creation if federation fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      post: postWithTags
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create post error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create post',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Publish post to followers via ActivityPub federation
 * This stores the activity in the database, and Fedify's outbox
 * dispatcher will handle the actual delivery to followers via the queue.
 */
async function publishPostToFollowers(
  env: FederationEnv,
  postId: number,
  userEmail: string,
  domain: string
): Promise<void> {
  const uriGen = new FedifyUriGenerator(domain);
  const activityId = uriGen.getActivityUri('create', postId);
  const postUri = uriGen.getPostUri(postId);

  // Store activity for outbox (Fedify will handle delivery)
  await env.DB.prepare(`
    INSERT INTO activitypub_activities
    (user_email, activity_id, activity_type, object_type, object_id, published_at)
    VALUES (?, ?, 'Create', 'Note', ?, datetime('now'))
  `).bind(userEmail, activityId, postUri).run();

  console.log(`Post ${postId} queued for federation to ${userEmail} followers`);
}
