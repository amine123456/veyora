import { query, transaction } from "./db.js";

const UNIQUE_VIOLATION = "23505";
const MAX_SUBSCRIPTIONS_PER_CLIENT = 50;

// --- Catalog ---

export async function listFeeds({ vertical, status, country } = {}) {
  const conditions = [];
  const params = [];
  if (vertical) { params.push(vertical); conditions.push(`vertical = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (country) { params.push(country); conditions.push(`country = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT feed_id, site_domain, site_name, vertical, country, status, record_count,
            frequency, base_price_cents, currency, description, sample_fields
     FROM feed_catalog ${where}
     ORDER BY status ASC, record_count DESC`,
    params,
  );
  return rows;
}

export async function getFeed(feedId) {
  const { rows } = await query(
    `SELECT feed_id, site_domain, site_name, vertical, country, status, record_count,
            frequency, base_price_cents, currency, description, sample_fields,
            created_at, updated_at
     FROM feed_catalog WHERE feed_id = $1`,
    [feedId],
  );
  return rows[0] ?? null;
}

export async function upsertFeed(feedId, fields) {
  const { rows } = await query(
    `INSERT INTO feed_catalog (feed_id, site_domain, site_name, vertical, country, status,
       record_count, frequency, base_price_cents, currency, description, sample_fields)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (feed_id) DO UPDATE SET
       site_domain = EXCLUDED.site_domain, site_name = EXCLUDED.site_name,
       vertical = EXCLUDED.vertical, country = EXCLUDED.country, status = EXCLUDED.status,
       record_count = EXCLUDED.record_count, frequency = EXCLUDED.frequency,
       base_price_cents = EXCLUDED.base_price_cents, currency = EXCLUDED.currency,
       description = EXCLUDED.description, sample_fields = EXCLUDED.sample_fields,
       updated_at = now()
     RETURNING *`,
    [feedId, fields.site_domain, fields.site_name, fields.vertical, fields.country,
     fields.status ?? "active", fields.record_count ?? 0, fields.frequency ?? "daily",
     fields.base_price_cents ?? 20000, fields.currency ?? "eur",
     fields.description ?? "", fields.sample_fields ?? []],
  );
  return rows[0];
}

// Lightweight: just feed_id -> {site_domain, site_name, status} for the unlocker suggestion cache.
export async function feedCatalogMap() {
  const { rows } = await query(
    "SELECT feed_id, site_domain, site_name, status FROM feed_catalog WHERE status != 'disabled'",
  );
  const map = new Map();
  for (const row of rows) map.set(row.site_domain, { feedId: row.feed_id, feedName: row.site_name, status: row.status });
  return map;
}

// --- Subscriptions ---

export async function createSubscription(username, feedId, { frequency, deliveryMethod, priceCents, currency }) {
  return transaction(async (client) => {
    const { rows: existing } = await client.query(
      "SELECT count(*)::int AS cnt FROM feed_subscriptions WHERE username = $1 AND status != 'cancelled'",
      [username],
    );
    if (existing[0].cnt >= MAX_SUBSCRIPTIONS_PER_CLIENT) {
      throw Object.assign(new Error("Subscription limit reached"), { status: 400 });
    }
    await client.query(
      "DELETE FROM feed_subscriptions WHERE username = $1 AND feed_id = $2 AND status = 'cancelled'",
      [username, feedId],
    );
    try {
      const { rows } = await client.query(
        `INSERT INTO feed_subscriptions (username, feed_id, frequency, delivery_method, price_cents, currency)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [username, feedId, frequency, deliveryMethod, priceCents, currency ?? "eur"],
      );
      return rows[0];
    } catch (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw Object.assign(new Error("Already subscribed to this feed"), { status: 409 });
      }
      throw error;
    }
  });
}

