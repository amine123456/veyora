// Delivery setup for one feed subscription (/account/feeds/delivery?sub=<id>).
// auth.js fills it from /api/subscriptions, saves to /delivery-config and runs /delivery-test.

const METHODS = [
  { id: 'sftp', icon: 'router', title: 'SFTP', text: 'Upload each file to your SFTP server.' },
  { id: 's3', icon: 'database', title: 'Amazon S3', text: 'Write each file to your S3 bucket.' },
  { id: 'gcs', icon: 'database', title: 'Google Cloud Storage', text: 'Write to a GCS bucket with an HMAC key.' },
  { id: 'snowflake', icon: 'layers', title: 'Snowflake', text: 'Load every record into a table.' },
  { id: 'webhook', icon: 'link', title: 'Webhook', text: 'Get a signed POST with a download link.' },
  { id: 'api', icon: 'api', title: 'API pull', text: 'Download the latest file whenever you want.' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">
        {label} {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

function Secret({ name, label, saved }: { name: string; label: string; saved: string }) {
  return (
    <Field label={label}>
      <input type="password" name={name} maxLength={256} autoComplete="new-password" data-secret={saved} />
    </Field>
  );
}

export function DeliveryFormSection() {
  return (
    <>
      <p className="notice notice--err" data-delivery-missing="" role="alert" hidden>
        <svg className="ic" aria-hidden="true">
          <use href="#i-alert" />
        </svg>
        <span>
          We couldn&rsquo;t find that subscription. <a href="/account/feeds">Back to your feeds</a> and pick one to configure.
        </span>
      </p>
      <section className="card delivery-panel" id="delivery" aria-labelledby="delivery-title" data-delivery-panel="">
        <header className="card__head">
          <span className="chip-ic chip-ic--accent">
            <svg className="ic" aria-hidden="true">
              <use href="#i-database" />
            </svg>
          </span>{' '}
          <div>
            <h2 id="delivery-title">
              Where should we send <span data-delivery-feed-name="">this feed</span>?
            </h2>
            <p>
              Pick a method, fill in its details and save. Every new snapshot then goes there automatically, and each
              delivery appears in your <a href="/account/feeds/deliveries">delivery history</a>.
            </p>
          </div>
        </header>
        <p className="delivery-current" data-delivery-current="" hidden />

        <form className="delivery-form" data-delivery-form="" noValidate>
          <input type="hidden" name="subscription_id" />
          <fieldset className="dmethods">
            <legend className="field__label">Delivery method</legend>
            <div className="dmethods__grid">
              {METHODS.map((m, i) => (
                <label className="dmethod" key={m.id}>
                  <input type="radio" name="method" value={m.id} defaultChecked={i === 0} />
                  <span className="dmethod__ic" aria-hidden="true">
                    <svg className="ic">
                      <use href={`#i-${m.icon}`} />
                    </svg>
                  </span>
                  <b>{m.title}</b>
                  <span>{m.text}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="dformat" data-format-row="">
            <Field label="File format">
              <select name="format" defaultValue="jsonl">
                <option value="jsonl">JSON Lines (.jsonl): one record per line</option>
                <option value="json">JSON (.json): one array</option>
                <option value="csv">CSV (.csv): nested values as JSON text</option>
                <option value="parquet">Parquet (.parquet): typed columns</option>
              </select>
            </Field>
          </div>
          <p className="dnote" data-format-snowflake="" hidden>
            Snowflake loads each record as a row in your table, so no file format applies.
          </p>

          <div className="dfields" data-method-fields="sftp">
            <Field label="Host">
              <input type="text" name="sftp_host" maxLength={255} autoComplete="off" spellCheck={false} placeholder="sftp.example.com" />
            </Field>
            <Field label="Port">
              <input type="number" name="sftp_port" defaultValue={22} min={1} max={65535} />
            </Field>
            <Field label="Username">
              <input type="text" name="sftp_username" maxLength={128} autoComplete="off" spellCheck={false} />
            </Field>
            <Secret name="sftp_password" label="Password" saved="has_sftp_password" />
            <Field label="Folder" hint="created if missing">
              <input type="text" name="sftp_path" maxLength={512} autoComplete="off" spellCheck={false} placeholder="/incoming/veyora" />
            </Field>
          </div>

          <div className="dfields" data-method-fields="s3" hidden>
            <Field label="Bucket">
              <input type="text" name="bucket" maxLength={63} autoComplete="off" spellCheck={false} placeholder="acme-data" />
            </Field>
            <Field label="Region">
              <input type="text" name="bucket_region" maxLength={32} autoComplete="off" spellCheck={false} placeholder="eu-west-1" />
            </Field>
            <Field label="Folder" hint="optional prefix">
              <input type="text" name="bucket_prefix" maxLength={512} autoComplete="off" spellCheck={false} placeholder="veyora/feeds" />
            </Field>
            <Field label="Access key ID">
              <input type="text" name="access_key_id" maxLength={128} autoComplete="off" spellCheck={false} placeholder="AKIA…" />
            </Field>
            <Secret name="secret_access_key" label="Secret access key" saved="has_secret_access_key" />
            <p className="dnote">
              Use a key that can only <code>s3:PutObject</code> (and <code>s3:DeleteObject</code> for the connection test) on this bucket.
            </p>
          </div>

          <div className="dfields" data-method-fields="gcs" hidden>
            <Field label="Bucket">
              <input type="text" name="bucket" maxLength={63} autoComplete="off" spellCheck={false} placeholder="acme-data" />
            </Field>
            <Field label="Folder" hint="optional prefix">
              <input type="text" name="bucket_prefix" maxLength={512} autoComplete="off" spellCheck={false} placeholder="veyora/feeds" />
            </Field>
            <Field label="HMAC access ID">
              <input type="text" name="access_key_id" maxLength={128} autoComplete="off" spellCheck={false} placeholder="GOOG1E…" />
            </Field>
            <Secret name="secret_access_key" label="HMAC secret" saved="has_secret_access_key" />
            <p className="dnote">
              Create an HMAC key in Cloud Storage → Settings → Interoperability, for a service account with Storage Object Creator on this bucket.
            </p>
          </div>

          <div className="dfields" data-method-fields="snowflake" hidden>
            <Field label="Account identifier">
              <input type="text" name="snowflake_account" maxLength={100} autoComplete="off" spellCheck={false} placeholder="myorg-myaccount" />
            </Field>
            <Field label="User">
              <input type="text" name="snowflake_user" maxLength={255} autoComplete="off" spellCheck={false} />
            </Field>
            <Secret name="snowflake_password" label="Password" saved="has_snowflake_password" />
            <Field label="Warehouse">
              <input type="text" name="snowflake_warehouse" maxLength={255} autoComplete="off" spellCheck={false} placeholder="COMPUTE_WH" />
            </Field>
            <Field label="Database">
              <input type="text" name="snowflake_database" maxLength={255} autoComplete="off" spellCheck={false} placeholder="RAW" />
            </Field>
            <Field label="Schema">
              <input type="text" name="snowflake_schema" maxLength={255} autoComplete="off" spellCheck={false} placeholder="PUBLIC" />
            </Field>
            <Field label="Table" hint="created if missing">
              <input type="text" name="snowflake_table" maxLength={255} autoComplete="off" spellCheck={false} placeholder="VEYORA_CARS" />
            </Field>
            <Field label="Role" hint="optional">
              <input type="text" name="snowflake_role" maxLength={255} autoComplete="off" spellCheck={false} />
            </Field>
            <p className="dnote">
              Rows land as <code>record VARIANT, feed_id, snapshot_date, loaded_at</code>. The user needs USAGE on the warehouse and
              CREATE TABLE (or INSERT) in the schema.
            </p>
          </div>

          <div className="dfields" data-method-fields="webhook" hidden>
            <Field label="Webhook URL" hint="HTTPS">
              <input type="url" name="webhook_url" maxLength={512} autoComplete="off" spellCheck={false} placeholder="https://api.example.com/veyora" />
            </Field>
            <Secret name="webhook_secret" label="Signing secret" saved="has_webhook_secret" />
            <p className="dnote">
              On each delivery we POST JSON with <code>feed</code>, <code>snapshot_date</code>, <code>records</code>,{' '}
              <code>sha256</code> and a <code>download_url</code> valid for 7 days. With a secret, the{' '}
              <code>X-Veyora-Signature: t=…,v1=…</code> header is HMAC-SHA256 of <code>t + &quot;.&quot; + body</code>.
            </p>
          </div>

          <div className="dfields" data-method-fields="api" hidden>
            <p className="dnote">
              After each delivery the file is ready at the address below for 7 days. Use any of your{' '}
              <a href="/account/api-keys">API keys</a>.
            </p>
            <div className="code">
              <span className="code__bar">
                <i />
                <i />
                <i />
                <em>Download the latest snapshot</em>
              </span>
              <pre>
                <code data-field="api-curl">…</code>
              </pre>
              <button className="copy copy--dark" type="button" data-copy="api-curl">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-copy" />
                </svg>
                <span className="lbl">Copy</span>
              </button>
            </div>
          </div>

          <div className="dactions">
            <button className="btn btn--primary" type="submit" data-delivery-save="">
              <span className="lbl">Save delivery settings</span>
            </button>
            <button className="btn btn--secondary" type="button" data-delivery-test="" disabled>
              <svg className="ic" aria-hidden="true">
                <use href="#i-refresh" />
              </svg>
              <span className="lbl">Test connection</span>
            </button>
          </div>
        </form>
        <p className="notice notice--ok" data-delivery-ok="" hidden role="status">
          <svg className="ic" aria-hidden="true">
            <use href="#i-ok" />
          </svg>
          <span>
            Delivery settings saved. Run <b>Test connection</b> to check them, or <a href="/account/feeds">go back to your feeds</a>.
          </span>
        </p>
        <p className="notice notice--ok" data-test-ok="" hidden role="status">
          <svg className="ic" aria-hidden="true">
            <use href="#i-ok" />
          </svg>
          <span data-test-ok-text="">Connection works.</span>
        </p>
        <p className="notice notice--err form__error" data-delivery-error="" role="alert" hidden />
      </section>
    </>
  );
}
