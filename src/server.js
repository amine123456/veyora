import { createAdminServer } from './admin-api.js';
import { adminConfig, gatewayConfig, paymentConfig, pricingConfig, unlockerConfig } from './config.js';
import { createGateway } from './gateway.js';
import { createPaymentServer } from './payments.js';
import { createShutdown } from './shutdown.js';
import { migrate } from './db.js';
import { drain } from './store.js';
import { browserAvailable, fetchWithBrowser, fetchWithCamoufox } from './browser-fetcher.js';
import { camoufoxAvailable } from './camoufox-launcher.js';
import { createUnlocker } from './unlocker.js';

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      resolve();
    });
  });
}

function close(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve) => server.close(() => resolve()));
}

async function main() {
  const migrations = await migrate();
  if (migrations.length) console.log(`Database migrated: ${migrations.join(', ')}`);
  const gateway = gatewayConfig();
  const payments = paymentConfig();
  const pricing = pricingConfig();
  const proxyServer = await createGateway(gateway, { pricing });
  const unlockerSettings = unlockerConfig();
  const hasBrowser = await browserAvailable();
  const hasCamoufox = await camoufoxAvailable();
  const unlocker = unlockerSettings.enabled
    ? createUnlocker({
        gateway, pricing, config: unlockerSettings,
        browserFetchImpl: hasBrowser ? fetchWithBrowser : null,
        camoufoxFetchImpl: hasCamoufox ? fetchWithCamoufox : null,
      })
    : null;
  await unlocker?.ledger.load();
  const paymentServer = createPaymentServer(payments, { unlocker, pricing, mobile: Boolean(gateway.upstreamMobile) });
  const admin = adminConfig();
  const adminServer = admin.token ? createAdminServer(admin, { unlocker }) : null;
  let startupComplete = false;

  proxyServer.on('error', (error) => {
    if (startupComplete) console.error(`Proxy gateway error: ${error.message}`);
  });
  paymentServer.on('error', (error) => {
    if (startupComplete) console.error(`Payment API error: ${error.message}`);
  });

  try {
    await listen(proxyServer, gateway.port, gateway.host);
    await listen(paymentServer, payments.port, payments.host);
    // Loopback only: the admin API is for the CLI on this machine, never the internet.
    if (adminServer) await listen(adminServer, admin.port, '127.0.0.1');
  } catch (error) {
    await Promise.all([close(proxyServer), close(paymentServer), close(adminServer)]);
    throw error;
  }

  const proxyScheme = gateway.tlsCertFile ? 'https' : 'http';
  console.log(`Proxy gateway listening on ${proxyScheme}://${gateway.host}:${gateway.port}`);
  console.log(`Payment API listening on http://${payments.host}:${payments.port}`);
  console.log(adminServer ? `Admin API listening on http://127.0.0.1:${admin.port}` : 'Admin API disabled: set ADMIN_TOKEN to top up accounts while running');
  console.log(unlocker ? 'Web Unlocker enabled at POST /v1/unlock' : 'Web Unlocker disabled (UNLOCKER_ENABLED=false)');
  if (unlocker && hasBrowser) console.log('Browser fetcher enabled: blocked sites will escalate to Chromium');
  else if (unlocker) console.log('Browser fetcher not available: install patchright or playwright for browser escalation');
  if (!payments.stripeKey) console.log('Stripe disabled: configure STRIPE_SECRET_KEY to enable checkout');
  startupComplete = true;

  // systemd stops the service with SIGTERM: stop listening, let in-flight unlocks and
  // database writes finish (at most 10 s), write the ledger snapshot, then exit.
  const stop = createShutdown({ servers: [proxyServer, paymentServer, adminServer], unlocker, drainStore: drain });
  const shutdown = () => {
    console.log('Shutting down: waiting for in-flight requests and store writes');
    void stop().finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error) => {
  console.error(`Startup failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