export async function listSubscriptions(username) {
  const { rows } = await query(
    `SELECT s.*, f.site_name, f.site_domain, f.vertical, f.country, f.record_count,
            (SELECT row_to_json(d) FROM (
              SELECT dl.snapshot_date, dl.status, dl.record_count AS delivered_count,
                     dl.completed_at FROM delivery_logs dl
              WHERE dl.subscription_id = s.id ORDER BY dl.snapshot_date DESC LIMIT 1
            ) d) AS last_delivery,
            (SELECT row_to_json(dc) FROM (
              SELECT dc.method, dc.format, dc.sftp_host, dc.sftp_port, dc.sftp_username, dc.sftp_path,
                     dc.bucket, dc.bucket_region, dc.bucket_prefix, dc.access_key_id,
                     dc.snowflake_account, dc.snowflake_user, dc.snowflake_warehouse, dc.snowflake_database,
                     dc.snowflake_schema, dc.snowflake_table, dc.snowflake_role, dc.webhook_url,
                     dc.last_test_at, dc.last_test_ok, dc.last_test_error,
                     dc.sftp_password IS NOT NULL AS has_sftp_password,
                     dc.secret_access_key IS NOT NULL AS has_secret_access_key,
                     dc.snowflake_password IS NOT NULL AS has_snowflake_password,
                     dc.webhook_secret IS NOT NULL AS has_webhook_secret
              FROM delivery_configs dc WHERE dc.subscription_id = s.id
            ) dc) AS delivery_config
     FROM feed_subscriptions s
     JOIN feed_catalog f ON f.feed_id = s.feed_id
     WHERE s.username = $1 AND s.status != 'cancelled'
     ORDER BY s.created_at DESC`,
    [username],
  );
  return rows;
}

export async function listAllSubscriptions({ status, feedId } = {}) {
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`s.status = $${params.length}`); }
  if (feedId) { params.push(feedId); conditions.push(`s.feed_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT s.*, f.site_name, f.site_domain
     FROM feed_subscriptions s JOIN feed_catalog f ON f.feed_id = s.feed_id
     ${where} ORDER BY s.created_at DESC LIMIT 500`,
    params,
  );
  return rows;
}

export async function getSubscription(id, username) {
  const { rows } = await query(
    "SELECT * FROM feed_subscriptions WHERE id = $1 AND username = $2",
    [id, username],
  );
  return rows[0] ?? null;
}

