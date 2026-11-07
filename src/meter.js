import { Transform } from "node:stream";
import { releaseTraffic, reserveTraffic } from "./store.js";

// billing: { pricePerGbMicros, allowQuota }. Prepaid GB are used first when allowed,
// then the USD wallet at pricePerGbMicros. With no price the wallet is never touched,
// which is the original prepaid-GB-only behaviour.
export function meter(username, shouldCharge, onExhausted, reservationBytes = 64 * 1024, billing = {}) {
  const pricePerGbMicros = billing.pricePerGbMicros ?? 0;
  const allowQuota = billing.allowQuota ?? true;
  // Unspent reserved bytes, split by where they came from so each part is returned
  // to the right place. Spending draws on prepaid GB first.
  let quotaBytes = 0;
  let walletBytes = 0;
  let released = false;

  async function releaseUnused() {
    if (released) return;
    released = true;
    const unused = { quotaBytes, walletBytes, pricePerGbMicros };
    quotaBytes = 0;
    walletBytes = 0;
    if (unused.quotaBytes > 0 || unused.walletBytes > 0) await releaseTraffic(username, unused);
  }

  function spend(bytes) {
    const fromQuota = Math.min(bytes, quotaBytes);
    quotaBytes -= fromQuota;
    walletBytes -= bytes - fromQuota;
  }

  return new Transform({
    transform(chunk, _encoding, callback) {
      if (!shouldCharge) return callback(null, chunk);
      void (async () => {
        if (quotaBytes + walletBytes < chunk.length) {
          const needed = Math.max(reservationBytes, chunk.length - (quotaBytes + walletBytes));
          const granted = await reserveTraffic(username, needed, { pricePerGbMicros, allowQuota });
          // The stream may have been destroyed while the durable reservation
          // was in flight. Return that reservation instead of leaking quota.
          if (released) {
            if (granted.bytes > 0) await releaseTraffic(username, { ...granted, pricePerGbMicros });
            callback(new Error("Traffic meter closed"));
            return;
          }
          quotaBytes += granted.quotaBytes;
          walletBytes += granted.walletBytes;
        }
        if (quotaBytes + walletBytes < chunk.length) {
          await releaseUnused();
          onExhausted?.();
          callback(new Error("Traffic quota exhausted"));
          return;
        }
        spend(chunk.length);
        callback(null, chunk);
      })().catch(callback);
    },
    flush(callback) {
      void releaseUnused().then(() => callback(), callback);
    },
    destroy(error, callback) {
      void releaseUnused().then(() => callback(error), (releaseError) => callback(error ?? releaseError));
    },
  });
}
