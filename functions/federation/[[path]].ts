import { createFederationInstance, type FederationEnv } from './config';
import type { Message } from '@fedify/fedify';

export const onRequest: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Only handle federation-related paths
  const federationPaths = [
    '/users/',
    '/posts/',
    '/nodeinfo/',
    '/.well-known/webfinger',
    '/.well-known/nodeinfo',
    '/.well-known/host-meta',
  ];

  const isFederationRequest = federationPaths.some(path => url.pathname.startsWith(path));

  if (!isFederationRequest) {
    return new Response('Not Found', { status: 404 });
  }

  // Create federation instance
  const federation = createFederationInstance(env);

  // Handle the request through Fedify
  return await federation.fetch(request, {
    contextData: env,
    onNotFound: () => {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onNotAcceptable: () => {
      return new Response('Not Acceptable', {
        status: 406,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
};

// Queue handler for processing federated activities
export const onRequestQueue: PagesFunction<FederationEnv> = async (context) => {
  const { env } = context;

  // Note: For Cloudflare Pages, queue consumption happens via Workers
  // This is a placeholder that shows the structure
  // Actual queue processing should be configured in wrangler.toml
  return new Response('Queue endpoint - configured via wrangler.toml', {
    status: 200
  });
};
