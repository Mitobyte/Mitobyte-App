# ActivityPub Integration Setup Guide

This guide will help you deploy the ActivityPub/Fediverse integration for your Mitobyte voting application.

## Prerequisites

- Cloudflare account with Pages and Workers enabled
- Domain configured in Cloudflare
- Access to Wrangler CLI

## Step 1: Create Cloudflare Resources

### Create KV Namespaces

```bash
# Development KV namespace
wrangler kv:namespace create FEDERATION_KV

# Production KV namespace
wrangler kv:namespace create FEDERATION_KV --env production
```

Copy the IDs returned and update them in `wrangler.toml`:

```toml
# Development
[[kv_namespaces]]
binding = "FEDERATION_KV"
id = "your-dev-kv-id-here"

# Production
[[env.production.kv_namespaces]]
binding = "FEDERATION_KV"
id = "your-prod-kv-id-here"
```

### Create Queues

```bash
# Development queue
wrangler queues create mitobyte-federation-queue

# Development dead letter queue
wrangler queues create mitobyte-federation-dlq

# Production queue
wrangler queues create mitobyte-federation-queue-prod

# Production dead letter queue
wrangler queues create mitobyte-federation-dlq-prod
```

## Step 2: Run Database Migrations

```bash
# Run ActivityPub tables migration
wrangler d1 execute mitobyte-users --file=./migrations/0020_create_activitypub_tables.sql

# Add fediverse publishing setting
wrangler d1 execute mitobyte-users --file=./migrations/0021_add_fediverse_publishing_setting.sql

# For local development
wrangler d1 execute mitobyte-users --local --file=./migrations/0020_create_activitypub_tables.sql
wrangler d1 execute mitobyte-users --local --file=./migrations/0021_add_fediverse_publishing_setting.sql
```

## Step 3: Configure DNS (Important!)

For ActivityPub to work, your application must be accessible via HTTPS with a valid domain. Configure your Cloudflare Pages custom domain:

1. Go to Cloudflare Dashboard > Pages > Your Project > Custom Domains
2. Add your domain (e.g., `mitobyte.com`)
3. Ensure DNS is properly configured

ActivityPub requires:
- HTTPS (Cloudflare provides this automatically)
- Valid SSL certificate (Cloudflare provides this)
- Proper CORS headers (already configured in the code)

## Step 4: Deploy the Application

```bash
# Build the application
npm run build

# Deploy to production
npm run pages:deploy
```

## Step 5: Verify Federation Endpoints

After deployment, verify these endpoints are accessible:

1. **WebFinger**: `https://yourdomain.com/.well-known/webfinger?resource=acct:user@yourdomain.com`
2. **Actor Profile**: `https://yourdomain.com/users/user@example.com`
3. **NodeInfo**: `https://yourdomain.com/.well-known/nodeinfo`

## Step 6: Test the Integration

### Test from Mastodon

1. Open your Mastodon instance
2. Search for `@userEmail@yourdomain.com` (replace with actual user email)
3. Click Follow
4. Check that the follow appears in your Mitobyte federation stats

### Test Publishing

1. Log in to Mitobyte
2. Go to Federation settings
3. Enable "Publish Votes to Fediverse"
4. Vote on a hackathon idea
5. Check your Mastodon followers' timelines for the vote activity

## API Endpoints

Your application now has these federation endpoints:

- `POST /api/federation/follow` - Follow a remote actor
- `POST /api/federation/unfollow` - Unfollow a remote actor
- `GET /api/federation/stats` - Get user's federation statistics
- `POST /api/federation/publish-vote` - Publish a vote to the fediverse
- `POST /api/federation/toggle-publishing` - Enable/disable vote publishing
- `GET /api/federation/toggle-publishing` - Get publishing status

## Frontend Components

New React components available:

- `<FederationProfile>` - Display user's fediverse profile and stats
- `<FollowButton>` - Follow/unfollow button for remote actors
- `<FediverseToggle>` - Toggle vote publishing setting
- `<ActivityFeed>` - Display user's recent fediverse activities
- `<FederationPage>` - Full federation management page

## Integration with Existing Code

To integrate federation into your existing voting flow:

```javascript
// After a successful vote in idea-votes.js
import { publishActivity } from '../federation/utils';

// After recording the vote
if (user.publish_votes_to_fediverse) {
  await publishActivity(env, {
    userEmail: user.email,
    content: `Voted for hackathon idea: ${idea.title}`,
    voteId: ideaId,
    voteTitle: idea.title,
    type: 'vote'
  });
}
```

## Troubleshooting

### Queue Not Processing

Check queue consumer configuration:
```bash
wrangler queues list
wrangler queues consumer list mitobyte-federation-queue
```

### WebFinger Not Working

1. Verify DNS is properly configured
2. Check that HTTPS is enabled
3. Verify the federation endpoint is deployed
4. Check Cloudflare Pages Functions logs

### Followers Not Showing

1. Check database for followers: `SELECT * FROM activitypub_followers;`
2. Verify inbox endpoint is receiving activities
3. Check KV store for cached data
4. Review queue processing logs

### Activities Not Publishing

1. Verify user has enabled fediverse publishing
2. Check that user has followers
3. Review queue for pending tasks
4. Check application logs for errors

## Security Considerations

- All ActivityPub activities are verified using HTTP signatures
- User privacy: vote publishing is opt-in
- Follower validation before accepting follows
- Rate limiting should be added for production use
- Consider adding moderation tools for blocking/reporting

## Performance Optimization

For production deployments:

1. **KV Caching**: Actor information is cached in KV to reduce external API calls
2. **Queue Processing**: Activities are processed asynchronously via queues
3. **Database Indexes**: All federation tables have proper indexes
4. **Batch Operations**: Follower notifications are batched for efficiency

## Monitoring

Monitor these metrics:

- Queue depth and processing time
- Failed activity deliveries (check DLQ)
- KV storage usage
- API response times for federation endpoints
- Follower/following growth rates

## Cost Estimation

Cloudflare pricing for federation features:

- **KV Reads**: 10M free per day
- **KV Writes**: 1M free per day
- **Queue Messages**: 1M free per month
- **D1 Reads**: 5M free per day
- **D1 Writes**: 100K free per day

For typical usage (100 active users, 1000 votes/day):
- Estimated cost: $0-5/month (likely within free tier)

## Next Steps

1. Add user profile pages with federation information
2. Implement hashtag support for better discoverability
3. Add media attachments to activities
4. Implement mentions and replies
5. Add moderation tools
6. Create analytics dashboard for federation metrics
7. Implement notification system for new followers

## Support Resources

- [ActivityPub Specification](https://www.w3.org/TR/activitypub/)
- [Fedify Documentation](https://fedify.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Mastodon API Documentation](https://docs.joinmastodon.org/)

## License

This integration is part of the Mitobyte voting application.
