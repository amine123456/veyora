import crypto from 'node:crypto';

const API_BASE = { live: 'https://api.nowpayments.io', sandbox: 'https://api-sandbox.nowpayments.io' };
const INVOICE_HOSTS = { live: 'nowpayments.io', sandbox: 'sandbox.nowpayments.io' };

// NOWPayments signs the IPN body as JSON with keys in alphabetical order. Sort at
// every level so nested objects verify too, then compare in constant time.
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep(value[key])]));
  }
  return value;
}

export function signIpn(body, secret) {
  return crypto.createHmac('sha512', secret).update(JSON.stringify(sortKeysDeep(body))).digest('hex');
}

export function validIpnSignature(body, signature, secret) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{128}$/i.test(signature) || !secret) return false;
  const expected = Buffer.from(signIpn(body, secret), 'hex');
  return crypto.timingSafeEqual(expected, Buffer.from(signature.toLowerCase(), 'hex'));
}

const digits = (value) => (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
  || (typeof value === 'string' && /^[0-9]{1,20}$/.test(value));

// Turns a verified IPN body into the fields the store needs to credit a purchase.
// Returns null for anything that is not a fully paid invoice payment.
export function finishedPayment(body) {
  if (body?.payment_status !== 'finished') return null;
  if (!digits(body.payment_id) || !digits(body.invoice_id)) return null;
  if (typeof body.order_id !== 'string' || typeof body.price_currency !== 'string') return null;
  const price = Number(body.price_amount);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    eventId: `nppay_${body.payment_id}`,
    sessionId: `npinv_${body.invoice_id}`,
    purchaseId: body.order_id,
    amountTotal: Math.round(price * 100),
    currency: body.price_currency.toLowerCase(),
  };
}

export async function createInvoice(settings, { purchaseId, pkg, ipnUrl, successUrl, cancelUrl }, { fetchImpl, timeoutMs }) {
  const mode = settings.sandbox ? 'sandbox' : 'live';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    const response = await fetchImpl(`${API_BASE[mode]}/v1/invoice`, {
      method: 'POST',
      headers: { 'x-api-key': settings.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: pkg.cents / 100,
        price_currency: pkg.currency,
        pay_currency: settings.payCurrency,
        order_id: purchaseId,
        order_description: `${pkg.id} proxy traffic`,
        ipn_callback_url: ipnUrl,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
      signal: controller.signal,
      redirect: 'error',
    });
    const invoice = await response.json().catch(() => null);
    let url = null;
    try { url = new URL(invoice?.invoice_url); } catch { /* checked below */ }
    if (!response.ok || !digits(invoice?.id) || url?.protocol !== 'https:' || url.hostname !== INVOICE_HOSTS[mode]) {
      return null;
    }
    return { invoiceRef: `npinv_${invoice.id}`, invoiceUrl: url.toString() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
