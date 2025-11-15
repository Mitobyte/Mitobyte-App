# Fedify Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Social Platform                          │
│                     (Cloudflare Pages + Functions)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────▼────────┐            ┌────────▼────────┐
            │  React Frontend │            │ API Functions   │
            │  (Vite + React) │            │  (TypeScript)   │
            └───────┬────────┘            └────────┬────────┘
                    │                               │
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │   Fedify Integration Layer     │
                    │   (ActivityPub Protocol)       │
                    ├────────────────────────────────┤
                    │  • Actor Dispatcher            │
                    │  • Object Dispatcher (Posts)   │
                    │  • Inbox Listeners             │
                    │  • Outbox Dispatcher           │
                    │  • WebFinger                   │
                    │  • HTTP Signatures             │
                    └────────┬───────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼─────────┐  ┌──────▼──────┐  ┌─────────▼────────┐
│  D1 Database    │  │  KV Store   │  │  Queue           │
│  (SQLite)       │  │  (Caching)  │  │  (Activities)    │
├─────────────────┤  ├─────────────┤  ├──────────────────┤
│ • posts         │  │ • Actors    │  │ • Outgoing       │
│ • users         │  │ • Keys      │  │ • Incoming       │
│ • follows       │  │ • Signatures│  │ • Retries        │
│ • activities    │  └─────────────┘  └──────────────────┘
└─────────────────┘
        │
        │ Federation
        │
┌───────▼──────────────────────────────────────────────────┐
│                    Fediverse                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Mastodon │  │ Pleroma  │  │ Misskey  │  ...          │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Post Creation & Federation

```
User Creates Post
      │
      ▼
┌─────────────────┐
│  React Frontend │
│  PostComposer   │
└────────┬────────┘
         │ POST /api/posts/create
         │ { userEmail, content, tags }
         ▼
┌────────────────────────────┐
│  API: posts/create.ts      │
│                            │
│  1. Validate user          │
│  2. Generate URIs          │
│     • postUri              │
│     • activityId           │
│     • conversationUri      │
│  3. Insert into posts      │
│  4. Create post_mapping    │
│  5. Initialize stats       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Federation: utils.ts      │
│  publishPostToFollowers()  │
│                            │
│  1. Get followers from DB  │
│  2. Create Note object     │
│  3. Create Create activity │
│  4. Queue for delivery     │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Fedify: Queue System      │
│                            │
│  1. Process queue batch    │
│  2. Sign with HTTP sig     │
│  3. POST to follower inbox │
│  4. Retry on failure       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Remote Server Inbox       │
│  (Mastodon, Pleroma, etc)  │
│                            │
│  Post appears in timeline  │
└────────────────────────────┘
```

### 2. Incoming Follow from Mastodon

```
Mastodon User Searches
@user@yourdomain.com
         │
         ▼
┌──────────────────────────┐
│  WebFinger Discovery     │
│  GET /.well-known/       │
│      webfinger           │
└──────────┬───────────────┘
           │
           ▼ Returns actor URI
┌──────────────────────────┐
│  Actor Profile Request   │
│  GET /users/{email}      │
│  Accept: application/    │
│          activity+json   │
└──────────┬───────────────┘
           │
           ▼ Returns Person object
┌──────────────────────────┐
│  Mastodon Displays       │
│  Profile & Follow Button │
└──────────┬───────────────┘
           │ User clicks Follow
           ▼
┌──────────────────────────┐
│  Follow Activity         │
│  POST /users/{email}/    │
│       inbox              │
│                          │
│  {                       │
│    type: "Follow",       │
│    actor: mastodon_user, │
│    object: your_user     │
│  }                       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Inbox Listener          │
│  federation/config.ts    │
│                          │
│  .on(Follow, ...)        │
│                          │
│  1. Extract follower URI │
│  2. Fetch actor details  │
│  3. Store in DB          │
│  4. Cache actor info     │
│  5. Send Accept activity │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Database Update         │
│                          │
│  INSERT INTO             │
│  activitypub_followers   │
│  (user_email,            │
│   follower_uri,          │
│   status: 'accepted')    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Accept Activity Sent    │
│  to Mastodon             │
│                          │
│  Follow confirmed        │
└──────────────────────────┘
```

### 3. Like from Local User to Federated Post

