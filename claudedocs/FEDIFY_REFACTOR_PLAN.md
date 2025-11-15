# Fedify ActivityPub Integration - Comprehensive Refactor Plan

## Executive Summary

This plan outlines how to refactor your existing Cloudflare Pages social media platform to use Fedify for full ActivityPub federation. Your platform already has:
- Basic Fedify setup with KV and Queue bindings
- ActivityPub tables in the database
- Social features (posts, likes, boosts, follows, replies)
- Some federation utility functions

**Goal**: Make your platform fully federate with Mastodon and other Fediverse servers so posts, likes, boosts, and follows work bidirectionally.

---

## Current State Assessment

### What You Already Have ✓

1. **Infrastructure**:
   - Fedify packages installed (`@fedify/fedify`, `@fedify/cfworkers`)
   - KV namespace (`FEDERATION_KV`) configured
   - Queue (`FEDERATION_QUEUE`) configured
   - D1 database with ActivityPub tables

2. **Database Schema**:
   - Social tables: `posts`, `post_likes`, `post_boosts`, `post_tags`, `user_follows`
   - ActivityPub tables: `activitypub_followers`, `activitypub_following`, `activitypub_activities`, `activitypub_inbox`, `activitypub_likes`, `activitypub_shares`, `activitypub_actors`

3. **Partial Federation Implementation**:
   - Federation config in `functions/federation/config.ts`
   - Actor dispatcher (maps users to ActivityPub actors)
   - Inbox listeners (Follow, Undo, Like, Announce)
   - Outbox dispatcher
   - Federation utilities (`publishActivity`, `followRemoteActor`)

4. **Social Features**:
   - Post creation (`functions/api/posts/create.ts`)
   - Post feed (`functions/api/posts/feed.ts`)
   - Likes (`functions/api/posts/like.ts`)
   - Boosts (`functions/api/posts/boost.ts`)
   - User follows (`user_follows` table)

### What's Missing ✗

1. **WebFinger Integration**: No dispatcher configured for actor discovery
2. **Post Federation**: Posts don't create ActivityPub objects
3. **Bidirectional Interactions**: Local likes/boosts don't federate out
4. **Remote Post Ingestion**: Can't display posts from remote actors
5. **Actor Keys**: No public/private key management for HTTP signatures
6. **Proper URI Structure**: Posts need ActivityPub-compatible URIs
7. **Queue Processing**: No queue worker implementation
8. **NodeInfo**: No server information endpoint

---

## Implementation Plan

### Phase 1: Core Infrastructure (Database & URIs)

#### 1.1 Database Schema Updates

**Create Migration: `0024_fedify_schema_enhancements.sql`**

```sql
-- Add ActivityPub URIs and federation metadata to posts
ALTER TABLE posts ADD COLUMN activitypub_uri TEXT UNIQUE;
ALTER TABLE posts ADD COLUMN activitypub_id TEXT UNIQUE;
ALTER TABLE posts ADD COLUMN federated BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN remote_actor_uri TEXT;
ALTER TABLE posts ADD COLUMN conversation_uri TEXT;

-- Add indexes for federation
CREATE INDEX IF NOT EXISTS idx_posts_activitypub_uri ON posts(activitypub_uri);
CREATE INDEX IF NOT EXISTS idx_posts_activitypub_id ON posts(activitypub_id);
CREATE INDEX IF NOT EXISTS idx_posts_federated ON posts(federated);

-- Add actor keys for HTTP signatures
CREATE TABLE IF NOT EXISTS activitypub_actor_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  key_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Map local posts to federated activities
CREATE TABLE IF NOT EXISTS activitypub_post_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL UNIQUE,
  activity_id TEXT NOT NULL UNIQUE,
  object_uri TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Store remote posts from federation
CREATE TABLE IF NOT EXISTS activitypub_remote_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_uri TEXT NOT NULL UNIQUE,
  object_uri TEXT NOT NULL UNIQUE,
  actor_uri TEXT NOT NULL,
  content TEXT,
  published_at TEXT NOT NULL,
  raw_object TEXT NOT NULL,
  local_post_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (local_post_id) REFERENCES posts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_remote_posts_actor ON activitypub_remote_posts(actor_uri);
CREATE INDEX IF NOT EXISTS idx_activitypub_remote_posts_published ON activitypub_remote_posts(published_at DESC);
```

