CREATE TABLE usage_events (
  id         bigserial PRIMARY KEY,
  username   text NOT NULL REFERENCES clients (username) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind       text NOT NULL CHECK (kind IN ('proxy', 'unlocker')),
  pool       text NOT NULL DEFAULT 'residential',
  domain     text,
  status     smallint,
  outcome    text,
  bytes      bigint NOT NULL DEFAULT 0 CHECK (bytes >= 0),
  cost_micros bigint NOT NULL DEFAULT 0 CHECK (cost_micros >= 0),
  billed     boolean NOT NULL DEFAULT false,
  duration_ms integer
);
CREATE INDEX usage_events_user_time ON usage_events (username, created_at DESC);