```
User Clicks Like Button
         │
         ▼
┌────────────────────────────┐
│  API: posts/like.ts        │
│                            │
│  1. Check if already liked │
│  2. Toggle like in DB      │
│  3. Update stats           │
└────────┬───────────────────┘
         │
         ▼ If post is federated
┌────────────────────────────┐
│  Create Like Activity      │
│                            │
│  {                         │
│    type: "Like",           │
│    actor: local_user,      │
│    object: post_uri        │
│  }                         │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Get Actor Keys            │
│  federation/keys.ts        │
│                            │
│  Retrieve private key      │
│  for HTTP signature        │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Send via Federation       │
│  federation.sendActivity() │
│                            │
│  1. Sign with HTTP sig     │
│  2. POST to author inbox   │
│  3. Queue if fails         │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Remote Server Inbox       │
│  (Post Author's Instance)  │
│                            │
│  Like appears on post      │
└────────────────────────────┘
```

### 4. Incoming Like from Mastodon

```
Mastodon User Likes Post
         │
         ▼
┌────────────────────────────┐
│  Mastodon Sends Activity   │
│  POST /users/{email}/inbox │
│                            │
│  {                         │
│    type: "Like",           │
│    actor: mastodon_user,   │
│    object: post_uri        │
│  }                         │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Verify HTTP Signature     │
│  federation/config.ts      │
│                            │
│  1. Extract signature      │
│  2. Fetch actor public key │
│  3. Verify signature       │
└────────┬───────────────────┘
         │
         ▼ If valid
┌────────────────────────────┐
│  Inbox Listener            │
│  .on(Like, ...)            │
│                            │
│  1. Extract actor URI      │
│  2. Extract object URI     │
│  3. Fetch actor details    │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Database Update           │
│                            │
│  INSERT INTO               │
│  activitypub_likes         │
│  (activity_id, actor_uri)  │
│                            │
│  UPDATE post_stats         │
│  SET likes_count + 1       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Frontend Update           │
│                            │
│  Like count increases      │
│  in UI                     │
└────────────────────────────┘
```

---

## Database Schema Relationships

```
┌──────────────┐
│    users     │
│──────────────│
│ email (PK)   │◄──┐
│ display_name │   │
│ bio          │   │
│ created_at   │   │
└──────────────┘   │
                   │
                   │ Foreign Key
                   │
        ┌──────────┴────────────┬─────────────────┐
        │                       │                 │
┌───────▼────────┐   ┌──────────▼─────┐   ┌─────▼──────────────┐
│     posts      │   │ user_follows    │   │ activitypub_       │
│────────────────│   │─────────────────│   │ followers          │
│ id (PK)        │   │ follower_email  │   │────────────────────│
│ user_email (FK)│   │ following_email │   │ user_email (FK)    │
│ content        │   └─────────────────┘   │ follower_uri       │
│ reply_to_id    │◄──┐                     │ follower_handle    │
│ visibility     │   │                     │ status             │
│ activitypub_uri│   │                     └────────────────────┘
│ activitypub_id │   │
│ federated      │   │ Self-reference
│ conversation_uri│  │ for replies
│ created_at     │   │
└────────┬───────┘   │
         │           │
         └───────────┘
         │
         │ One-to-Many
         │
    ┌────┴────┬────────────┬────────────┬──────────────┐
    │         │            │            │              │
┌───▼────┐ ┌─▼───────┐ ┌──▼───────┐ ┌─▼────────┐ ┌───▼────────┐
│post_   │ │post_    │ │post_     │ │post_     │ │activitypub_│
│likes   │ │boosts   │ │tags      │ │stats     │ │post_mapping│
│────────│ │─────────│ │──────────│ │──────────│ │────────────│
│post_id │ │post_id  │ │post_id   │ │post_id   │ │post_id     │
│user_   │ │user_    │ │tag       │ │likes_    │ │activity_id │
│email   │ │email    │ └──────────┘ │count     │ │object_uri  │
└────────┘ └─────────┘              │boosts_   │ └────────────┘
                                    │count     │
                                    │replies_  │
                                    │count     │
                                    └──────────┘

┌────────────────────────┐
│ activitypub_actor_keys │
│────────────────────────│
│ user_email (FK)        │◄─────────┐
│ public_key             │          │
│ private_key            │          │
│ key_id                 │          │
└────────────────────────┘          │
                                    │
┌────────────────────────┐          │
│ activitypub_activities │          │
│────────────────────────│          │
│ user_email (FK)        │──────────┘
│ activity_id            │
│ activity_type          │
│ object_type            │
│ content                │
│ published_at           │
└────────────────────────┘

┌────────────────────────┐
│ activitypub_remote_    │
│ posts                  │
│────────────────────────│
│ activity_uri           │
│ object_uri             │
│ actor_uri              │
│ content                │
│ published_at           │
│ raw_object             │
└────────────────────────┘
```

