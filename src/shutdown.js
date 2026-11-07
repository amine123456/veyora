// Graceful stop for SIGTERM/SIGINT (systemctl restart/stop):
//   1. stop accepting connections on every listener;
//   2. wait, up to timeoutMs, for in-flight unlock requests to settle their wallet holds
//      and for the store's mutation queue to drain;
//   3. write the ledger snapshot.
// The caller exits afterwards. Hitting the deadline is logged, never fatal: whatever the
// store already fsynced is safe, and the journal replays it on the next start.
export function createShutdown({ servers = [], unlocker = null, drainStore, timeoutMs = 10_000, log = console }) {
  let running = null;

  async function run() {
    for (const server of servers) {
      if (!server?.listening) continue;
      server.close();
      server.closeIdleConnections?.();
    }

    let timer;
    const deadline = new Promise((resolve) => {
      // Not unref'd: once the listeners close this timer may be all that keeps the
      // process alive until the ledger snapshot is written.
      timer = setTimeout(() => resolve("timeout"), timeoutMs);
    });
    const settled = (async () => {
      await unlocker?.stop();
      await drainStore();
      return "drained";
    })();
    const result = await Promise.race([settled, deadline]);
    clearTimeout(timer);
    if (result === "timeout") log.warn?.(`Shutdown: requests or store writes still pending after ${timeoutMs} ms; exiting anyway`);

    if (unlocker) {
      try {
        await unlocker.ledger.close();
      } catch (error) {
        log.error?.(`Ledger snapshot on shutdown failed: ${error.message}`);
      }
    }
    return result;
  }

  return () => {
    running ??= run();
    return running;
  };
}
