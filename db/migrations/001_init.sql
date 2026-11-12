-- Amounts are bigint but never exceed 2^53 - 1, so they stay exact as JavaScript numbers.

CREATE TABLE clients (
  username                text PRIMARY KEY CHECK (username ~ '^[A-Za-z0-9._-]{3,64}$'),
  salt                    text NOT NULL CHECK (salt ~ '^[0-9a-f]{32}$'),
  hash                    text NOT NULL CHECK (hash ~ '^[0-9a-f]{128}$'),
  quota_bytes             bigint NOT NULL DEFAULT 0 CHECK (quota_bytes BETWEEN 0 AND 9007199254740991),
  used_bytes              bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  balance_micros          bigint NOT NULL DEFAULT 0 CHECK (balance_micros BETWEEN 0 AND 9007199254740991),
  enabled                 boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL,
  email                   text CHECK (email = lower(email)),
  web_salt                text CHECK (web_salt ~ '^[0-9a-f]{32}$'),
  web_hash                text CHECK (web_hash ~ '^[0-9a-f]{128}$'),
  email_verified          boolean NOT NULL DEFAULT false,
  verification_token      text,
  verification_expires_at timestamptz,
  CONSTRAINT clients_email_key UNIQUE (email),
  CONSTRAINT clients_usage_within_quota CHECK (used_bytes <= quota_bytes),
  CONSTRAINT clients_web_account CHECK (email IS NULL OR (web_salt IS NOT NULL AND web_hash IS NOT NULL))
);
CREATE UNIQUE INDEX clients_verification_token_key ON clients (verification_token) WHERE verification_token IS NOT NULL;

-- Only SHA-256 digests of session tokens and API keys are stored.
CREATE TABLE sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  username   text NOT NULL REFERENCES clients (username) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_username_idx ON sessions (username);

CREATE TABLE api_keys (
  key_hash   text PRIMARY KEY CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  id         text NOT NULL UNIQUE CHECK (id ~ '^key_[0-9a-f]{16}$'),
  seq        bigserial,
  username   text NOT NULL REFERENCES clients (username) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) <= 40),
  prefix     text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX api_keys_username_idx ON api_keys (username);

-- A purchase credits either prepaid GB (bytes) or the USD wallet (micros), never both.
CREATE TABLE pending_payments (
  purchase_id uuid PRIMARY KEY,
  username    text NOT NULL REFERENCES clients (username) ON DELETE CASCADE,
  package_id  text NOT NULL,
  bytes       bigint NOT NULL DEFAULT 0 CHECK (bytes >= 0),
  micros      bigint NOT NULL DEFAULT 0 CHECK (micros >= 0),
  cents       integer NOT NULL CHECK (cents >= 50),
  currency    text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  created_at  timestamptz NOT NULL,
  expires_at  timestamptz NOT NULL,
  session_id  text,
  CONSTRAINT pending_payments_one_credit CHECK ((bytes > 0) <> (micros > 0))
);
CREATE INDEX pending_payments_username_idx ON pending_payments (username);

-- One row per provider event that credited an account; the primary key is what makes
-- a replayed webhook harmless.
CREATE TABLE processed_payments (
  event_id     text PRIMARY KEY,
  purchase_id  uuid NOT NULL,
  session_id   text NOT NULL,
  username     text NOT NULL REFERENCES clients (username) ON DELETE CASCADE,
  package_id   text NOT NULL,
  bytes        bigint NOT NULL DEFAULT 0,
  micros       bigint NOT NULL DEFAULT 0,
  processed_at timestamptz NOT NULL
);
CREATE INDEX processed_payments_username_idx ON processed_payments (username);
