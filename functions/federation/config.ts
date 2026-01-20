import {
  createFederation,
  Person,
  Note,
  Create,
  Follow,
  Accept,
  Like,
  Announce,
  Undo,
  Image,
  Document,
  type Federation,
  type Context
} from "@fedify/fedify";
import { WorkersKvStore, WorkersMessageQueue } from "@fedify/cfworkers";
import { getOrCreateActorKeys } from './keys';
import { FedifyUriGenerator } from './uris';

export interface FederationEnv {
  DB: D1Database;
  FEDERATION_KV: KVNamespace;
  FEDERATION_QUEUE: Queue;
}

export function createFederationInstance(env: FederationEnv): Federation<FederationEnv> {
  const federation = createFederation<FederationEnv>({
    kv: new WorkersKvStore(env.FEDERATION_KV),
    queue: new WorkersMessageQueue(env.FEDERATION_QUEUE),
  });

  // Actor dispatcher - maps users to ActivityPub actors with HTTP signature keys
  federation.setActorDispatcher("/users/{handle}", async (ctx, handle) => {
    try {
      // Query D1 database for user by email (handle)
      const user = await ctx.data.DB.prepare(
        "SELECT * FROM users WHERE email = ?"
      ).bind(handle).first();

      if (!user) return null;

      // Get or create actor keys for HTTP signatures
      const domain = new URL(ctx.url).hostname;
      const keys = await getOrCreateActorKeys(ctx.data, handle, domain);

      return new Person({
        id: ctx.getActorUri(handle),
        name: user.display_name || user.email.split('@')[0],
        preferredUsername: handle.split('@')[0],
        summary: user.bio || `Mitobyte user - ${user.email}`,
        inbox: ctx.getInboxUri(handle),
        outbox: ctx.getOutboxUri(handle),
        followers: ctx.getFollowersUri(handle),
        following: ctx.getFollowingUri(handle),
        url: ctx.url,
        published: new Date(user.created_at),
        // Add public key for HTTP signatures
        publicKey: {
          id: new URL(keys.keyId),
          owner: ctx.getActorUri(handle),
          publicKey: keys.publicKey
        },
        // Add shared inbox endpoint
        endpoints: {
          sharedInbox: ctx.getInboxUri()
        }
      });
    } catch (error) {
      console.error('Error fetching actor:', error);
      return null;
    }
  });

  // Add actor key pairs dispatcher for signing activities
  federation.setActorKeyPairsDispatcher(async (ctx, handle) => {
    const domain = new URL(ctx.url).hostname;
    const keys = await getOrCreateActorKeys(ctx.data, handle, domain);

    return [{
      privateKey: keys.privateKey,
      keyId: new URL(keys.keyId)
    }];
  });

  // WebFinger username to email mapping
  federation.mapHandle(async (ctx, username) => {
    // Try exact email match
    const userByEmail = await ctx.data.DB.prepare(
      "SELECT email FROM users WHERE email = ?"
    ).bind(username).first();

    if (userByEmail) return userByEmail.email;

    // Try username part match
    const userByUsername = await ctx.data.DB.prepare(
      "SELECT email FROM users WHERE email LIKE ?"
    ).bind(`${username}@%`).first();

    if (userByUsername) return userByUsername.email;

    return null;
  });

  // Post object dispatcher
  federation.setObjectDispatcher(
    Note,
    "/posts/{id}",
    async (ctx, values) => {
      const postId = parseInt(values.id);
      if (isNaN(postId)) return null;

      const post = await ctx.data.DB.prepare(`
        SELECT p.*, u.email, u.display_name
        FROM posts p
        JOIN users u ON p.user_email = u.email
        WHERE p.id = ?
      `).bind(postId).first();

      if (!post) return null;

      const tags = await ctx.data.DB.prepare(`
        SELECT tag FROM post_tags WHERE post_id = ?
      `).bind(postId).all();

      const domain = new URL(ctx.url).hostname;
      const uriGen = new FedifyUriGenerator(domain);

      const noteProps: any = {
        id: new URL(uriGen.getPostUri(postId)),
        content: post.content,
        published: new Date(post.created_at),
        attributedTo: ctx.getActorUri(post.user_email),
        to: new URL("https://www.w3.org/ns/activitystreams#Public"),
        cc: [ctx.getFollowersUri(post.user_email)],
      };

      if (post.reply_to_id) {
        noteProps.inReplyTo = new URL(uriGen.getPostUri(post.reply_to_id));

        const parent = await ctx.data.DB.prepare(
          "SELECT conversation_uri FROM posts WHERE id = ?"
        ).bind(post.reply_to_id).first();

        noteProps.context = parent?.conversation_uri
          ? new URL(parent.conversation_uri)
          : new URL(uriGen.getConversationUri(post.reply_to_id));
      } else {
        noteProps.context = new URL(uriGen.getConversationUri(postId));
      }

      if (tags.results.length > 0) {
        noteProps.tag = tags.results.map(t => ({
          type: "Hashtag",
          name: `#${t.tag}`,
          href: new URL(`https://${domain}/tags/${t.tag}`)
        }));
      }

      return new Note(noteProps);
    }
  );

  // NodeInfo dispatcher for server information
  federation.setNodeInfoDispatcher("/nodeinfo/2.1", async (ctx) => {
    const userCount = await ctx.data.DB.prepare(
      "SELECT COUNT(*) as count FROM users"
    ).first();

    const postCount = await ctx.data.DB.prepare(
      "SELECT COUNT(*) as count FROM posts WHERE federated = 1"
    ).first();

    return {
      software: {
        name: "Mitobyte Social",
        version: "1.0.0",
        repository: "https://github.com/yourusername/mitobyte"
      },
      protocols: ["activitypub"],
      services: { inbound: [], outbound: [] },
      openRegistrations: false,
      usage: {
        users: {
          total: userCount?.count || 0,
          activeMonth: userCount?.count || 0,
          activeHalfyear: userCount?.count || 0
        },
        localPosts: postCount?.count || 0,
        localComments: 0
      },
      metadata: {
        nodeName: "Mitobyte Social",
        nodeDescription: "A federated social platform"
      }
    };
  });

  // Inbox listeners - handle incoming activities
  federation
    .setInboxListeners("/users/{handle}/inbox", "/inbox")
    .on(Create, async (ctx, create) => {
      try {
        const object = await create.getObject();

        if (object instanceof Note) {
          const actorUri = create.actorId?.href;
          const objectUri = object.id?.href;

          if (!actorUri || !objectUri) return;

          // Check if already exists
          const existing = await ctx.data.DB.prepare(`
            SELECT id FROM activitypub_remote_posts WHERE object_uri = ?
          `).bind(objectUri).first();

          if (existing) return;

          // Store remote post
          await ctx.data.DB.prepare(`
            INSERT INTO activitypub_remote_posts
            (activity_uri, object_uri, actor_uri, content, published_at, raw_object)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            create.id?.href || '',
            objectUri,
            actorUri,
            object.content || '',
            object.published?.toISOString() || new Date().toISOString(),
            JSON.stringify(object)
          ).run();

          console.log(`Stored remote post: ${objectUri}`);
        }
      } catch (error) {
        console.error('Error handling Create activity:', error);
      }
    })
    .on(Follow, async (ctx, follow) => {
      try {
        const followerUri = follow.actorId?.href;
        const objectUri = follow.objectId?.href;

        if (!followerUri || !objectUri) return;

        // Extract handle from the object URI
        const handle = extractHandleFromUri(objectUri);
        if (!handle) return;

        // Fetch follower details
        const followerActor = await follow.getActor();
        const followerHandle = followerActor?.preferredUsername || 'unknown';
        const followerName = followerActor?.name || followerHandle;

        // Store follower in database
        await ctx.data.DB.prepare(`
          INSERT OR REPLACE INTO activitypub_followers
          (user_email, follower_uri, follower_handle, follower_name, status, accepted_at)
          VALUES (?, ?, ?, ?, 'accepted', datetime('now'))
        `).bind(handle, followerUri, followerHandle, followerName).run();

        // Cache the follower actor
        if (followerActor) {
          await cacheActor(ctx.data.DB, followerActor);
        }

        // Auto-accept the follow by sending Accept activity
        await ctx.sendActivity(
          { handle },
          followerUri,
          new Accept({
            id: new URL(`${ctx.getActorUri(handle)}/accepts/${Date.now()}`),
            actor: ctx.getActorUri(handle),
            object: follow
          })
        );

        console.log(`User ${handle} accepted follow from ${followerHandle}`);
      } catch (error) {
        console.error('Error handling Follow activity:', error);
      }
    })
    .on(Undo, async (ctx, undo) => {
      try {
        const object = await undo.getObject();

        // Handle Unfollow
        if (object instanceof Follow) {
          const followerUri = undo.actorId?.href;
          const objectUri = object.objectId?.href;

          if (!followerUri || !objectUri) return;

          const handle = extractHandleFromUri(objectUri);
          if (!handle) return;

          // Remove follower from database
          await ctx.data.DB.prepare(`
            DELETE FROM activitypub_followers
            WHERE user_email = ? AND follower_uri = ?
          `).bind(handle, followerUri).run();

          console.log(`Removed follower ${followerUri} from ${handle}`);
        }
      } catch (error) {
        console.error('Error handling Undo activity:', error);
      }
    })
    .on(Like, async (ctx, like) => {
      try {
        const actorUri = like.actorId?.href;
        const objectUri = like.objectId?.href;

        if (!actorUri || !objectUri) return;

        // Fetch actor details
        const actor = await like.getActor();
        const actorHandle = actor?.preferredUsername || 'unknown';

        // Store like in database
        await ctx.data.DB.prepare(`
          INSERT OR IGNORE INTO activitypub_likes
          (activity_id, actor_uri, actor_handle)
          VALUES (?, ?, ?)
        `).bind(objectUri, actorUri, actorHandle).run();

        console.log(`Received like from ${actorHandle} on ${objectUri}`);
      } catch (error) {
        console.error('Error handling Like activity:', error);
      }
    })
    .on(Announce, async (ctx, announce) => {
      try {
        const actorUri = announce.actorId?.href;
        const objectUri = announce.objectId?.href;

        if (!actorUri || !objectUri) return;

        // Fetch actor details
        const actor = await announce.getActor();
        const actorHandle = actor?.preferredUsername || 'unknown';

        // Store share/boost in database
        await ctx.data.DB.prepare(`
          INSERT OR IGNORE INTO activitypub_shares
          (activity_id, actor_uri, actor_handle)
          VALUES (?, ?, ?)
        `).bind(objectUri, actorUri, actorHandle).run();

        console.log(`Received boost from ${actorHandle} of ${objectUri}`);
      } catch (error) {
        console.error('Error handling Announce activity:', error);
      }
    });

  // Followers collection dispatcher
  federation.setFollowersDispatcher("/users/{handle}/followers", async (ctx, handle) => {
    try {
      const followers = await ctx.data.DB.prepare(`
        SELECT follower_uri
        FROM activitypub_followers
        WHERE user_email = ? AND status = 'accepted'
        ORDER BY accepted_at DESC
      `).bind(handle).all();

      return {
        items: followers.results.map(f => new URL(f.follower_uri))
      };
    } catch (error) {
      console.error('Error fetching followers:', error);
      return { items: [] };
    }
  });

  // Following collection dispatcher
  federation.setFollowingDispatcher("/users/{handle}/following", async (ctx, handle) => {
    try {
      const following = await ctx.data.DB.prepare(`
        SELECT following_uri
        FROM activitypub_following
        WHERE user_email = ? AND status = 'accepted'
        ORDER BY accepted_at DESC
      `).bind(handle).all();

      return {
        items: following.results.map(f => new URL(f.following_uri))
      };
    } catch (error) {
      console.error('Error fetching following:', error);
      return { items: [] };
    }
  });

  // Outbox dispatcher - publish user's activities
  federation.setOutboxDispatcher("/users/{handle}/outbox", async (ctx, handle) => {
    try {
      const activities = await ctx.data.DB.prepare(`
        SELECT * FROM activitypub_activities
        WHERE user_email = ?
        ORDER BY published_at DESC
        LIMIT 20
      `).bind(handle).all();

      const items = activities.results.map(activity => {
        const note = new Note({
          id: new URL(activity.activity_id),
          content: activity.content || '',
          published: new Date(activity.published_at),
          attributedTo: ctx.getActorUri(handle),
        });

        return new Create({
          id: new URL(`${activity.activity_id}/activity`),
          actor: ctx.getActorUri(handle),
          object: note,
          published: new Date(activity.published_at),
        });
      });

      return { items };
    } catch (error) {
      console.error('Error fetching outbox:', error);
      return { items: [] };
    }
  });

  return federation;
}

// Helper function to extract handle from actor URI
function extractHandleFromUri(uri: string): string | null {
  try {
    const url = new URL(uri);
    const pathParts = url.pathname.split('/');
    const usersIndex = pathParts.indexOf('users');

    if (usersIndex !== -1 && pathParts[usersIndex + 1]) {
      return pathParts[usersIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

// Helper function to cache actor information
async function cacheActor(db: D1Database, actor: Person) {
  try {
    const publicKey = await actor.getPublicKey();

    await db.prepare(`
      INSERT OR REPLACE INTO activitypub_actors
      (actor_uri, actor_handle, name, summary, inbox_url, outbox_url,
       followers_url, following_url, icon_url, public_key, last_fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      actor.id?.href || '',
      actor.preferredUsername || '',
      actor.name || '',
      actor.summary || '',
      actor.inboxId?.href || '',
      actor.outboxId?.href || '',
      actor.followersId?.href || '',
      actor.followingId?.href || '',
      actor.iconId?.href || '',
      publicKey ? JSON.stringify(publicKey) : null
    ).run();
  } catch (error) {
    console.error('Error caching actor:', error);
  }
}
