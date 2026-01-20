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
