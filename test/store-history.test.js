import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('processed payment history is bounded without losing credited quota', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-store-history-'));
  const dataFile = path.join(directory, 'state.json');
  process.env.DATA_FILE = dataFile;
  process.env.PROCESSED_PAYMENT_HISTORY_LIMIT = '2';

  try {
    const store = await import(`../src/store.js?history=${Date.now()}`);
    const username = 'history-test';
    await store.createClient(username, 'history test password', 10);

    for (let index = 0; index < 3; index += 1) {
      const sessionId = `cs_history_${index}`;
      const pending = await store.createPendingPayment(username, {
        id: 'one-gb', bytes: 100, cents: 200, currency: 'usd',
      });
      const purchaseId = pending.purchaseId;
      await store.bindPaymentSession(purchaseId, sessionId);
      await store.completePayment({
        eventId: `evt_history_${index}`,
        purchaseId,
        sessionId,
        amountTotal: 200,
        currency: 'usd',
      });
      await new Promise((resolve) => setTimeout(resolve, 2));
    }

    const state = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.deepEqual(Object.keys(state.processedPayments).sort(), ['evt_history_1', 'evt_history_2']);
    assert.equal(state.clients[username].quotaBytes, 310);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
