import { Transform } from "node:stream";
import { releaseUsage, reserveUsage } from "./store.js";

export function meter(username, shouldCharge, onExhausted, reservationBytes = 64 * 1024) {
  let reserved = 0;
  let released = false;

  async function releaseUnused() {
    if (released) return;
    released = true;
    const unused = reserved;
    reserved = 0;
    if (unused > 0) await releaseUsage(username, unused);
  }

  return new Transform({
    transform(chunk, _encoding, callback) {
      if (!shouldCharge) return callback(null, chunk);
      void (async () => {
        if (reserved < chunk.length) {
          const needed = Math.max(reservationBytes, chunk.length - reserved);
          const granted = await reserveUsage(username, needed);
          // The stream may have been destroyed while the durable reservation
          // was in flight. Return that reservation instead of leaking quota.
          if (released) {
            if (granted > 0) await releaseUsage(username, granted);
            callback(new Error("Traffic meter closed"));
            return;
          }
          reserved += granted;
        }
        if (reserved < chunk.length) {
          await releaseUnused();
          onExhausted?.();
          callback(new Error("Traffic quota exhausted"));
          return;
        }
        reserved -= chunk.length;
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
