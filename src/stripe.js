// Stripe API helpers — raw fetch, no npm dependency.
// Follows the same patterns as createStripeCheckout() in payments.js.

export function validStripeIdentifier(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(prefix)
    && value.length > prefix.length
    && value.length <= 255
    && /^[A-Za-z0-9_]+$/.test(value);
}

async function stripeRequest(config, method, path, params, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.stripeTimeoutMs);
  timeout.unref?.();
  try {
    const url = `https://api.stripe.com${path}`;
    const headers = {
      Authorization: `Bearer ${config.stripeKey}`,
    };
    const opts = { method, headers, signal: controller.signal, redirect: 'error' };
    if (params && (method === 'POST' || method === 'DELETE')) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      if (params instanceof URLSearchParams) {
        opts.body = params;
      } else if (typeof params === 'string') {
        opts.body = params;
      }
    }
    const res = await fetchImpl(url, opts);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.error?.message || `Stripe ${method} ${path} failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.stripeError = body?.error;
      throw err;
    }
    return body;
  } catch (error) {
    if (error.status) throw error;
    const wrapped = new Error('Payment provider unavailable');
    wrapped.status = 502;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createCustomer(config, { email, name, username }, fetchImpl) {
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (name) params.set('name', name);
  params.set('metadata[username]', username);
  params.set('metadata[platform]', 'veyora');
  const customer = await stripeRequest(config, 'POST', '/v1/customers', params, fetchImpl);
  if (!validStripeIdentifier(customer?.id, 'cus_')) throw new Error('Invalid Stripe customer response');
  return customer;
}

export async function createProduct(config, { name, description, metadata }, fetchImpl) {
  const params = new URLSearchParams();
  params.set('name', name);
  if (description) params.set('description', description);
  for (const [k, v] of Object.entries(metadata || {})) params.set(`metadata[${k}]`, v);
  const product = await stripeRequest(config, 'POST', '/v1/products', params, fetchImpl);
  if (!validStripeIdentifier(product?.id, 'prod_')) throw new Error('Invalid Stripe product response');
  return product;
}

export async function createPrice(config, { productId, unitAmount, currency, interval }, fetchImpl) {
  const params = new URLSearchParams({
    product: productId,
    unit_amount: String(unitAmount),
    currency: currency || 'eur',
    'recurring[interval]': interval || 'month',
  });
  const price = await stripeRequest(config, 'POST', '/v1/prices', params, fetchImpl);
  if (!validStripeIdentifier(price?.id, 'price_')) throw new Error('Invalid Stripe price response');
  return price;
}

export async function createSubscriptionCheckout(config, { customerId, priceId, subscriptionId, successUrl, cancelUrl }, fetchImpl) {
  const params = new URLSearchParams({
    'mode': 'subscription',
    'customer': customerId,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': successUrl,
    'cancel_url': cancelUrl,
    'client_reference_id': subscriptionId,
    'subscription_data[metadata][subscription_id]': subscriptionId,
    'metadata[subscription_id]': subscriptionId,
  });
  const session = await stripeRequest(config, 'POST', '/v1/checkout/sessions', params, fetchImpl);
  if (!validStripeIdentifier(session?.id, 'cs_') || typeof session?.url !== 'string'
    || !session.url.startsWith('https://checkout.stripe.com/')) {
    throw new Error('Invalid Stripe checkout session response');
  }
  return session;
}

export async function cancelStripeSubscription(config, stripeSubId, fetchImpl) {
  return stripeRequest(config, 'DELETE', `/v1/subscriptions/${encodeURIComponent(stripeSubId)}`, new URLSearchParams(), fetchImpl);
}

export async function pauseStripeSubscription(config, stripeSubId, fetchImpl) {
  const params = new URLSearchParams({ 'pause_collection[behavior]': 'void' });
  return stripeRequest(config, 'POST', `/v1/subscriptions/${encodeURIComponent(stripeSubId)}`, params, fetchImpl);
}

export async function resumeStripeSubscription(config, stripeSubId, fetchImpl) {
  const params = new URLSearchParams({ 'pause_collection': '' });
  return stripeRequest(config, 'POST', `/v1/subscriptions/${encodeURIComponent(stripeSubId)}`, params, fetchImpl);
}