#### 1.2 URI Generation Utilities

**Create: `functions/federation/uris.ts`**

```typescript
import type { Context } from "@fedify/fedify";

export interface UriConfig {
  domain: string;
  userEmail: string;
  postId?: number;
  activityType?: string;
}

/**
 * Generate ActivityPub-compatible URIs for resources
 */
export class FedifyUriGenerator {
  private domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  /**
   * Get actor URI for a user
   * Format: https://domain.com/users/{email}
   */
  getActorUri(userEmail: string): string {
    return `https://${this.domain}/users/${encodeURIComponent(userEmail)}`;
  }

  /**
   * Get post object URI
   * Format: https://domain.com/posts/{id}
   */
  getPostUri(postId: number): string {
    return `https://${this.domain}/posts/${postId}`;
  }

  /**
   * Get activity URI for a post
   * Format: https://domain.com/activities/{type}/{id}/{timestamp}
   */
  getActivityUri(type: string, postId: number): string {
    const timestamp = Date.now();
    return `https://${this.domain}/activities/${type}/${postId}/${timestamp}`;
  }

  /**
   * Get inbox URI for a user
   */
  getInboxUri(userEmail: string): string {
    return `https://${this.domain}/users/${encodeURIComponent(userEmail)}/inbox`;
  }

  /**
   * Get outbox URI for a user
   */
  getOutboxUri(userEmail: string): string {
    return `https://${this.domain}/users/${encodeURIComponent(userEmail)}/outbox`;
  }

  /**
   * Get followers collection URI
   */
  getFollowersUri(userEmail: string): string {
    return `https://${this.domain}/users/${encodeURIComponent(userEmail)}/followers`;
  }

  /**
   * Get following collection URI
   */
  getFollowingUri(userEmail: string): string {
    return `https://${this.domain}/users/${encodeURIComponent(userEmail)}/following`;
  }

  /**
   * Get conversation URI for a post thread
   */
  getConversationUri(postId: number): string {
    return `https://${this.domain}/conversations/${postId}`;
  }

  /**
   * Extract user email from actor URI
   */
  extractUserEmail(actorUri: string): string | null {
    try {
      const url = new URL(actorUri);
      const pathParts = url.pathname.split('/');
      const usersIndex = pathParts.indexOf('users');

      if (usersIndex !== -1 && pathParts[usersIndex + 1]) {
        return decodeURIComponent(pathParts[usersIndex + 1]);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract post ID from post URI
   */
  extractPostId(postUri: string): number | null {
    try {
      const url = new URL(postUri);
      const pathParts = url.pathname.split('/');
      const postsIndex = pathParts.indexOf('posts');

      if (postsIndex !== -1 && pathParts[postsIndex + 1]) {
        return parseInt(pathParts[postsIndex + 1], 10);
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Get domain from request URL
 */
export function getDomainFromRequest(request: Request): string {
  const url = new URL(request.url);
  return url.hostname;
}
```

---

### Phase 2: Actor Management & Keys

#### 2.1 Key Generation Service

**Create: `functions/federation/keys.ts`**

```typescript
import type { FederationEnv } from './config';
import { exportJwk, generateCryptoKeyPair, importJwk } from '@fedify/fedify';

export interface ActorKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  keyId: string;
}

/**
 * Generate or retrieve actor keys for HTTP signatures
 */
export async function getOrCreateActorKeys(
  env: FederationEnv,
  userEmail: string,
  domain: string
): Promise<ActorKeyPair> {
  // Check if keys exist
  const existing = await env.DB.prepare(`
    SELECT public_key, private_key, key_id
    FROM activitypub_actor_keys
    WHERE user_email = ?
  `).bind(userEmail).first();

  if (existing) {
    // Import existing keys
    const publicKey = await importJwk(
      JSON.parse(existing.public_key),
      'public'
    );
    const privateKey = await importJwk(
      JSON.parse(existing.private_key),
      'private'
    );

    return {
      publicKey,
      privateKey,
      keyId: existing.key_id
    };
  }

  // Generate new keys
  const { publicKey, privateKey } = await generateCryptoKeyPair('RSASSA-PKCS1-v1_5');

  // Export to JWK for storage
  const publicKeyJwk = await exportJwk(publicKey);
  const privateKeyJwk = await exportJwk(privateKey);

  const keyId = `https://${domain}/users/${encodeURIComponent(userEmail)}#main-key`;

  // Store in database
  await env.DB.prepare(`
    INSERT INTO activitypub_actor_keys
    (user_email, public_key, private_key, key_id)
    VALUES (?, ?, ?, ?)
  `).bind(
    userEmail,
    JSON.stringify(publicKeyJwk),
    JSON.stringify(privateKeyJwk),
    keyId
  ).run();

  return {
    publicKey,
    privateKey,
    keyId
  };
}

/**
 * Get public key for actor (for signature verification)
 */
export async function getActorPublicKey(
  env: FederationEnv,
  userEmail: string
): Promise<{ key: CryptoKey; keyId: string } | null> {
  const result = await env.DB.prepare(`
    SELECT public_key, key_id
    FROM activitypub_actor_keys
    WHERE user_email = ?
  `).bind(userEmail).first();

  if (!result) return null;

  const publicKey = await importJwk(
    JSON.parse(result.public_key),
    'public'
  );

  return {
    key: publicKey,
    keyId: result.key_id
  };
}
```

#### 2.2 Enhanced Actor Dispatcher

**Update: `functions/federation/config.ts`** (Actor Dispatcher section)

```typescript
// Replace existing actor dispatcher with:
federation.setActorDispatcher("/users/{handle}", async (ctx, handle) => {
  try {
    const user = await ctx.data.DB.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).bind(handle).first();

    if (!user) return null;

    // Get or create actor keys
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
      // Add endpoints
      endpoints: {
        sharedInbox: ctx.getInboxUri()
      }
    });
  } catch (error) {
    console.error('Error fetching actor:', error);
    return null;
  }
});

// Add actor key dispatcher for sending activities
federation.setActorKeyPairsDispatcher(async (ctx, handle) => {
  const domain = new URL(ctx.url).hostname;
  const keys = await getOrCreateActorKeys(ctx.data, handle, domain);

  return [{
    privateKey: keys.privateKey,
    keyId: new URL(keys.keyId)
  }];
});
```

---

### Phase 3: WebFinger Implementation

#### 3.1 WebFinger Dispatcher

**Update: `functions/federation/config.ts`** (add after actor dispatcher)

```typescript
// Enable WebFinger for actor discovery
federation
  .setActorDispatcher("/users/{handle}", /* ... existing ... */)
  .mapHandle(async (ctx, username) => {
    // WebFinger queries come in as just the username
    // We need to map it to the full email/handle

    // Try exact email match first
    const userByEmail = await ctx.data.DB.prepare(
      "SELECT email FROM users WHERE email = ?"
    ).bind(username).first();

    if (userByEmail) {
      return userByEmail.email;
    }

    // Try matching by username part (before @)
    const userByUsername = await ctx.data.DB.prepare(
      "SELECT email FROM users WHERE email LIKE ?"
    ).bind(`${username}@%`).first();

    if (userByUsername) {
      return userByUsername.email;
    }

    // Try display name match
    const userByDisplayName = await ctx.data.DB.prepare(
      "SELECT email FROM users WHERE display_name = ?"
    ).bind(username).first();

    if (userByDisplayName) {
      return userByDisplayName.email;
    }

    return null;
  });
```

---

### Phase 4: Post Federation

#### 4.1 Post Object Dispatcher

**Update: `functions/federation/config.ts`** (add object dispatcher)

```typescript
import { Note, Image, Document } from "@fedify/fedify";

// Add object dispatcher for posts
federation.setObjectDispatcher(
  Note,
  "/posts/{id}",
  async (ctx, values) => {
    const postId = parseInt(values.id);
    if (isNaN(postId)) return null;

    // Fetch post with user info
    const post = await ctx.data.DB.prepare(`
      SELECT p.*, u.email, u.display_name,
        COALESCE(ps.likes_count, 0) as likes_count,
        COALESCE(ps.boosts_count, 0) as boosts_count,
        COALESCE(ps.replies_count, 0) as replies_count
      FROM posts p
      JOIN users u ON p.user_email = u.email
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.id = ?
    `).bind(postId).first();

    if (!post) return null;

    // Get tags
    const tags = await ctx.data.DB.prepare(`
      SELECT tag FROM post_tags WHERE post_id = ?
    `).bind(postId).all();

    const domain = new URL(ctx.url).hostname;
    const uriGen = new FedifyUriGenerator(domain);

    // Build Note object
    const noteProps: any = {
      id: new URL(uriGen.getPostUri(postId)),
      content: post.content,
      published: new Date(post.created_at),
      attributedTo: ctx.getActorUri(post.user_email),
      to: new URL("https://www.w3.org/ns/activitystreams#Public"),
      cc: [ctx.getFollowersUri(post.user_email)],
    };

    // Add conversation/context for threading
    if (post.reply_to_id) {
      noteProps.inReplyTo = new URL(uriGen.getPostUri(post.reply_to_id));

      // Get conversation URI from parent or create new one
      const parent = await ctx.data.DB.prepare(
        "SELECT conversation_uri FROM posts WHERE id = ?"
      ).bind(post.reply_to_id).first();

      noteProps.context = parent?.conversation_uri
        ? new URL(parent.conversation_uri)
        : new URL(uriGen.getConversationUri(post.reply_to_id));
    } else {
      noteProps.context = new URL(uriGen.getConversationUri(postId));
    }

    // Add hashtags
    if (tags.results.length > 0) {
      noteProps.tag = tags.results.map(t => ({
        type: "Hashtag",
        name: `#${t.tag}`,
        href: new URL(`https://${domain}/tags/${t.tag}`)
      }));
    }

    // Add media attachments if present
    if (post.media_url && post.media_type) {
      noteProps.attachment = [{
        type: post.media_type.startsWith('image/') ? "Image" : "Document",
        mediaType: post.media_type,
        url: new URL(post.media_url)
      }];
    }

    return new Note(noteProps);
  }
);
```

#### 4.2 Enhanced Post Creation with Federation

**Update: `functions/api/posts/create.ts`**

```typescript
import { publishActivity } from '../../federation/utils';
import type { FederationEnv } from '../../federation/config';
import { FedifyUriGenerator, getDomainFromRequest } from '../../federation/uris';

export const onRequestPost: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;

  try {
    const { userEmail, content, tags, visibility = 'public', replyToId, mediaUrl, mediaType } = await request.json();

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

    // Generate ActivityPub URIs
    const domain = getDomainFromRequest(request);
    const uriGen = new FedifyUriGenerator(domain);

    // Determine conversation URI
    let conversationUri = null;
    if (replyToId) {
      const parent = await env.DB.prepare(
        'SELECT conversation_uri, id FROM posts WHERE id = ?'
      ).bind(replyToId).first();
      conversationUri = parent?.conversation_uri || uriGen.getConversationUri(parent?.id || replyToId);
    }

    // Create post
    const postResult = await env.DB.prepare(`
      INSERT INTO posts (
        user_email, content, visibility, reply_to_id,
        media_url, media_type, conversation_uri, federated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      userEmail, content, visibility, replyToId || null,
      mediaUrl || null, mediaType || null, conversationUri
    ).run();

    const postId = postResult.meta.last_row_id;

    // Generate post URIs after we have the ID
    const postUri = uriGen.getPostUri(postId);
    const activityId = uriGen.getActivityUri('create', postId);

    // Update post with ActivityPub URIs
    await env.DB.prepare(`
      UPDATE posts
      SET activitypub_uri = ?, activitypub_id = ?,
          conversation_uri = COALESCE(conversation_uri, ?)
      WHERE id = ?
    `).bind(postUri, activityId, uriGen.getConversationUri(postId), postId).run();

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

    // Map post to ActivityPub activity
    await env.DB.prepare(`
      INSERT INTO activitypub_post_mapping (post_id, activity_id, object_uri)
      VALUES (?, ?, ?)
    `).bind(postId, activityId, postUri).run();

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

    const postTags = await env.DB.prepare(`
      SELECT tag FROM post_tags WHERE post_id = ?
    `).bind(postId).all();

    const postWithTags = {
      ...post,
      tags: postTags.results.map(t => t.tag)
    };

    // Federate the post (async, don't wait)
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
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Publish post to followers via ActivityPub
 */
async function publishPostToFollowers(
  env: FederationEnv,
  postId: number,
  userEmail: string,
  domain: string
): Promise<void> {
  // This will be queued via Fedify's built-in queue mechanism
  const uriGen = new FedifyUriGenerator(domain);
  const activityId = uriGen.getActivityUri('create', postId);

  // Store in activities table
  await env.DB.prepare(`
    INSERT INTO activitypub_activities
    (user_email, activity_id, activity_type, object_type, object_id)
    VALUES (?, ?, 'Create', 'Note', ?)
  `).bind(userEmail, activityId, uriGen.getPostUri(postId)).run();

  // Fedify will handle the actual delivery via the outbox
}
```

---

### Phase 5: Bidirectional Interactions

#### 5.1 Federated Likes

**Update: `functions/api/posts/like.ts`**

```typescript
import type { FederationEnv } from '../../federation/config';
import { createFederationInstance } from '../../federation/config';
import { Like, Undo } from '@fedify/fedify';
import { FedifyUriGenerator, getDomainFromRequest } from '../../federation/uris';
import { getOrCreateActorKeys } from '../../federation/keys';

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

    const domain = getDomainFromRequest(request);
    const uriGen = new FedifyUriGenerator(domain);

    // Get post info
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

    // Check if already liked
    const existing = await env.DB.prepare(`
      SELECT id FROM post_likes WHERE post_id = ? AND user_email = ?
    `).bind(postId, userEmail).first();

    const federation = createFederationInstance(env);

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

      // Send Undo Like to federation
      if (post.federated && post.activitypub_uri) {
        try {
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

          // Send to post author
          await federation.sendActivity(
            { handle: userEmail },
            new URL(uriGen.getInboxUri(post.author_email)),
            undoActivity
          );
        } catch (error) {
          console.error('Failed to federate unlike:', error);
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

      // Send Like to federation
      if (post.federated && post.activitypub_uri) {
        try {
          const likeUri = `${uriGen.getActorUri(userEmail)}/likes/${postId}/${Date.now()}`;
          const likeActivity = new Like({
            id: new URL(likeUri),
            actor: new URL(uriGen.getActorUri(userEmail)),
            object: new URL(post.activitypub_uri)
          });

          // Send to post author's inbox
          await federation.sendActivity(
            { handle: userEmail },
            new URL(uriGen.getInboxUri(post.author_email)),
            likeActivity
          );
        } catch (error) {
          console.error('Failed to federate like:', error);
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
```

#### 5.2 Federated Boosts

**Update: `functions/api/posts/boost.ts`**

```typescript
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

    const domain = getDomainFromRequest(request);
    const uriGen = new FedifyUriGenerator(domain);

    // Get post info
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

    // Check if already boosted
    const existing = await env.DB.prepare(`
      SELECT id FROM post_boosts WHERE post_id = ? AND user_email = ?
    `).bind(postId, userEmail).first();

    const federation = createFederationInstance(env);

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

      // Send Undo Announce to federation
      if (post.federated && post.activitypub_uri) {
        try {
          const announceUri = `${uriGen.getActorUri(userEmail)}/announces/${postId}`;
          const undoActivity = new Undo({
            id: new URL(`${uriGen.getActorUri(userEmail)}/undo/announce/${postId}/${Date.now()}`),
            actor: new URL(uriGen.getActorUri(userEmail)),
            object: new Announce({
              id: new URL(announceUri),
              actor: new URL(uriGen.getActorUri(userEmail)),
              object: new URL(post.activitypub_uri)
            })
          });

          // Send to followers
          const followers = await env.DB.prepare(`
            SELECT follower_uri FROM activitypub_followers
            WHERE user_email = ? AND status = 'accepted'
          `).bind(userEmail).all();

          for (const follower of followers.results) {
            await federation.sendActivity(
              { handle: userEmail },
              new URL(follower.follower_uri),
              undoActivity
            );
          }
        } catch (error) {
          console.error('Failed to federate unboost:', error);
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

      // Send Announce to federation
      if (post.federated && post.activitypub_uri) {
        try {
          const announceUri = `${uriGen.getActorUri(userEmail)}/announces/${postId}/${Date.now()}`;
          const announceActivity = new Announce({
            id: new URL(announceUri),
            actor: new URL(uriGen.getActorUri(userEmail)),
            object: new URL(post.activitypub_uri),
            to: new URL("https://www.w3.org/ns/activitystreams#Public"),
            cc: [new URL(uriGen.getFollowersUri(userEmail))]
          });

          // Send to user's followers
          const followers = await env.DB.prepare(`
            SELECT follower_uri FROM activitypub_followers
            WHERE user_email = ? AND status = 'accepted'
          `).bind(userEmail).all();

          for (const follower of followers.results) {
            await federation.sendActivity(
              { handle: userEmail },
              new URL(follower.follower_uri),
              announceActivity
            );
          }
        } catch (error) {
          console.error('Failed to federate boost:', error);
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
```

---

### Phase 6: Inbox Processing for Remote Posts

#### 6.1 Enhanced Inbox Listeners

**Update: `functions/federation/config.ts`** (inbox listeners)

```typescript
// Add to existing inbox listeners
federation
  .setInboxListeners("/users/{handle}/inbox", "/inbox")
  .on(Create, async (ctx, create) => {
    try {
      const object = await create.getObject();

      if (object instanceof Note) {
        // This is a post from a remote actor
        await handleRemotePost(ctx.data, create, object);
      }
    } catch (error) {
      console.error('Error handling Create activity:', error);
    }
  })
  // ... existing Follow, Undo, Like, Announce handlers ...

/**
 * Handle incoming posts from remote actors
 */
async function handleRemotePost(
  env: FederationEnv,
  create: Create,
  note: Note
): Promise<void> {
  const actorUri = create.actorId?.href;
  const objectUri = note.id?.href;

  if (!actorUri || !objectUri) return;

  // Check if we already have this post
  const existing = await env.DB.prepare(`
    SELECT id FROM activitypub_remote_posts WHERE object_uri = ?
  `).bind(objectUri).first();

  if (existing) {
    console.log('Remote post already exists:', objectUri);
    return;
  }

  // Fetch actor details
  const actor = await create.getActor();

  // Store remote post
  await env.DB.prepare(`
    INSERT INTO activitypub_remote_posts
    (activity_uri, object_uri, actor_uri, content, published_at, raw_object)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    create.id?.href || '',
    objectUri,
    actorUri,
    note.content || '',
    note.published?.toISOString() || new Date().toISOString(),
    JSON.stringify(note)
  ).run();

  // Optionally create a local representation
  // This allows remote posts to show in local feeds
  // (You can skip this if you want to keep local/remote separate)

  console.log(`Stored remote post from ${actor?.preferredUsername}: ${objectUri}`);
}
```

---

### Phase 7: Queue Processing

#### 7.1 Queue Worker Implementation

**Create: `functions/queue-consumer.ts`**

```typescript
import type { Message } from '@fedify/fedify';
import { createFederationInstance, type FederationEnv } from './federation/config';

/**
 * Queue consumer for processing federated activities
 * This needs to be configured via Cloudflare Dashboard for Pages projects
 */
export const queue = async (
  batch: MessageBatch<Message>,
  env: FederationEnv
): Promise<void> => {
  const federation = createFederationInstance(env);

  for (const message of batch.messages) {
    try {
      // Process the queued message
      await federation.processQueuedTask(
        message.body as Message,
        env
      );

      // Acknowledge successful processing
      message.ack();
    } catch (error) {
      console.error('Error processing queue message:', error);

      // Retry the message
      message.retry();
    }
  }
};
```

**Note**: Cloudflare Pages requires queue consumers to be configured via the Dashboard:
1. Go to Dashboard > Pages > Your Project > Settings > Functions > Bindings
2. Add Queue Consumer binding for `mitobyte-federation-queue`

---

### Phase 8: NodeInfo Implementation

#### 8.1 NodeInfo Dispatcher

**Update: `functions/federation/config.ts`** (add NodeInfo)

```typescript
// Add NodeInfo dispatcher for server discovery
federation.setNodeInfoDispatcher("/nodeinfo/2.1", async (ctx) => {
  // Get user and post counts
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
    services: {
      inbound: [],
      outbound: []
    },
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
      nodeDescription: "A federated social platform for hackathon voting and community engagement"
    }
  };
});
```

---

## Testing Strategy

### Local Testing

1. **Start Development Server**:
   ```bash
   npm run pages:dev
   ```

2. **Test WebFinger**:
   ```bash
   curl "http://localhost:8788/.well-known/webfinger?resource=acct:user@localhost:8788"
   ```

3. **Test Actor Endpoint**:
   ```bash
   curl -H "Accept: application/activity+json" "http://localhost:8788/users/user@example.com"
   ```

### Federation Testing with Mastodon

1. **Deploy to Cloudflare Pages** (requires public domain):
   ```bash
   npm run pages:deploy
   ```

2. **Search for User on Mastodon**:
   - Open Mastodon
   - Search: `@user@yourdomain.com`
   - Click Follow

3. **Verify Follow Appears**:
   ```sql
   SELECT * FROM activitypub_followers WHERE user_email = 'user@example.com';
   ```

4. **Create Post and Verify Federation**:
   - Create post on your platform
   - Check Mastodon follower's timeline
   - Post should appear

5. **Test Bidirectional**:
   - Like/boost post from Mastodon
   - Verify it appears in your database

---

## Deployment Checklist

### Prerequisites
- [ ] Cloudflare account with Pages enabled
- [ ] Custom domain configured
- [ ] KV namespace created
- [ ] Queue created
- [ ] D1 database provisioned

### Database Migrations
- [ ] Run migration `0024_fedify_schema_enhancements.sql`
- [ ] Verify tables created: `activitypub_actor_keys`, `activitypub_post_mapping`, `activitypub_remote_posts`
- [ ] Backfill existing posts with URIs (if needed)

### Configuration
- [ ] Update `wrangler.toml` with correct bindings
- [ ] Set domain in environment variables
- [ ] Configure queue consumers in Dashboard

### Code Deployment
- [ ] Deploy federation utilities (`uris.ts`, `keys.ts`)
- [ ] Deploy updated `config.ts` with all dispatchers
- [ ] Deploy updated API endpoints (`create.ts`, `like.ts`, `boost.ts`)
- [ ] Deploy queue consumer
- [ ] Test all endpoints return 200/201

### Verification
- [ ] WebFinger responds correctly
- [ ] Actor profiles load in Mastodon
- [ ] Can follow users from Mastodon
- [ ] Posts appear in Mastodon timeline
- [ ] Likes/boosts federate bidirectionally
- [ ] Replies thread correctly

---

## Troubleshooting Guide

### Issue: WebFinger Not Working
**Symptoms**: Can't find users on Mastodon
**Solutions**:
- Verify domain is publicly accessible via HTTPS
- Check `/.well-known/webfinger` returns correct JSON
- Ensure email/handle mapping is correct
- Check Cloudflare DNS settings

### Issue: Posts Not Federating
**Symptoms**: Posts don't appear on Mastodon
**Solutions**:
- Verify ActivityPub URIs are generated correctly
- Check actor has followers
- Verify HTTP signatures are working
- Check queue is processing (Dashboard > Queues)
- Review queue dead letter queue for errors

### Issue: Signature Verification Failures
**Symptoms**: Activities rejected by remote servers
**Solutions**:
- Verify actor keys are generated correctly
- Check key dispatcher returns correct private key
- Ensure `publicKey` is in actor JSON
- Verify key ID matches actor URI format

### Issue: Queue Not Processing
**Symptoms**: Activities stuck in queue
**Solutions**:
- Verify queue consumer is configured in Dashboard
- Check queue bindings in `wrangler.toml`
- Review queue consumer logs
- Test queue manually via Dashboard

---

## Performance Optimization

### Caching Strategy
1. **Actor Caching**: Cache remote actors in `activitypub_actors` for 24 hours
2. **KV Caching**: Fedify automatically caches HTTP signatures in KV
3. **Post Caching**: Cache rendered ActivityPub Note objects

### Database Optimization
1. **Indexes**: All critical queries have indexes
2. **Stats Tables**: Use `post_stats` to avoid COUNT queries
3. **Batch Operations**: Process multiple followers in batches

### Queue Optimization
1. **Batch Size**: Set `max_batch_size` to 10 in queue config
2. **Retry Policy**: Use exponential backoff for retries
3. **Dead Letter Queue**: Monitor DLQ for permanent failures

---

## Security Considerations

### HTTP Signatures
- All outgoing activities must be signed with actor's private key
- All incoming activities must verify signatures
- Reject activities with invalid or missing signatures

### Content Validation
- Sanitize all user-generated content
- Validate ActivityPub objects against schema
- Prevent XSS in Note content

### Rate Limiting
- Implement rate limits on inbox endpoints
- Limit followers per user
- Throttle outgoing activity delivery

### Privacy
- Respect post visibility settings
- Don't federate private/unlisted posts
- Allow users to block remote actors

---

## Migration from Current State

### Step 1: Deploy Infrastructure
1. Run new database migration
2. Deploy new utility files
3. Don't modify existing endpoints yet

### Step 2: Generate Keys
Run script to generate keys for existing users:
```typescript
// scripts/generate-actor-keys.ts
for (const user of existingUsers) {
  await getOrCreateActorKeys(env, user.email, domain);
}
```

### Step 3: Backfill Post URIs
```typescript
// scripts/backfill-post-uris.ts
for (const post of existingPosts) {
  const postUri = uriGen.getPostUri(post.id);
  const activityId = uriGen.getActivityUri('create', post.id);
  await updatePostUris(post.id, postUri, activityId);
}
```

### Step 4: Deploy Updated Endpoints
- Deploy updated `create.ts`
- Deploy updated `like.ts`
- Deploy updated `boost.ts`

### Step 5: Test & Verify
- Test new post creation
- Verify federation works
- Monitor error logs

---

## Next Steps After Implementation

1. **Enhanced Features**:
   - Media attachments (images, videos)
   - Polls
   - Content warnings
   - Custom emojis

2. **Moderation Tools**:
   - Block/mute remote actors
   - Instance-level blocks
   - Report handling

3. **Discovery**:
   - Trending posts
   - Hashtag following
   - Suggested users

4. **Analytics**:
   - Federation statistics
   - Delivery success rates
   - Popular posts/users

---

## Resources

- **Fedify Documentation**: https://fedify.dev/
- **ActivityPub Spec**: https://www.w3.org/TR/activitypub/
- **Mastodon API**: https://docs.joinmastodon.org/
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Fediverse Best Practices**: https://www.w3.org/wiki/Activity_Pub

---

## Support

For issues specific to this implementation:
1. Check Cloudflare Pages Functions logs
2. Review queue processing in Dashboard
3. Test endpoints with `curl` or Postman
4. Join Fedify community for framework questions

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Maintained By**: Mitobyte Development Team
