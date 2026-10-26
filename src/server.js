import { createAdminServer } from './admin-api.js';
import { adminConfig, gatewayConfig, paymentConfig } from './config.js';
import { createGateway } from './gateway.js';
import { createPaymentServer } from './payments.js';

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
  const gateway = gatewayConfig();
  const payments = paymentConfig();
  const proxyServer = await createGateway(gateway);
  const paymentServer = createPaymentServer(payments);
  const admin = adminConfig();
  const adminServer = admin.token ? createAdminServer(admin) : null;
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
  if (!payments.stripeKey) console.log('Stripe disabled: configure STRIPE_SECRET_KEY to enable checkout');
  startupComplete = true;
}

main().catch((error) => {
  console.error(`Startup failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
