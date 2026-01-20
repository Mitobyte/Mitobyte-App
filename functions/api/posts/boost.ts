import type { FederationEnv } from '../../federation/config';
import { createFederationInstance } from '../../federation/config';
import { Announce, Undo } from '@fedify/fedify';
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

    // REASONING: Fetch post info to determine federation requirements
    // Boost (Announce) broadcasts to booster's followers, not just author
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

    const domain = getDomainFromRequest(request);
    const uriGen = new FedifyUriGenerator(domain);

    // Check if already boosted
    const existing = await env.DB.prepare(`
      SELECT id FROM post_boosts WHERE post_id = ? AND user_email = ?
    `).bind(postId, userEmail).first();

    if (existing) {
      // Unboost
      await env.DB.prepare(`
        DELETE FROM post_boosts WHERE post_id = ? AND user_email = ?
      `).bind(postId, userEmail).run();

      // Decrement count
      await env.DB.prepare(`
        UPDATE post_stats
        SET boosts_count = CASE WHEN boosts_count > 0 THEN boosts_count - 1 ELSE 0 END
        WHERE post_id = ?
      `).bind(postId).run();

      // REASONING: Federation logic for UNBOOST
      // - Undo(Announce) removes boost from booster's followers' timelines
      // - Sent to booster's followers (they saw the original Announce)
      // - Different from Like: Announce is shown to followers, not just author
      if (post.federated && post.activitypub_uri) {
        try {
          const federation = createFederationInstance(env);
          const announceUri = `${uriGen.getActorUri(userEmail)}/boosts/${postId}`;

          const undoActivity = new Undo({
            id: new URL(`${uriGen.getActorUri(userEmail)}/undo/boost/${postId}/${Date.now()}`),
            actor: new URL(uriGen.getActorUri(userEmail)),
            object: new Announce({
              id: new URL(announceUri),
              actor: new URL(uriGen.getActorUri(userEmail)),
              object: new URL(post.activitypub_uri)
            })
          });

          // Send to followers (boosts go to followers' timelines)
          await federation.sendActivity(
            { handle: userEmail },
            'https://www.w3.org/ns/activitystreams#Public',
            undoActivity,
            { preferSharedInbox: true }
          );

          console.log(`Federated unboost: ${userEmail} unboosted post ${postId}`);
        } catch (error) {
          console.error('Failed to federate unboost:', error);
          // Local operation succeeded, federation failure is secondary
        }
      }

      return new Response(JSON.stringify({
        success: true,
        boosted: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Boost
      await env.DB.prepare(`
        INSERT INTO post_boosts (post_id, user_email)
        VALUES (?, ?)
      `).bind(postId, userEmail).run();

      // Increment count
      await env.DB.prepare(`
        INSERT INTO post_stats (post_id, likes_count, boosts_count, replies_count)
        VALUES (?, 0, 1, 0)
        ON CONFLICT(post_id) DO UPDATE SET boosts_count = boosts_count + 1
      `).bind(postId).run();

      // REASONING: Federation logic for BOOST
      // - Announce activity shows post in booster's followers' timelines
      // - This is the "retweet" mechanism of the Fediverse
      // - Goes to Public + booster's followers
      // - Author also gets notified (different from just re-sharing internally)
      if (post.federated && post.activitypub_uri) {
        try {
          const federation = createFederationInstance(env);
          const announceUri = `${uriGen.getActorUri(userEmail)}/boosts/${postId}`;

          const announceActivity = new Announce({
            id: new URL(announceUri),
            actor: new URL(uriGen.getActorUri(userEmail)),
            object: new URL(post.activitypub_uri),
            to: new URL('https://www.w3.org/ns/activitystreams#Public'),
            cc: [new URL(uriGen.getFollowersUri(userEmail))]
          });

          // Broadcast to followers
          await federation.sendActivity(
            { handle: userEmail },
            'https://www.w3.org/ns/activitystreams#Public',
            announceActivity,
            { preferSharedInbox: true }
          );

          console.log(`Federated boost: ${userEmail} boosted post ${postId}`);
        } catch (error) {
          console.error('Failed to federate boost:', error);
          // Local boost succeeded, federation is best-effort
        }
      }

      return new Response(JSON.stringify({
        success: true,
        boosted: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Boost error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to boost post'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
