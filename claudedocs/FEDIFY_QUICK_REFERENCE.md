# Fedify Quick Reference Card

## 📚 Documents Overview

| Document | Use When |
|----------|----------|
| **FEDIFY_SUMMARY.md** | Getting started, understanding scope |
| **FEDIFY_IMPLEMENTATION_STEPS.md** | Actually implementing (PRIMARY) |
| **FEDIFY_REFACTOR_PLAN.md** | Need detailed code/context |
| **FEDIFY_ARCHITECTURE.md** | Understanding data flow/debugging |

---

## ⚡ Quick Start (15 Minutes)

```bash
# 1. Create migration file
# Copy from FEDIFY_IMPLEMENTATION_STEPS.md Phase 1.1

# 2. Run migration
wrangler d1 execute mitobyte-users --local --file=./migrations/0024_fedify_schema_enhancements.sql

# 3. Create uris.ts
# Copy from FEDIFY_REFACTOR_PLAN.md Section 1.2

# 4. Create keys.ts
# Copy from FEDIFY_REFACTOR_PLAN.md Section 2.1

# 5. Test
npm run pages:dev
curl "http://localhost:8788/.well-known/webfinger?resource=acct:test@localhost:8788"
```

---

## 🔑 Key Concepts

### Actor = User
In ActivityPub, users are called "actors" and represented as `Person` objects.

### URI = Unique Identifier
Everything needs a unique URI:
- Actor: `https://domain.com/users/{email}`
- Post: `https://domain.com/posts/{id}`
- Activity: `https://domain.com/activities/{type}/{id}/{timestamp}`

### Activity = Action
Actions are wrapped in activity objects:
- Post → `Create` activity with `Note` object
- Like → `Like` activity
- Boost → `Announce` activity

### HTTP Signatures = Authentication
All federated requests are signed with RSA keys to prove authenticity.

---

## 📝 Essential Code Patterns

### Generate URI
```typescript
import { FedifyUriGenerator, getDomainFromRequest } from '../../federation/uris';

const domain = getDomainFromRequest(request);
const uriGen = new FedifyUriGenerator(domain);

const actorUri = uriGen.getActorUri(userEmail);
const postUri = uriGen.getPostUri(postId);
```

### Get Actor Keys
```typescript
import { getOrCreateActorKeys } from '../../federation/keys';

const keys = await getOrCreateActorKeys(env, userEmail, domain);
// Returns: { publicKey, privateKey, keyId }
```

### Send Activity
```typescript
import { createFederationInstance } from '../../federation/config';
import { Like } from '@fedify/fedify';

const federation = createFederationInstance(env);

const likeActivity = new Like({
  id: new URL(`${actorUri}/likes/${postId}/${Date.now()}`),
  actor: new URL(actorUri),
  object: new URL(postUri)
});

await federation.sendActivity(
  { handle: userEmail },
  new URL(recipientInbox),
  likeActivity
);
```

### Handle Incoming Activity
```typescript
federation
  .setInboxListeners("/users/{handle}/inbox", "/inbox")
  .on(Like, async (ctx, like) => {
    const actorUri = like.actorId?.href;
    const objectUri = like.objectId?.href;

    // Store in database
    await ctx.data.DB.prepare(`
      INSERT INTO activitypub_likes (activity_id, actor_uri)
      VALUES (?, ?)
    `).bind(objectUri, actorUri).run();
  });
```

---

## 🔍 Testing Commands

### Local Development
```bash
# Start server
npm run pages:dev

# Test WebFinger (should return actor info)
curl "http://localhost:8788/.well-known/webfinger?resource=acct:user@localhost:8788"

# Test Actor (should return Person object)
curl -H "Accept: application/activity+json" \
  "http://localhost:8788/users/user@example.com"

# Test NodeInfo (should return server info)
curl "http://localhost:8788/.well-known/nodeinfo"

# Test Post Object (should return Note)
curl -H "Accept: application/activity+json" \
  "http://localhost:8788/posts/1"
```

### Production Testing
```bash
# Deploy
npm run build
npm run pages:deploy

# Test with real domain
curl "https://yourdomain.com/.well-known/webfinger?resource=acct:user@yourdomain.com"

# Test from Mastodon
# 1. Open Mastodon
# 2. Search: @user@yourdomain.com
# 3. Click Follow
# 4. Create post on your platform
# 5. Verify in Mastodon timeline
```

---

## 🐛 Troubleshooting

### WebFinger Returns 404
**Check**: `functions/federation/[[path]].ts` handles `/.well-known/webfinger`
**Fix**: Verify path is in `federationPaths` array

### Actor Not Found
**Check**: Database has user with that email
**Query**: `SELECT * FROM users WHERE email = 'user@example.com'`
**Fix**: Create user or check email format

### Posts Don't Federate
**Check**: User has followers
**Query**: `SELECT * FROM activitypub_followers WHERE user_email = 'user@example.com'`
**Check**: Queue is processing
**Dashboard**: Cloudflare > Queues > Check depth

### Signature Verification Fails
**Check**: Actor has keys
**Query**: `SELECT * FROM activitypub_actor_keys WHERE user_email = 'user@example.com'`
**Fix**: Delete row, keys will regenerate on next activity

### Queue Not Processing
**Check**: Queue consumer configured
**Dashboard**: Pages > Settings > Functions > Bindings
**Fix**: Add Queue Consumer binding

