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
