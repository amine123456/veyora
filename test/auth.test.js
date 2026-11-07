import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_BUSY,
  createClientAuthParser,
  decodeCredentials,
  parseRoutedUsername,
  upstreamAuthorization,
} from "../src/auth.js";

function basic(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

test("strictly decodes valid Basic credentials", () => {
  assert.deepEqual(
    decodeCredentials(basic("cousin.user", "correct horse battery staple")),
    { username: "cousin.user", password: "correct horse battery staple" },
  );
});

test("rejects malformed, ambiguous, and out-of-policy credentials", () => {
  const invalidHeaders = [
    undefined,
    "Bearer token",
    "Basic !!!!",
    `Basic ${Buffer.from(":correct horse battery staple").toString("base64")}`,
    basic("ab", "correct horse battery staple"),
    basic("valid-user", "too-short"),
    "Basic /w==", // Invalid UTF-8 must not be silently replaced.
    `Basic ${"A".repeat(1_100)}`,
  ];

  for (const header of invalidHeaders) assert.equal(decodeCredentials(header), null);
});

test("auth parser delegates valid credentials and absorbs backend failures", async () => {
  const seen = [];
  const parser = createClientAuthParser(2, async (username, password) => {
    seen.push({ username, password });
    if (username === "broken-user") throw new Error("backend unavailable");
    return { username };
  });

  assert.deepEqual(
    await parser(basic("valid-user", "correct horse battery staple")),
    { username: "valid-user", routing: { country: null, session: null } },
  );
  assert.equal(await parser(basic("broken-user", "correct horse battery staple")), null);
  assert.deepEqual(seen.map(({ username }) => username), ["valid-user", "broken-user"]);
});

test("auth parser reports busy, not a failed login, when its concurrency limit is full", async () => {
  let releaseFirst;
  let calls = 0;
  const firstAuthentication = new Promise((resolve) => { releaseFirst = resolve; });
  const parser = createClientAuthParser(1, async (username) => {
    calls += 1;
    await firstAuthentication;
    return { username };
  });

  const first = parser(basic("first-user", "correct horse battery staple"));
  assert.equal(
    await parser(basic("second-user", "another correct horse battery")),
    AUTH_BUSY,
  );
  assert.equal(calls, 1);

  releaseFirst();
  assert.deepEqual(await first, { username: "first-user", routing: { country: null, session: null } });
});

test("builds the upstream Basic header without exposing plaintext credentials", () => {
  const header = upstreamAuthorization({
    upstreamUsername: "provider-user",
    upstreamPassword: "provider:password",
  });
  assert.equal(
    header,
    `Basic ${Buffer.from("provider-user:provider:password").toString("base64")}`,
  );
  assert.equal(header.includes("provider-user"), false);
});

test("rejects invalid authentication limiter configuration", () => {
  assert.throws(() => createClientAuthParser(0), /positive safe integer/);
  assert.throws(() => createClientAuthParser(1, null), /must be a function/);
});

test("parses country and session options from the customer username", () => {
  assert.deepEqual(parseRoutedUsername("px390e56b610"), { username: "px390e56b610", country: null, session: null });
  assert.deepEqual(parseRoutedUsername("px390e56b610-country-gr"), { username: "px390e56b610", country: "GR", session: null });
  assert.deepEqual(parseRoutedUsername("px390e56b610-session-abc123"), { username: "px390e56b610", country: null, session: "abc123" });
  assert.deepEqual(
    parseRoutedUsername("cousin.user-country-de-session-Job7"),
    { username: "cousin.user", country: "DE", session: "Job7" },
  );
  // Hyphenated admin usernames still work when no options are given.
  assert.deepEqual(parseRoutedUsername("parallel-client"), { username: "parallel-client", country: null, session: null });
  // Malformed options are not routing: they stay part of the username, which then fails to log in.
  assert.deepEqual(parseRoutedUsername("px1-country-greece"), { username: "px1-country-greece", country: null, session: null });
  assert.equal(parseRoutedUsername("px1-session-has space"), null);
  assert.equal(parseRoutedUsername("ab"), null);
});

test("auth parser authenticates the base username and returns the routing", async () => {
  const seen = [];
  const parser = createClientAuthParser(2, async (username) => { seen.push(username); return { username }; });
  assert.deepEqual(
    await parser(basic("px390e56b610-country-gr-session-abc", "correct horse battery staple")),
    { username: "px390e56b610", routing: { country: "GR", session: "abc" } },
  );
  assert.deepEqual(seen, ["px390e56b610"]);
});

test("translates routing into the upstream provider login", () => {
  const config = { upstreamUsername: "base", upstreamPassword: "secret", upstreamSessionTtlSeconds: 600 };
  const login = (options) => Buffer.from(upstreamAuthorization(config, options).slice(6), "base64").toString();

  assert.equal(login({ username: "px1" }), "base:secret");
  assert.equal(login({ username: "px1", country: "GR" }), "base-cc-GR:secret");
  assert.match(login({ username: "px1", country: "GR", session: "job" }), /^base-cc-GR-sid-[0-9a-f]{16}-ttl-600:secret$/);
  assert.match(login({ username: "px1", session: "job" }), /^base-sid-[0-9a-f]{16}-ttl-600:secret$/);

  // Same customer and session name: same sticky IP. Different customers: different sessions.
  assert.equal(login({ username: "px1", session: "job" }), login({ username: "px1", session: "job" }));
  assert.notEqual(login({ username: "px1", session: "job" }), login({ username: "px2", session: "job" }));
});

test("auth parser answers cached credentials without taking a scrypt slot", async () => {
  let releaseSlow;
  const slow = new Promise((resolve) => { releaseSlow = resolve; });
  const parser = createClientAuthParser(
    1,
    async (username) => { await slow; return { username }; },
    async (username) => (username === "cached-user" ? { username } : null),
  );

  const pending = parser(basic("slow-user", "correct horse battery staple"));
  assert.deepEqual(
    await parser(basic("cached-user-country-de", "correct horse battery staple")),
    { username: "cached-user", routing: { country: "DE", session: null } },
  );
  assert.equal(await parser(basic("other-user", "correct horse battery staple")), AUTH_BUSY);
  releaseSlow();
  assert.equal((await pending).username, "slow-user");
});
