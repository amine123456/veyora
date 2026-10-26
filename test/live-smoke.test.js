import assert from 'node:assert/strict';
import test from 'node:test';

import { usernameForCountry, usernameForSmoke } from '../scripts/live-smoke.js';

test('usernameForCountry replaces only the provider country segment', () => {
  assert.equal(
    usernameForCountry('account-cc-GR-sid-session-ttl-600', 'FR'),
    'account-cc-FR-sid-session-ttl-600',
  );
  assert.equal(
    usernameForCountry('account-CC-gr', 'DE'),
    'account-cc-DE',
  );
});

test('usernameForCountry rejects malformed inputs', () => {
  assert.throws(
    () => usernameForCountry('account-without-country', 'ES'),
    /does not contain/,
  );
  assert.throws(
    () => usernameForCountry('account-cc-GR', 'es'),
    /two uppercase/,
  );
});

test('usernameForSmoke replaces country and placeholder session segments', () => {
  assert.equal(
    usernameForSmoke('account-cc-GR-sid-YOURSESSION-ttl-600', 'ES', 'abc12345'),
    'account-cc-ES-sid-abc12345-ttl-600',
  );
});

test('usernameForSmoke rejects missing or unsafe session segments', () => {
  assert.throws(
    () => usernameForSmoke('account-cc-GR-ttl-600', 'FR', 'abc12345'),
    /does not contain a -sid-SESSION segment/,
  );
  assert.throws(
    () => usernameForSmoke('account-cc-GR-sid-old-ttl-600', 'FR', '../bad'),
    /Session ID must be/,
  );
});
