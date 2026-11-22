-- Delivery methods beyond SFTP: S3, Google Cloud Storage (S3-compatible HMAC keys), Snowflake,
-- signed webhooks and API pull, plus a file format per subscription. Secret columns hold
-- AES-256-GCM ciphertext ("v1:..."), written by src/secret-box.js; plaintext never reaches them.

ALTER TABLE feed_subscriptions DROP CONSTRAINT feed_subscriptions_delivery_method_check;
ALTER TABLE feed_subscriptions ADD CONSTRAINT feed_subscriptions_delivery_method_check
  CHECK (delivery_method IN ('sftp','s3','gcs','snowflake','webhook','api','manual'));

ALTER TABLE delivery_configs DROP CONSTRAINT delivery_configs_method_check;
ALTER TABLE delivery_configs ADD CONSTRAINT delivery_configs_method_check
  CHECK (method IN ('sftp','s3','gcs','snowflake','webhook','api','manual'));

ALTER TABLE delivery_configs
  ADD COLUMN format text NOT NULL DEFAULT 'jsonl' CHECK (format IN ('jsonl','json','csv','parquet')),
  ADD COLUMN bucket text,
  ADD COLUMN bucket_region text,
  ADD COLUMN bucket_prefix text,
  ADD COLUMN access_key_id text,
  ADD COLUMN secret_access_key text,
  ADD COLUMN snowflake_user text,
  ADD COLUMN snowflake_password text,
  ADD COLUMN snowflake_role text,
  ADD COLUMN snowflake_table text,
  ADD COLUMN last_test_at timestamptz,
  ADD COLUMN last_test_ok boolean,
  ADD COLUMN last_test_error text;

ALTER TABLE delivery_logs
  ADD COLUMN format text,
  ADD COLUMN export_path text,
  ADD COLUMN delivered_to text;
