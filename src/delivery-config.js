// Validates a customer's delivery settings. Returns the row to store, with secrets still in
// plaintext under SECRET_FIELDS: the caller seals them (src/secret-box.js) before saving.
// Hosts the customer controls (SFTP, webhook) must resolve to public addresses; S3, GCS and
// Snowflake endpoints are built from strictly validated names on the providers' own domains.

export const DELIVERY_METHODS = ['sftp', 's3', 'gcs', 'snowflake', 'webhook', 'api'];
export const DELIVERY_FORMATS = ['jsonl', 'json', 'csv', 'parquet'];
export const SECRET_FIELDS = ['sftp_password', 'secret_access_key', 'snowflake_password', 'webhook_secret'];

export class DeliveryConfigError extends Error {}

const fail = (message) => { throw new DeliveryConfigError(message); };
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const IDENT = /^[A-Za-z_][A-Za-z0-9_$]{0,254}$/;

function pathPrefix(value) {
  const prefix = text(value, 512).replace(/^\/+/, '');
  if (prefix.split('/').some((part) => part === '..')) fail('The folder path cannot contain ..');
  if (/[\u0000-\u001f\\]/.test(prefix)) fail('The folder path contains characters that are not allowed');
  return prefix;
}

function identifier(value, label, { required = true } = {}) {
  const name = text(value, 255);
  if (!name) { if (required) fail(`${label} is required`); return null; }
  if (!IDENT.test(name)) fail(`${label} must be a plain Snowflake identifier (letters, digits, _ and $)`);
  return name;
}

export async function validateDeliveryInput(input, { assertPublicHost }) {
  const method = text(input?.method, 20).toLowerCase();
  if (!DELIVERY_METHODS.includes(method)) fail(`Choose a delivery method: ${DELIVERY_METHODS.join(', ')}`);
  const format = text(input?.format || 'jsonl', 10).toLowerCase();
  if (!DELIVERY_FORMATS.includes(format)) fail(`Choose a file format: ${DELIVERY_FORMATS.join(', ')}`);
  const cfg = { method, format };

  if (method === 'sftp') {
    cfg.sftp_host = text(input.sftp_host, 255);
    cfg.sftp_username = text(input.sftp_username, 128);
    if (!cfg.sftp_host || !cfg.sftp_username) fail('SFTP host and username are required');
    if (!/^[A-Za-z0-9.-]+$/.test(cfg.sftp_host)) fail('SFTP host must be a hostname or IP address');
    await assertPublicHost(cfg.sftp_host);
    cfg.sftp_port = Math.max(1, Math.min(65535, Number.parseInt(input.sftp_port, 10) || 22));
    cfg.sftp_password = String(input.sftp_password ?? '').slice(0, 256);
    cfg.sftp_path = '/' + pathPrefix(input.sftp_path || '/');
  } else if (method === 's3' || method === 'gcs') {
    cfg.bucket = text(input.bucket, 63).toLowerCase();
    const bucketRule = method === 's3' ? /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/ : /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;
    if (!bucketRule.test(cfg.bucket) || cfg.bucket.includes('..')) fail('Enter a valid bucket name (lowercase letters, digits, dots and dashes)');
    if (method === 's3') {
      cfg.bucket_region = text(input.bucket_region || 'us-east-1', 32).toLowerCase();
      if (!/^[a-z]{2}(-[a-z]+)+-\d{1,2}$/.test(cfg.bucket_region)) fail('Enter an AWS region such as eu-west-1');
    }
    cfg.bucket_prefix = pathPrefix(input.bucket_prefix);
    cfg.access_key_id = text(input.access_key_id, 128);
    if (!/^[A-Za-z0-9]{16,128}$/.test(cfg.access_key_id)) fail(method === 's3' ? 'Enter your AWS access key ID' : 'Enter your HMAC access ID');
    cfg.secret_access_key = String(input.secret_access_key ?? '').trim().slice(0, 256);
  } else if (method === 'snowflake') {
    cfg.snowflake_account = text(input.snowflake_account, 100);
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{1,98}[A-Za-z0-9]$/.test(cfg.snowflake_account)) fail('Enter your Snowflake account identifier, such as myorg-myaccount');
    cfg.snowflake_user = text(input.snowflake_user, 255);
    if (!cfg.snowflake_user) fail('Snowflake user is required');
    cfg.snowflake_password = String(input.snowflake_password ?? '').slice(0, 256);
    cfg.snowflake_warehouse = identifier(input.snowflake_warehouse, 'Warehouse');
    cfg.snowflake_database = identifier(input.snowflake_database, 'Database');
    cfg.snowflake_schema = identifier(input.snowflake_schema || 'PUBLIC', 'Schema');
    cfg.snowflake_table = identifier(input.snowflake_table, 'Table');
    cfg.snowflake_role = identifier(input.snowflake_role, 'Role', { required: false });
  } else if (method === 'webhook') {
    const url = text(input.webhook_url, 512);
    let parsed;
    try { parsed = new URL(url); } catch { fail('Enter a valid webhook URL'); }
    if (parsed.protocol !== 'https:') fail('The webhook URL must use HTTPS');
    if (parsed.username || parsed.password) fail('The webhook URL must not contain credentials');
    await assertPublicHost(parsed.hostname);
    cfg.webhook_url = parsed.toString();
    cfg.webhook_secret = String(input.webhook_secret ?? '').trim().slice(0, 256);
  }
  return cfg;
}

// A secret left blank while editing the same method keeps the one already saved.
export function keepSavedSecrets(cfg, saved) {
  const out = { ...cfg };
  for (const field of SECRET_FIELDS) {
    if (!(field in out)) continue;
    if (!out[field]) out[field] = saved && saved.method === cfg.method ? saved[field] ?? null : null;
    else out[`${field}__new`] = true;
  }
  return out;
}

export function missingSecret(cfg) {
  if (cfg.method === 's3' || cfg.method === 'gcs') return cfg.secret_access_key ? null : 'Enter the secret key for this bucket';
  if (cfg.method === 'snowflake') return cfg.snowflake_password ? null : 'Enter the Snowflake password';
  return null;
}
