-- Stripe Subscriptions for Data Feeds: customer links, subscription tracking, product cache, event idempotency.

ALTER TABLE clients ADD COLUMN stripe_customer_id text;
CREATE UNIQUE INDEX clients_stripe_customer
  ON clients (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE feed_subscriptions
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN stripe_price_id text,
  ADD COLUMN current_period_end timestamptz;
CREATE UNIQUE INDEX feed_subs_stripe_sub
  ON feed_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE stripe_products (
  feed_id    text NOT NULL REFERENCES feed_catalog (feed_id),
  frequency  text NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  product_id text NOT NULL,
  price_id   text NOT NULL,
  price_cents integer NOT NULL,
  currency   text NOT NULL DEFAULT 'eur',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feed_id, frequency)
);

CREATE TABLE stripe_events (
  event_id     text PRIMARY KEY,
  event_type   text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
