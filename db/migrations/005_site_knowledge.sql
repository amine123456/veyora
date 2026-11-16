-- Persistent site knowledge: what the unlocker has learned about each domain.
-- Survives restarts and feeds back into the escalation ladder so hard sites
-- start where they last succeeded instead of re-climbing from scratch.

CREATE TABLE IF NOT EXISTS site_knowledge (
  site            TEXT PRIMARY KEY,         -- normalized hostname (no www.)
  waf             TEXT,                     -- detected WAF: cloudflare, akamai, datadome, aws, imperva, perimeterx
  best_rung       INTEGER,                  -- ladder step index that most often succeeds
  best_pool       TEXT,                     -- pool name of best_rung (residential, mobile)
  best_country    TEXT,                     -- exit country that works (null = any)
  solver_needed   BOOLEAN DEFAULT FALSE,    -- solver rung was needed at least once
  success_count   INTEGER DEFAULT 0,
  fail_count      INTEGER DEFAULT 0,
  avg_ms          INTEGER,                  -- running average of successful request time
  last_success_at TIMESTAMPTZ,
  last_fail_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
