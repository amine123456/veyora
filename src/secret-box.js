// Encrypts customer delivery credentials (SFTP passwords, bucket keys, Snowflake passwords,
// webhook secrets) before they reach the database. Format: "v1:" + base64(iv | ciphertext | tag),
// AES-256-GCM, so scripts/deliver-feeds.py can decrypt it with cryptography's AESGCM.
import crypto from 'node:crypto';

const PREFIX = 'v1:';

export function parseSecretKey(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const key = /^[0-9a-f]{64}$/i.test(text) ? Buffer.from(text, 'hex') : Buffer.from(text, 'base64');
  if (key.length !== 32) throw new Error('DELIVERY_SECRET_KEY must be 32 bytes, as 64 hex characters or base64');
  return key;
}

export function sealSecret(key, plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, body, cipher.getAuthTag()]).toString('base64');
}

export function openSecret(key, sealed) {
  if (!sealed) return null;
  if (!String(sealed).startsWith(PREFIX)) throw new Error('Secret is not sealed');
  const raw = Buffer.from(String(sealed).slice(PREFIX.length), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(raw.length - 16));
  return Buffer.concat([decipher.update(raw.subarray(12, raw.length - 16)), decipher.final()]).toString('utf8');
}
