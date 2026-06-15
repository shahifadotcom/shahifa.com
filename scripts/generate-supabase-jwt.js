#!/usr/bin/env node
/**
 * Mint Supabase anon + service_role JWTs signed with a given JWT_SECRET.
 * Usage: node scripts/generate-supabase-jwt.js <JWT_SECRET>
 * Prints: ANON_KEY=<jwt>\nSERVICE_ROLE_KEY=<jwt>
 *
 * Zero-dependency HS256 implementation so this works on a fresh VPS
 * with only Node.js installed — no `npm install` required.
 */
const crypto = require('crypto');

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = b64url(crypto.createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

const secret = process.argv[2];
if (!secret || secret.length < 32) {
  console.error('Usage: node generate-supabase-jwt.js <JWT_SECRET (>=32 chars)>');
  process.exit(1);
}

// 10 year expiry — matches Supabase cloud convention
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10;

const anon = sign({ role: 'anon', iss: 'supabase', iat, exp }, secret);
const service = sign({ role: 'service_role', iss: 'supabase', iat, exp }, secret);

process.stdout.write(`ANON_KEY=${anon}\nSERVICE_ROLE_KEY=${service}\n`);