---

## HTTP Signature Flow

```
Local User Posts
      │
      ▼
┌──────────────────────────────┐
│  Get or Create Actor Keys    │
│                              │
│  1. Check DB for keys        │
│  2. If not exist:            │
│     • Generate RSA key pair  │
│     • Store in DB            │
│  3. Return private key       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Create Activity to Send     │
│                              │
│  {                           │
│    @context: "...",          │
│    type: "Create",           │
│    actor: "...",             │
│    object: { Note }          │
│  }                           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Fedify Signs Request        │
│                              │
│  1. Serialize body           │
│  2. Create signature string: │
│     "(request-target): ..."  │
│     "host: ..."              │
│     "date: ..."              │
│     "digest: SHA-256=..."    │
│  3. Sign with private key    │
│  4. Add Signature header     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  POST to Remote Inbox        │
│                              │
│  Headers:                    │
│    Signature: keyId="...",   │
│      algorithm="rsa-sha256", │
│      headers="...",          │
│      signature="..."         │
│    Digest: SHA-256=...       │
│    Date: ...                 │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Remote Server Verifies      │
│                              │
│  1. Extract keyId from sig   │
│  2. Fetch public key from:   │
│     GET {keyId}              │
│  3. Reconstruct sig string   │
│  4. Verify with public key   │
│  5. Check date freshness     │
│  6. Verify digest            │
└──────────┬───────────────────┘
           │
           ▼ If valid
┌──────────────────────────────┐
│  Process Activity            │
│                              │
│  Activity accepted and       │
│  processed by remote server  │
└──────────────────────────────┘
```

---

## URI Structure

### Actor URIs
```
Local: https://yourdomain.com/users/{email}
Remote: https://mastodon.social/users/{username}
```

### Object URIs (Posts)
```
Local: https://yourdomain.com/posts/{id}
Remote: https://mastodon.social/users/{username}/statuses/{id}
```

### Activity URIs
```
Create: https://yourdomain.com/activities/create/{post_id}/{timestamp}
Like: https://yourdomain.com/users/{email}/likes/{post_id}/{timestamp}
Announce: https://yourdomain.com/users/{email}/announces/{post_id}/{timestamp}
```

### Collection URIs
```
Inbox: https://yourdomain.com/users/{email}/inbox
Outbox: https://yourdomain.com/users/{email}/outbox
Followers: https://yourdomain.com/users/{email}/followers
Following: https://yourdomain.com/users/{email}/following
```

### Well-Known URIs
```
WebFinger: https://yourdomain.com/.well-known/webfinger?resource=acct:{user}@{domain}
NodeInfo: https://yourdomain.com/.well-known/nodeinfo
Host-Meta: https://yourdomain.com/.well-known/host-meta
```

---

## Federation Endpoints

### Public Endpoints (No Auth Required)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/webfinger` | GET | Actor discovery |
| `/.well-known/nodeinfo` | GET | Server info |
| `/users/{handle}` | GET | Actor profile |
| `/posts/{id}` | GET | Post object |
| `/users/{handle}/outbox` | GET | User activities |
| `/users/{handle}/followers` | GET | Followers list |
| `/users/{handle}/following` | GET | Following list |

### Authenticated Endpoints (HTTP Signature Required)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users/{handle}/inbox` | POST | Receive activities |
| `/inbox` | POST | Shared inbox |

### Activity Types Sent

| Type | Trigger | Sent To |
|------|---------|---------|
| `Create` | User posts | Followers' inboxes |
| `Like` | User likes post | Post author's inbox |
| `Announce` | User boosts post | Followers' inboxes |
| `Follow` | User follows remote | Remote actor's inbox |
| `Undo` | User unlikes/unboosts | Original recipient |
| `Accept` | Incoming follow | Follower's inbox |

### Activity Types Received

| Type | Source | Action |
|------|--------|--------|
| `Create` | Remote user | Store in remote_posts |
| `Like` | Remote user | Store in activitypub_likes |
| `Announce` | Remote user | Store in activitypub_shares |
| `Follow` | Remote user | Store in followers, send Accept |
| `Undo` | Remote user | Remove like/boost/follow |

