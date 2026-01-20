/**
 * Queue Consumer for ActivityPub Federation
 *
 * REASONING: This is the critical worker that actually DELIVERS activities to remote servers.
 *
 * Architecture:
 * 1. API handlers (create.ts, like.ts, boost.ts) CREATE activities and put them in queue
 * 2. This consumer PROCESSES the queue and delivers activities to remote inboxes
 * 3. Separation allows non-blocking API responses (federation happens async)
 *
 * Why separate consumer?
 * - Activities can take seconds to deliver (HTTP to remote servers)
 * - Don't want to block user-facing API responses
 * - Allows retry logic for failed deliveries
 * - Cloudflare Queue provides durability and reliability
 */

import type { Message } from '@fedify/fedify';
import { createFederationInstance, type FederationEnv } from './federation/config';

/**
 * Queue consumer handler
 *
 * REASONING: Cloudflare calls this function when messages arrive in the queue
 * - batch: Contains 1+ messages (configurable in Dashboard)
 * - env: Bindings (DB, KV, QUEUE) needed for federation
 *
 * Message lifecycle:
 * 1. Message arrives in batch
 * 2. We process it via Fedify's processQueuedTask
 * 3. On success: ack() removes from queue
 * 4. On failure: retry() puts back in queue with backoff
 * 5. After max retries: goes to dead-letter queue (if configured)
 */
export const queue = async (
  batch: MessageBatch<Message>,
  env: FederationEnv
): Promise<void> => {
  // REASONING: Create federation instance once per batch (not per message)
  // This instance has all dispatchers and configuration from config.ts
  const federation = createFederationInstance(env);

  console.log(`Processing queue batch: ${batch.messages.length} messages`);

  // REASONING: Process each message independently
  // - If one fails, others still process
  // - Each message is a separate activity delivery
  for (const message of batch.messages) {
    try {
      // REASONING: Fedify's processQueuedTask handles:
      // - HTTP signature generation (using actor keys)
      // - Activity serialization to JSON-LD
      // - POST to remote inbox URLs
      // - Response validation
      // - Automatic retries for 5xx errors
      await federation.processQueuedTask(message.body as Message, env);

      // REASONING: ack() tells Cloudflare "message processed successfully"
      // - Removes message from queue permanently
      // - If we don't ack, message will be redelivered
      message.ack();

      console.log(`Successfully processed message: ${message.id}`);
    } catch (error) {
      // REASONING: Catch errors to prevent batch processing from stopping
      // - One bad message shouldn't kill the entire batch
      // - Log for debugging (appears in Cloudflare Dashboard logs)
      console.error('Error processing queue message:', error);
      console.error('Message ID:', message.id);
      console.error('Message body:', JSON.stringify(message.body));

      // REASONING: retry() tells Cloudflare "try again later"
      // - Keeps message in queue
      // - Cloudflare applies exponential backoff
      // - After max_retries (configured in Dashboard), goes to DLQ
      //
      // When to retry vs ack:
      // - Transient errors (network, remote 5xx): RETRY
      // - Permanent errors (remote 404, 410): Should ack to not retry forever
      // - For now, retry everything (Cloudflare's max_retries protects us)
      message.retry();
    }
  }

  console.log(`Finished processing batch: ${batch.messages.length} messages`);
};
