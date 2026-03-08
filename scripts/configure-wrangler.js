#!/usr/bin/env node
// Generates wrangler.toml from wrangler.toml.template + cloudflare.env
// Usage: node scripts/configure-wrangler.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, 'cloudflare.env');
const template = resolve(root, 'wrangler.toml.template');
const output = resolve(root, 'wrangler.toml');

if (!existsSync(envFile)) {
  console.error('Missing cloudflare.env — copy cloudflare.env.example and fill in your IDs.');
  process.exit(1);
}

// Parse cloudflare.env
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8')
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
    .filter(([k, v]) => k && v)
);

const required = ['D1_DATABASE_ID', 'KV_PREVIEW_ID', 'KV_PROD_ID'];
const missing = required.filter(k => !env[k]);
if (missing.length) {
  console.error(`Missing required values in cloudflare.env: ${missing.join(', ')}`);
  process.exit(1);
}

let toml = readFileSync(template, 'utf8');
for (const [key, value] of Object.entries(env)) {
  toml = toml.replaceAll(`{{${key}}}`, value);
}

writeFileSync(output, toml);
console.log('wrangler.toml generated successfully.');
