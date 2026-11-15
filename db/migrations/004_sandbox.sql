-- Sandbox: free test requests. Simulated scenarios cost nothing; live fetches made with a
-- sandbox key are capped per account per UTC day and counted here.
CREATE TABLE sandbox_usage (
  username      text NOT NULL REFERENCES clients (username) ON DELETE CASCADE,
  day           date NOT NULL,
  live_requests integer NOT NULL DEFAULT 0 CHECK (live_requests >= 0),
  PRIMARY KEY (username, day)
);
CREATE INDEX sandbox_usage_day_idx ON sandbox_usage (day);

ALTER TABLE usage_events DROP CONSTRAINT usage_events_kind_check;
ALTER TABLE usage_events ADD CONSTRAINT usage_events_kind_check CHECK (kind IN ('proxy', 'unlocker', 'sandbox'));
