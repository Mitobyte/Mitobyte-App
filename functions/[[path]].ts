import { createFederationInstance, type FederationEnv } from './federation/config';

/**
 * Root-level catch-all handler for federation paths
 * Handles: .well-known/*, users/*, posts/*, nodeinfo/*
 */
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
    // Not a federation request, continue to next handler or return 404
    return context.env.ASSETS ? context.env.ASSETS.fetch(request) : new Response('Not Found', { status: 404 });
  }

  // Create federation instance
  const federation = createFederationInstance(env);

  // Handle the request through Fedify
  try {
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
  } catch (error) {
    console.error('Federation handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
