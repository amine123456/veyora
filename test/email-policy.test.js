import assert from 'node:assert/strict';
import test from 'node:test';
import { query } from './helpers/database.js';

const store = await import('../src/store.js');
const { canonicalEmail, isDisposableEmail } = await import('../src/email-policy.js');

test('disposable inbox domains are recognised, including their subdomains', () => {
  for (const email of ['a@mailinator.com', 'a@yopmail.com', 'a@10minutemail.com', 'a@guerrillamail.com', 'a@sub.mailinator.com']) {
    assert.equal(isDisposableEmail(email), true, email);
  }
  for (const email of ['a@gmail.com', 'a@outlook.com', 'a@proton.me', 'a@veyora.pro', 'a@mailinator.com.company.example']) {
    assert.equal(isDisposableEmail(email), false, email);
  }
});

test('aliases of one inbox share a canonical address', () => {
  assert.equal(canonicalEmail('a.m.i.n.e+promo@gmail.com'), 'amine@gmail.com');
  assert.equal(canonicalEmail('amine@googlemail.com'), 'amine@gmail.com');
  assert.equal(canonicalEmail('first.last+x@outlook.com'), 'first.last@outlook.com');
  assert.equal(canonicalEmail('plain@example.org'), 'plain@example.org');
});

test('signup refuses temporary inboxes and second accounts on the same inbox', async () => {
  await assert.rejects(store.createAccount('scammer@mailinator.com', 'long enough password'), { code: 'DISPOSABLE_EMAIL' });
  await assert.rejects(store.createAccount('scammer@x.yopmail.com', 'long enough password'), { code: 'DISPOSABLE_EMAIL' });

  await store.createAccount('john.smith@gmail.com', 'long enough password');
  for (const alias of ['johnsmith@gmail.com', 'j.o.h.n.smith+free@gmail.com', 'johnsmith+2@googlemail.com']) {
    await assert.rejects(store.createAccount(alias, 'long enough password'), { code: 'EMAIL_TAKEN' }, alias);
  }
  await store.createAccount('worker@company.example', 'long enough password');
  await assert.rejects(store.createAccount('worker+test@company.example', 'long enough password'), { code: 'EMAIL_TAKEN' });

  const { rows } = await query("SELECT count(*)::int AS count FROM clients WHERE email_canonical = 'johnsmith@gmail.com'");
  assert.equal(rows[0].count, 1);
});

test('the migration backfills the same canonical form the code computes', async () => {
  const emails = ['a.b+c@gmail.com', 'x+y@googlemail.com', 'name+tag@outlook.com', 'plain@example.org'];
  const { rows } = await query(
    `SELECT e AS email, CASE
         WHEN split_part(e, '@', 2) IN ('gmail.com', 'googlemail.com')
           THEN replace(split_part(split_part(e, '@', 1), '+', 1), '.', '') || '@gmail.com'
         ELSE split_part(split_part(e, '@', 1), '+', 1) || '@' || split_part(e, '@', 2)
       END AS canonical
     FROM unnest($1::text[]) AS e`,
    [emails],
  );
  for (const row of rows) assert.equal(row.canonical, canonicalEmail(row.email), row.email);
});
