import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBasicAuth } from '../src/browser-fetcher.js';

test('parseBasicAuth decodes a valid Basic header', () => {
  const encoded = 'Basic ' + Buffer.from('user-cc-de-sid-abc123:secret').toString('base64');
  const result = parseBasicAuth(encoded);
  assert.deepEqual(result, { username: 'user-cc-de-sid-abc123', password: 'secret' });
});

test('parseBasicAuth returns null for missing or malformed headers', () => {
  assert.equal(parseBasicAuth(''), null);
  assert.equal(parseBasicAuth('Bearer token'), null);
  assert.equal(parseBasicAuth('Basic '), null);
});

test('parseBasicAuth handles passwords with colons', () => {
  const encoded = 'Basic ' + Buffer.from('user:pass:with:colons').toString('base64');
  const result = parseBasicAuth(encoded);
  assert.equal(result.username, 'user');
  assert.equal(result.password, 'pass:with:colons');
});
