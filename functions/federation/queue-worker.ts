import { createFederationInstance, type FederationEnv } from './config';
import type { Message } from '@fedify/fedify';

// Queue consumer worker for processing ActivityPub activities
// This needs to be deployed as a separate Worker or configured in Pages Functions

export interface QueueEnv extends FederationEnv {
  FEDERATION_QUEUE: Queue;
}

export default {
  async queue(batch: MessageBatch, env: QueueEnv, ctx: ExecutionContext): Promise<void> {
    const federation = createFederationInstance(env);

    for (const message of batch.messages) {
      try {
        // Process the queued task through Fedify
        await federation.processQueuedTask(
          message.body as unknown as Message,
          env
        );

        // Acknowledge successful processing
        message.ack();

        console.log('Processed federation queue message:', message.id);
      } catch (error) {
        console.error('Error processing federation queue message:', error);

        // Retry the message (will go to DLQ after max retries)
        message.retry();
      }
    }
  }
};
