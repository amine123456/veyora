import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { parseSecretKey, sealSecret, openSecret } from '../src/secret-box.js';
import { DeliveryConfigError, keepSavedSecrets, missingSecret, validateDeliveryInput } from '../src/delivery-config.js';

const key = crypto.randomBytes(32);
const publicOnly = { assertPublicHost: async (host) => { if (/^(10\.|127\.|localhost)/.test(host)) throw new Error('private host'); } };
const rejects = (input, pattern) => assert.rejects(validateDeliveryInput(input, publicOnly), (error) => {
  assert.ok(error instanceof DeliveryConfigError || /private host/.test(error.message), error.message);
  if (pattern) assert.match(error.message, pattern);
  return true;
});

test('sealed secrets round-trip, differ every time and reject tampering', () => {
  const a = sealSecret(key, 'hunter2');
  const b = sealSecret(key, 'hunter2');
  assert.match(a, /^v1:/);
  assert.notEqual(a, b);
  assert.ok(!a.includes('hunter2'));
  assert.equal(openSecret(key, a), 'hunter2');
  const raw = Buffer.from(a.slice(3), 'base64');
  raw[14] ^= 1;
  assert.throws(() => openSecret(key, `v1:${raw.toString('base64')}`));
  assert.throws(() => openSecret(crypto.randomBytes(32), a));
  assert.equal(sealSecret(key, ''), null);
});

test('the secret key accepts 64 hex characters or base64 of 32 bytes only', () => {
  assert.equal(parseSecretKey(''), null);
  assert.equal(parseSecretKey('ab'.repeat(32)).length, 32);
  assert.equal(parseSecretKey(crypto.randomBytes(32).toString('base64')).length, 32);
  assert.throws(() => parseSecretKey('too-short'));
});

test('each method accepts a valid configuration', async () => {
  const s3 = await validateDeliveryInput({ method: 's3', format: 'parquet', bucket: 'Acme-Data', bucket_region: 'eu-west-1', bucket_prefix: '/veyora/feeds', access_key_id: 'AKIAABCDEFGHIJKLMNOP', secret_access_key: 'x' }, publicOnly);
  assert.deepEqual([s3.bucket, s3.bucket_prefix, s3.format], ['acme-data', 'veyora/feeds', 'parquet']);
  const gcs = await validateDeliveryInput({ method: 'gcs', bucket: 'acme_data', access_key_id: 'GOOG1EABCDEFGHIJKLMN', secret_access_key: 'y' }, publicOnly);
  assert.equal(gcs.bucket_region, undefined);
  const sf = await validateDeliveryInput({ method: 'snowflake', snowflake_account: 'myorg-acct1', snowflake_user: 'LOADER', snowflake_password: 'p', snowflake_warehouse: 'WH', snowflake_database: 'RAW', snowflake_table: 'CARS' }, publicOnly);
  assert.equal(sf.snowflake_schema, 'PUBLIC');
  const sftp = await validateDeliveryInput({ method: 'sftp', sftp_host: 'sftp.acme.io', sftp_username: 'u', sftp_path: 'in/feeds' }, publicOnly);
  assert.deepEqual([sftp.sftp_port, sftp.sftp_path, sftp.format], [22, '/in/feeds', 'jsonl']);
  const hook = await validateDeliveryInput({ method: 'webhook', webhook_url: 'https://api.acme.io/hook' }, publicOnly);
  assert.equal(hook.webhook_url, 'https://api.acme.io/hook');
  assert.deepEqual(await validateDeliveryInput({ method: 'api', format: 'csv' }, publicOnly), { method: 'api', format: 'csv' });
});

test('unsafe or malformed settings are refused', async () => {
  await rejects({ method: 'ftp' }, /delivery method/);
  await rejects({ method: 'api', format: 'xml' }, /file format/);
  await rejects({ method: 'sftp', sftp_host: '127.0.0.1', sftp_username: 'u' }, /private host/);
  await rejects({ method: 'sftp', sftp_host: 'evil.io/../x', sftp_username: 'u' }, /hostname/);
  await rejects({ method: 'sftp', sftp_host: 'sftp.acme.io', sftp_username: 'u', sftp_path: '/in/../../etc' }, /\.\./);
  await rejects({ method: 'webhook', webhook_url: 'http://api.acme.io/hook' }, /HTTPS/);
  await rejects({ method: 'webhook', webhook_url: 'https://user:pw@api.acme.io/' }, /credentials/);
  await rejects({ method: 'webhook', webhook_url: 'https://localhost/hook' }, /private host/);
  await rejects({ method: 's3', bucket: 'a', access_key_id: 'AKIAABCDEFGHIJKLMNOP' }, /bucket/);
  await rejects({ method: 's3', bucket: 'acme', bucket_region: 'mars', access_key_id: 'AKIAABCDEFGHIJKLMNOP' }, /region/);
  await rejects({ method: 'gcs', bucket: 'acme', access_key_id: 'short' }, /HMAC/);
  await rejects({ method: 'snowflake', snowflake_account: 'evil.com/x', snowflake_user: 'u', snowflake_warehouse: 'W', snowflake_database: 'D', snowflake_table: 'T' }, /account/);
  await rejects({ method: 'snowflake', snowflake_account: 'org-a', snowflake_user: 'u', snowflake_warehouse: 'W; DROP', snowflake_database: 'D', snowflake_table: 'T' }, /identifier/);
});

test('blank secrets keep the saved one for the same method only', () => {
  const saved = { method: 's3', secret_access_key: 'v1:sealed' };
  const kept = keepSavedSecrets({ method: 's3', secret_access_key: '' }, saved);
  assert.equal(kept.secret_access_key, 'v1:sealed');
  assert.equal(kept.secret_access_key__new, undefined);
  const switched = keepSavedSecrets({ method: 'gcs', secret_access_key: '' }, saved);
  assert.equal(switched.secret_access_key, null);
  assert.match(missingSecret(switched), /secret key/);
  const replaced = keepSavedSecrets({ method: 's3', secret_access_key: 'new' }, saved);
  assert.deepEqual([replaced.secret_access_key, replaced.secret_access_key__new], ['new', true]);
});
