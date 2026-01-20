import type { FederationEnv } from '../../federation/config';
import { createFederationInstance } from '../../federation/config';
import { Like, Undo } from '@fedify/fedify';
import { FedifyUriGenerator, getDomainFromRequest } from '../../federation/uris';

export const onRequestPost: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;

  try {
    const { postId, userEmail } = await request.json();

    if (!postId || !userEmail) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: postId and userEmail'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // REASONING: Fetch post info FIRST to know if federation is needed
    // We need: activitypub_uri (target object), author email (recipient), federated flag
    const post = await env.DB.prepare(`
      SELECT p.*, u.email as author_email
      FROM posts p
      JOIN users u ON p.user_email = u.email
      WHERE p.id = ?
    `).bind(postId).first();

    if (!post) {
      return new Response(JSON.stringify({
        error: 'Post not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize domain and URI generator for potential federation
    const domain = getDomainFromRequest(request);
    const uriGen = new FedifyUriGenerator(domain);

    // Check if already liked
    const existing = await env.DB.prepare(`
      SELECT id FROM post_likes WHERE post_id = ? AND user_email = ?
    `).bind(postId, userEmail).first();

    if (existing) {
      // Unlike
      await env.DB.prepare(`
        DELETE FROM post_likes WHERE post_id = ? AND user_email = ?
      `).bind(postId, userEmail).run();

      // Decrement count
      await env.DB.prepare(`
        UPDATE post_stats
        SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END
        WHERE post_id = ?
      `).bind(postId).run();

      // REASONING: Federation logic for UNLIKE
      // - Only federate if post has ActivityPub identity
      // - Send Undo(Like) to notify post author and their followers
      // - Failures are logged but don't block the response (local-first principle)
      if (post.federated && post.activitypub_uri) {
        try {
          const federation = createFederationInstance(env);
          const likeUri = `${uriGen.getActorUri(userEmail)}/likes/${postId}`;

          const undoActivity = new Undo({
            id: new URL(`${uriGen.getActorUri(userEmail)}/undo/like/${postId}/${Date.now()}`),
            actor: new URL(uriGen.getActorUri(userEmail)),
            object: new Like({
              id: new URL(likeUri),
              actor: new URL(uriGen.getActorUri(userEmail)),
              object: new URL(post.activitypub_uri)
            })
          });

          // Send to post author's inbox (they own the content)
          await federation.sendActivity(
            { handle: userEmail },
            post.author_email,
            undoActivity,
            { preferSharedInbox: true }
          );

          console.log(`Federated unlike: ${userEmail} unliked post ${postId}`);
        } catch (error) {
          console.error('Failed to federate unlike:', error);
          // Don't fail the response - local unlike succeeded
        }
      }

      return new Response(JSON.stringify({
        success: true,
        liked: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Like
      await env.DB.prepare(`
        INSERT INTO post_likes (post_id, user_email)
        VALUES (?, ?)
      `).bind(postId, userEmail).run();

      // Increment count
      await env.DB.prepare(`
        INSERT INTO post_stats (post_id, likes_count, boosts_count, replies_count)
        VALUES (?, 1, 0, 0)
        ON CONFLICT(post_id) DO UPDATE SET likes_count = likes_count + 1
      `).bind(postId).run();

      // REASONING: Federation logic for LIKE
      // - Only federate if post has ActivityPub identity
      // - Send Like activity to post author (content owner)
      // - Author's instance will forward to their followers
      // - Failures logged but don't block response
      if (post.federated && post.activitypub_uri) {
        try {
          const federation = createFederationInstance(env);
          const likeUri = `${uriGen.getActorUri(userEmail)}/likes/${postId}`;

          const likeActivity = new Like({
            id: new URL(likeUri),
            actor: new URL(uriGen.getActorUri(userEmail)),
            object: new URL(post.activitypub_uri)
          });

          // Send to post author's inbox
          await federation.sendActivity(
            { handle: userEmail },
            post.author_email,
            likeActivity,
            { preferSharedInbox: true }
          );

          console.log(`Federated like: ${userEmail} liked post ${postId}`);
        } catch (error) {
          console.error('Failed to federate like:', error);
          // Don't fail the response - local like succeeded
        }
      }

      return new Response(JSON.stringify({
        success: true,
        liked: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Like error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to like post'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