---

## Queue Processing

```
┌─────────────────────────────────────────────────┐
│           Queue Architecture                     │
└─────────────────────────────────────────────────┘

Activity Created (e.g., Post)
      │
      ▼
┌──────────────────────┐
│  Queue Producer      │
│  (Fedify automatic)  │
│                      │
│  For each follower:  │
│    • Create message  │
│    • Add to queue    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  FEDERATION_QUEUE    │
│  (Cloudflare Queue)  │
│                      │
│  Messages batched    │
│  (up to 10)          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Queue Consumer      │
│  queue-consumer.ts   │
│                      │
│  Process batch:      │
│    • Sign message    │
│    • Send to inbox   │
│    • Handle errors   │
└──────────┬───────────┘
           │
      ┌────┴────┐
      │         │
   Success   Failure
      │         │
      ▼         ▼
   Ack()    Retry()
              │
              ▼ (max 3 retries)
      ┌────────────────┐
      │  Dead Letter   │
      │  Queue (DLQ)   │
      │                │
      │  Manual review │
      └────────────────┘
```

---

## Caching Strategy

### KV Store (Fedify Automatic)
- **Actor caching**: 24 hours
- **HTTP signature verification**: 1 hour
- **Public keys**: 24 hours
- **WebFinger responses**: 1 hour

### Database Caching
- **activitypub_actors**: Remote actor info, refreshed every 24h
- **post_stats**: Denormalized counts for performance
- **activitypub_post_mapping**: Post to ActivityPub URI mapping

### Client-Side Caching
- Actor profiles: Cache in React state
- Post feeds: Cache with SWR or React Query
- Interaction counts: Optimistic updates

---

## Security Model

### Incoming Activities
1. **HTTP Signature Verification** (Required)
   - Extract signature from headers
   - Fetch public key from actor
   - Verify signature matches body

2. **Actor Validation**
   - Verify actor exists
   - Check actor domain
   - Validate key ownership

3. **Activity Validation**
   - Schema validation
   - Type checking
   - Object existence

### Outgoing Activities
1. **Key Management**
   - Generate keys per actor
   - Store securely in database
   - Rotate keys periodically (TODO)

2. **Signing**
   - Sign all outgoing requests
   - Include digest header
   - Fresh date header

3. **Delivery**
   - Queue-based delivery
   - Retry with backoff
   - DLQ for failures

---

## Performance Considerations

### Database Optimizations
- Indexes on all foreign keys
- Denormalized stats tables
- Batch inserts for tags
- Query result limits

### Queue Optimizations
- Batch processing (10 messages)
- Parallel delivery to different domains
- Exponential backoff on retries
- DLQ prevents infinite loops

### Network Optimizations
- HTTP/2 connections
- Connection pooling (Cloudflare automatic)
- Gzip compression
- CDN for static assets

### Monitoring Metrics
- Queue depth
- Queue processing time
- Failed deliveries rate
- Signature verification failures
- Database query times
- KV cache hit rate

---

## Scalability Plan

### Current Capacity (Free Tier)
- **Users**: Unlimited (D1 storage limit)
- **Posts/day**: 100K writes (D1 free tier)
- **Federation activities**: 1M/month (Queue free tier)
- **KV operations**: 10M reads/day, 1M writes/day

### Scaling Points
1. **Database**: Upgrade D1 plan or shard by user
2. **Queue**: Upgrade queue plan for higher throughput
3. **KV**: Premium KV for higher limits
4. **Workers**: Automatically scales with traffic

### Bottlenecks to Monitor
1. Queue processing speed
2. Database write throughput
3. Remote server response times
4. KV cache hit rates

---

## Maintenance Tasks

### Daily
- [ ] Monitor queue depth
- [ ] Check DLQ for failures
- [ ] Review error logs

### Weekly
- [ ] Analyze federation metrics
- [ ] Check remote actor cache freshness
- [ ] Review failed deliveries

### Monthly
- [ ] Database vacuum/optimize
- [ ] Key rotation (future)
- [ ] Capacity planning
- [ ] Security audit

---

**This architecture provides**:
- Full ActivityPub compliance
- Bidirectional federation
- Scalable queue-based delivery
- Secure HTTP signature verification
- Efficient caching strategy
- Production-ready performance