---

## 📊 Database Queries

### Check Followers
```sql
SELECT follower_uri, follower_handle, status
FROM activitypub_followers
WHERE user_email = 'user@example.com';
```

### Check Activities
```sql
SELECT activity_id, activity_type, published_at
FROM activitypub_activities
WHERE user_email = 'user@example.com'
ORDER BY published_at DESC
LIMIT 10;
```

### Check Post Federation
```sql
SELECT p.id, p.content, p.activitypub_uri, p.federated
FROM posts p
WHERE p.user_email = 'user@example.com'
ORDER BY p.created_at DESC;
```

### Check Remote Posts
```sql
SELECT actor_uri, content, published_at
FROM activitypub_remote_posts
ORDER BY published_at DESC
LIMIT 10;
```

### Check Likes
```sql
SELECT COUNT(*) as like_count
FROM activitypub_likes
WHERE activity_id = 'https://yourdomain.com/posts/1';
```

---

## 🎯 Implementation Checklist

### Phase 1: Foundation
- [ ] Create `0024_fedify_schema_enhancements.sql`
- [ ] Run migration locally and production
- [ ] Create `functions/federation/uris.ts`
- [ ] Create `functions/federation/keys.ts`
- [ ] Test utility functions

### Phase 2: Actor Enhancement
- [ ] Update `functions/federation/config.ts` imports
- [ ] Replace actor dispatcher
- [ ] Add key pairs dispatcher
- [ ] Add WebFinger mapping
- [ ] Test actor endpoint

### Phase 3: Post Object Dispatcher
- [ ] Add Note object dispatcher to config
- [ ] Add NodeInfo dispatcher to config
- [ ] Test post object endpoint

### Phase 4: Post Creation
- [ ] Update `functions/api/posts/create.ts`
- [ ] Add URI generation
- [ ] Add post mapping creation
- [ ] Add federation call
- [ ] Test post creation

### Phase 5: Interactions
- [ ] Update `functions/api/posts/like.ts`
- [ ] Update `functions/api/posts/boost.ts`
- [ ] Test local interactions
- [ ] Test federation

### Phase 6: Queue
- [ ] Create `functions/queue-consumer.ts`
- [ ] Configure queue in Dashboard
- [ ] Monitor queue processing

### Phase 7: Testing
- [ ] Test all endpoints locally
- [ ] Deploy to production
- [ ] Test with Mastodon
- [ ] Verify all interactions work

---

## 📞 Support

### When Stuck
1. Check error in Cloudflare Pages Functions logs
2. Check queue depth and DLQ
3. Run SQL queries to verify data
4. Test endpoints with curl
5. Review architecture diagram for data flow

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "User not found" | Database query failed | Check email format |
| "Signature verification failed" | Missing/wrong keys | Regenerate keys |
| "Actor not found" | WebFinger issue | Check domain/DNS |
| "Queue full" | Not processing | Configure consumer |
| "Activity rejected" | Invalid format | Check Activity structure |

---

## 🔗 Important URLs

### Development
- Local server: `http://localhost:8788`
- WebFinger: `http://localhost:8788/.well-known/webfinger?resource=acct:user@localhost:8788`
- Actor: `http://localhost:8788/users/{email}`

### Production
- Your site: `https://yourdomain.com`
- WebFinger: `https://yourdomain.com/.well-known/webfinger?resource=acct:user@yourdomain.com`
- Actor: `https://yourdomain.com/users/{email}`

### Cloudflare Dashboard
- Pages: `https://dash.cloudflare.com/pages`
- D1: `https://dash.cloudflare.com/d1`
- Queues: `https://dash.cloudflare.com/queues`
- KV: `https://dash.cloudflare.com/kv`

### Documentation
- Fedify: `https://fedify.dev/`
- ActivityPub: `https://www.w3.org/TR/activitypub/`
- Cloudflare Workers: `https://developers.cloudflare.com/workers/`

---

## 💡 Pro Tips

1. **Test Locally First**: Always test with curl before deploying
2. **Monitor Queue**: Check queue depth regularly
3. **Check DLQ**: Dead letter queue shows permanent failures
4. **Cache Actors**: Remote actors are cached automatically
5. **Batch Operations**: Queue processes in batches for efficiency
6. **Error Handling**: Federation failures don't break local features
7. **Gradual Rollout**: Deploy one phase at a time
8. **Backup Database**: Before running migrations

---

## 🚀 Quick Deploy

```bash
# One-command deploy after implementation
npm run build && npm run pages:deploy

# Verify deployment
curl "https://yourdomain.com/.well-known/webfinger?resource=acct:user@yourdomain.com"
```

---

## 📈 Success Indicators

✅ WebFinger returns JSON with actor URI
✅ Actor endpoint returns Person object
✅ Can search user from Mastodon
✅ Can follow user from Mastodon
✅ Posts appear in Mastodon timeline
✅ Likes from Mastodon appear in database
✅ Boosts from Mastodon appear in database
✅ Queue depth stays < 100
✅ No errors in Pages Functions logs
✅ DLQ empty or < 5 messages

---

**Time to Full Federation**: ~4.5 hours
**Difficulty**: Moderate (with provided code)
**Risk**: Low (non-destructive changes)
**Impact**: High (join the Fediverse!)

**Start here**: `FEDIFY_IMPLEMENTATION_STEPS.md` Phase 1
