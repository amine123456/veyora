-- Deliveries made outside Veyora (for example an existing SFTP push run by a crawl job) can be
-- recorded on a subscription so they show in the customer's history. 'external' rows never
-- count as Veyora's own delivery for the day, so they cannot block or replace one.
ALTER TABLE delivery_logs
  ADD COLUMN source text NOT NULL DEFAULT 'veyora' CHECK (source IN ('veyora', 'external'));