export async function getSubscriptionAdmin(id) {
  const { rows } = await query("SELECT * FROM feed_subscriptions WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function updateSubscription(id, username, updates) {
  const sets = [];
  const params = [id, username];
  if (updates.status) { params.push(updates.status); sets.push(`status = $${params.length}`); }
  if (updates.frequency) { params.push(updates.frequency); sets.push(`frequency = $${params.length}`); }
  if (updates.deliveryMethod) { params.push(updates.deliveryMethod); sets.push(`delivery_method = $${params.length}`); }
  if (updates.status === "active" && !updates.skipStarted) sets.push("started_at = COALESCE(started_at, now())");
  if (updates.status === "cancelled") sets.push("cancelled_at = now()");
  sets.push("updated_at = now()");
  const { rows } = await query(
    `UPDATE feed_subscriptions SET ${sets.join(", ")} WHERE id = $1 AND username = $2 RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function activateSubscription(id) {
  const { rows } = await query(
    `UPDATE feed_subscriptions SET status = 'active', started_at = COALESCE(started_at, now()), updated_at = now()
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}

export async function cancelSubscription(id, username) {
  const { rows } = await query(
    `UPDATE feed_subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now()
     WHERE id = $1 AND username = $2 AND status != 'cancelled' RETURNING *`,
    [id, username],
  );
  return rows[0] ?? null;
}

// --- Delivery Configs ---

const DELIVERY_COLUMNS = [
  'method', 'format', 'sftp_host', 'sftp_port', 'sftp_username', 'sftp_password', 'sftp_path',
  'bucket', 'bucket_region', 'bucket_prefix', 'access_key_id', 'secret_access_key',
  'snowflake_account', 'snowflake_user', 'snowflake_password', 'snowflake_warehouse',
  'snowflake_database', 'snowflake_schema', 'snowflake_table', 'snowflake_role',
  'webhook_url', 'webhook_secret', 'notes',
];

// Replaces the whole row: columns a method does not use are cleared, and the last
// connection test result is reset because the settings it tested may have changed.
export async function setDeliveryConfig(subscriptionId, config) {
  const values = DELIVERY_COLUMNS.map((column) => (column === 'sftp_port' ? config.sftp_port ?? 22 : config[column] ?? null));
  if (!values[1]) values[1] = 'jsonl';
  const placeholders = DELIVERY_COLUMNS.map((_, i) => `$${i + 2}`).join(', ');
  const updates = DELIVERY_COLUMNS.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
  const { rows } = await query(
    `INSERT INTO delivery_configs (subscription_id, ${DELIVERY_COLUMNS.join(', ')})
     VALUES ($1, ${placeholders})
     ON CONFLICT (subscription_id) DO UPDATE SET ${updates},
       last_test_at = NULL, last_test_ok = NULL, last_test_error = NULL, updated_at = now()
     RETURNING *`,
    [subscriptionId, ...values],
  );
  return rows[0];
}

// Newest delivered snapshot of one customer's subscription that has a downloadable export.
export async function latestExport(subscriptionId, username) {
  const { rows } = await query(
    `SELECT dl.id, dl.feed_id, dl.snapshot_date, dl.format, dl.export_path, dl.record_count, dl.sha256
     FROM delivery_logs dl JOIN feed_subscriptions s ON s.id = dl.subscription_id
     WHERE dl.subscription_id = $1 AND s.username = $2 AND s.status IN ('active', 'paused')
       AND dl.status = 'delivered' AND dl.export_path IS NOT NULL
     ORDER BY dl.snapshot_date DESC, dl.completed_at DESC LIMIT 1`,
    [subscriptionId, username],
  );
  return rows[0] ?? null;
}

export async function deliveryExport(subscriptionId, logId) {
  const { rows } = await query(
    `SELECT dl.id, dl.feed_id, dl.snapshot_date, dl.format, dl.export_path, dl.sha256
     FROM delivery_logs dl JOIN feed_subscriptions s ON s.id = dl.subscription_id
     WHERE dl.id = $2 AND dl.subscription_id = $1 AND s.status IN ('active', 'paused')
       AND dl.status = 'delivered' AND dl.export_path IS NOT NULL`,
    [subscriptionId, logId],
  );
  return rows[0] ?? null;
}

export async function recordDeliveryTest(subscriptionId, { ok, error }) {
  await query(
    `UPDATE delivery_configs SET last_test_at = now(), last_test_ok = $2, last_test_error = $3
     WHERE subscription_id = $1`,
    [subscriptionId, ok, ok ? null : String(error ?? '').slice(0, 500)],
  );
}

export async function getDeliveryConfig(subscriptionId) {
  const { rows } = await query(
    "SELECT * FROM delivery_configs WHERE subscription_id = $1",
    [subscriptionId],
  );
  return rows[0] ?? null;
}

// --- Delivery Logs ---

export async function createDeliveryLog({ subscriptionId, feedId, snapshotDate, status, recordCount, fileSizeBytes, sha256 }) {
  const { rows } = await query(
    `INSERT INTO delivery_logs (subscription_id, feed_id, snapshot_date, status, record_count, file_size_bytes, sha256, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING *`,
    [subscriptionId, feedId, snapshotDate, status ?? "pending", recordCount ?? null, fileSizeBytes ?? null, sha256 ?? null],
  );
  return rows[0];
}

export async function updateDeliveryLog(id, { status, error, recordCount, fileSizeBytes, sha256 }) {
  const sets = [];
  const params = [id];
  if (status) { params.push(status); sets.push(`status = $${params.length}`); }
  if (status === "delivered" || status === "failed") sets.push("completed_at = now()");
  if (error !== undefined) { params.push(error); sets.push(`error = $${params.length}`); }
  if (recordCount !== undefined) { params.push(recordCount); sets.push(`record_count = $${params.length}`); }
  if (fileSizeBytes !== undefined) { params.push(fileSizeBytes); sets.push(`file_size_bytes = $${params.length}`); }
  if (sha256 !== undefined) { params.push(sha256); sets.push(`sha256 = $${params.length}`); }
  const { rows } = await query(
    `UPDATE delivery_logs SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function getDeliveryLogs(subscriptionId, { limit = 30 } = {}) {
  const { rows } = await query(
    `SELECT * FROM delivery_logs WHERE subscription_id = $1 ORDER BY snapshot_date DESC LIMIT $2`,
    [subscriptionId, limit],
  );
  return rows;
}

export async function getActiveDeliveries(feedId) {
  const { rows } = await query(
    `SELECT s.id AS subscription_id, s.username, s.frequency, s.delivery_method,
            dc.method, dc.sftp_host, dc.sftp_port, dc.sftp_username, dc.sftp_password, dc.sftp_path,
            dc.webhook_url, dc.webhook_secret, dc.notes
     FROM feed_subscriptions s
     LEFT JOIN delivery_configs dc ON dc.subscription_id = s.id
     WHERE s.feed_id = $1 AND s.status = 'active'`,
    [feedId],
  );
  return rows;
}

export async function hasDeliveryForDate(subscriptionId, snapshotDate) {
  const { rows } = await query(
    "SELECT 1 FROM delivery_logs WHERE subscription_id = $1 AND snapshot_date = $2 AND status = 'delivered' LIMIT 1",
    [subscriptionId, snapshotDate],
  );
  return rows.length > 0;
}

// --- Stripe Integration ---

export async function getStripeCustomerId(username) {
  const { rows } = await query("SELECT stripe_customer_id FROM clients WHERE username = $1", [username]);
  return rows[0]?.stripe_customer_id ?? null;
}

export async function setStripeCustomerId(username, customerId) {
  await query("UPDATE clients SET stripe_customer_id = $1 WHERE username = $2", [customerId, username]);
}

export async function getOrCreateStripeProduct(feedId, frequency) {
  const { rows } = await query(
    "SELECT product_id, price_id, price_cents, currency FROM stripe_products WHERE feed_id = $1 AND frequency = $2",
    [feedId, frequency],
  );
  return rows[0] ?? null;
}

export async function saveStripeProduct(feedId, frequency, { productId, priceId, priceCents, currency }) {
  await query(
    `INSERT INTO stripe_products (feed_id, frequency, product_id, price_id, price_cents, currency)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (feed_id, frequency) DO UPDATE SET
       product_id = EXCLUDED.product_id, price_id = EXCLUDED.price_id,
       price_cents = EXCLUDED.price_cents, currency = EXCLUDED.currency`,
    [feedId, frequency, productId, priceId, priceCents, currency ?? "eur"],
  );
}

export async function linkStripeSubscription(id, { stripeSubscriptionId, stripePriceId }) {
  await query(
    `UPDATE feed_subscriptions SET stripe_subscription_id = $2, stripe_price_id = $3, updated_at = now()
     WHERE id = $1`,
    [id, stripeSubscriptionId, stripePriceId],
  );
}

export async function activateByStripeSubscription(stripeSubscriptionId) {
  const { rows } = await query(
    `UPDATE feed_subscriptions SET status = 'active', started_at = COALESCE(started_at, now()), updated_at = now()
     WHERE stripe_subscription_id = $1 AND status = 'pending' RETURNING *`,
    [stripeSubscriptionId],
  );
  return rows[0] ?? null;
}

export async function pauseByStripeSubscription(stripeSubscriptionId) {
  const { rows } = await query(
    `UPDATE feed_subscriptions SET status = 'paused', updated_at = now()
     WHERE stripe_subscription_id = $1 AND status = 'active' RETURNING *`,
    [stripeSubscriptionId],
  );
  return rows[0] ?? null;
}

export async function cancelByStripeSubscription(stripeSubscriptionId) {
  const { rows } = await query(
    `UPDATE feed_subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now()
     WHERE stripe_subscription_id = $1 AND status != 'cancelled' RETURNING *`,
    [stripeSubscriptionId],
  );
  return rows[0] ?? null;
}

export async function reactivateByStripeSubscription(stripeSubscriptionId) {
  const { rows } = await query(
    `UPDATE feed_subscriptions SET status = 'active', updated_at = now()
     WHERE stripe_subscription_id = $1 AND status = 'paused' RETURNING *`,
    [stripeSubscriptionId],
  );
  return rows[0] ?? null;
}

export async function updatePeriodEnd(stripeSubscriptionId, periodEnd) {
  await query(
    `UPDATE feed_subscriptions SET current_period_end = $2, updated_at = now()
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId, periodEnd],
  );
}

export async function findSubscriptionByStripe(stripeSubscriptionId) {
  const { rows } = await query(
    "SELECT * FROM feed_subscriptions WHERE stripe_subscription_id = $1",
    [stripeSubscriptionId],
  );
  return rows[0] ?? null;
}

export async function recordStripeEvent(eventId, eventType) {
  try {
    await query("INSERT INTO stripe_events (event_id, event_type) VALUES ($1, $2)", [eventId, eventType]);
    return true;
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) return false;
    throw error;
  }
}
