/*
  RankForge Billing Stack Helper for n8n Code/Function node

  Purpose:
  - Stack a new paid Stripe purchase on top of an existing active entitlement.
  - Keep webhook processing idempotent across retries and related Stripe events.

  Inputs expected in n8n:
  - stripe event payload as `event` or `$json`
  - existing users sheet rows as `existingUsersRows` or `usersRows`

  Output:
  - { already_processed: true, reason, matched_existing_row }
  - or { already_processed: false, append_row }
*/

const PRICE_TO_PLAN = {
  price_1TRJpdHMh8zEDCCEMgGsPjoW: 'starter',
  price_1TRJpgHMh8zEDCCEnkkN6HF1: 'growth'
};

const PLAN_ALLOWANCES = {
  free: { search: 2, credits: 10, maxBatch: 10, csv: false },
  starter: { search: 50, credits: 50, maxBatch: 25, csv: true },
  growth: { search: 150, credits: 250, maxBatch: 50, csv: true },
  admin: { search: Infinity, credits: Infinity, maxBatch: Infinity, csv: true }
};

function clean(value) {
  return String(value ?? '').trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}
function first(...values) {
  return values.map(clean).find(Boolean) || '';
}
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));
}
function numeric(value, fallback = 0) {
  const raw = clean(value);
  if (/^(infinity|unlimited|∞)$/i.test(raw)) return Infinity;
  const n = Number(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}
function normalizePlan(value) {
  const raw = lower(value).replace(/\s+/g, '_').replace(/-/g, '_');
  if (/admin|unlimited/.test(raw)) return 'admin';
  if (/stack|bundle|combined|multi/.test(raw)) return 'stacked';
  if (raw === 'growth' || raw === 'pro') return 'growth';
  if (raw === 'starter' || raw === 'basic') return 'starter';
  return 'free';
}
function normalizeBilling(value) {
  const raw = lower(value).replace(/\s+/g, '_').replace(/-/g, '_');
  if (/admin|unlimited/.test(raw)) return 'admin_unlimited';
  if (/active|paid|trialing|complete|checkout_complete|subscription_active|subscription/.test(raw)) return 'active';
  if (/pending|incomplete/.test(raw)) return 'pending';
  if (/past/.test(raw)) return 'past_due';
  if (/cancel/.test(raw)) return 'canceled';
  if (/free/.test(raw)) return 'free';
  return raw || 'unknown';
}
function rowEmails(row) {
  const values = [row.email, row.user_email, row.account_email, row.customer_email, row.billing_email, row.stripe_customer_email];
  if (isEmail(row.user_id)) values.push(row.user_id);
  if (isEmail(row.userId)) values.push(row.userId);
  return values.map(lower).filter(Boolean);
}
function rowUserId(row) {
  const raw = first(row.user_id, row.userId, row.owner_user_id, row.id);
  return raw && !isEmail(raw) ? raw : '';
}
function rowSource(row) {
  return lower(first(row.source, row.profile_source, row.admin_override, row.override_active));
}
function rowPlan(row) {
  return normalizePlan(first(row.plan_override, row.plan, row.current_plan, row.plan_name, row.subscription_plan, row.package, row.tier));
}
function rowBilling(row) {
  return normalizeBilling(first(row.billing_status_override, row.billing_status, row.subscription_status, row.payment_status));
}
function rowTime(row) {
  const t = Date.parse(first(row.updated_at, row.synced_at, row.created_at));
  return Number.isFinite(t) ? t : 0;
}
function isAdminOverride(row) {
  const source = rowSource(row);
  return source === 'admin_override' || source === 'true' || source.includes('admin');
}
function hasPaidSource(row) {
  const source = rowSource(row);
  return source.includes('stripe') || source.includes('checkout') || source.includes('billing') || source.includes('subscription');
}
function isPaidRow(row) {
  const plan = rowPlan(row);
  const billing = rowBilling(row);
  return plan !== 'free' && (hasPaidSource(row) || billing === 'active' || billing === 'admin_unlimited');
}
function priority(row) {
  if (isAdminOverride(row)) return 40;
  if (isPaidRow(row)) return 30;
  if (rowPlan(row) !== 'free') return 15;
  return 0;
}
function tie(row) {
  if (isAdminOverride(row)) return 3;
  if (rowSource(row).includes('stack')) return 3;
  if (hasPaidSource(row)) return 2;
  if (rowBilling(row) === 'active' && rowPlan(row) !== 'free') return 1;
  return 0;
}
function chooseBestEntitlement(rows) {
  return rows.slice().sort((a, b) => {
    return priority(b) - priority(a)
      || tie(b) - tie(a)
      || rowTime(b) - rowTime(a)
      || Number(b._row_index || 0) - Number(a._row_index || 0);
  })[0] || null;
}
function stripeIdsFromPayload(event) {
  const obj = event?.data?.object || event || {};
  return {
    stripe_event_id: first(event?.id, obj.event_id, obj.stripe_event_id),
    stripe_subscription_id: first(obj.subscription, obj.subscription_id, obj.lines?.data?.[0]?.subscription),
    stripe_invoice_id: first(obj.invoice, obj.invoice_id, obj.id && String(obj.object || '').includes('invoice') ? obj.id : ''),
    stripe_checkout_session_id: first(obj.checkout_session_id, obj.id && String(obj.object || '').includes('checkout.session') ? obj.id : ''),
    stripe_payment_intent_id: first(obj.payment_intent, obj.payment_intent_id)
  };
}
function priceIdFromPayload(event) {
  const obj = event?.data?.object || event || {};
  return first(
    obj.metadata?.price_id,
    obj.price_id,
    obj.display_items?.[0]?.price?.id,
    obj.line_items?.data?.[0]?.price?.id,
    obj.lines?.data?.[0]?.price?.id,
    obj.items?.data?.[0]?.price?.id
  );
}
function emailFromPayload(event) {
  const obj = event?.data?.object || event || {};
  return lower(first(
    obj.customer_details?.email,
    obj.customer_email,
    obj.receipt_email,
    obj.email,
    obj.metadata?.email,
    obj.metadata?.user_email
  ));
}
function hasMatchingProcessedPurchase(row, ids) {
  const subscriptionMatches = ids.stripe_subscription_id && clean(row.stripe_subscription_id || row.subscription_id) === ids.stripe_subscription_id;
  const invoiceMatches = ids.stripe_invoice_id && clean(row.stripe_invoice_id || row.invoice_id) === ids.stripe_invoice_id;
  const checkoutMatches = ids.stripe_checkout_session_id && clean(row.stripe_checkout_session_id || row.checkout_session_id) === ids.stripe_checkout_session_id;
  const eventMatches = ids.stripe_event_id && clean(row.stripe_event_id || row.event_id) === ids.stripe_event_id;
  const paymentIntentMatches = ids.stripe_payment_intent_id && clean(row.stripe_payment_intent_id || row.payment_intent_id) === ids.stripe_payment_intent_id;

  if (eventMatches || checkoutMatches || paymentIntentMatches) return true;
  if (subscriptionMatches && invoiceMatches) return true;
  if (invoiceMatches && !ids.stripe_subscription_id) return true;
  return false;
}
function matchingRowsForEmail(rows, email) {
  return rows.filter(row => rowEmails(row).includes(email));
}
function effectiveSearch(row, fallbackPlan) {
  return numeric(first(row.effective_search_limit, row.monthly_search_limit, row.search_batches_limit, row.base_search_limit), PLAN_ALLOWANCES[fallbackPlan]?.search || 0);
}
function effectiveCredits(row, fallbackPlan) {
  return numeric(first(row.effective_qualified_lead_limit, row.monthly_qualified_lead_credit_limit, row.qualified_lead_credits_limit, row.base_qualified_lead_limit), PLAN_ALLOWANCES[fallbackPlan]?.credits || 0);
}
function effectiveMaxBatch(row, fallbackPlan) {
  return numeric(first(row.max_leads_per_batch, row.max_prospects_per_batch, row.max_batch), PLAN_ALLOWANCES[fallbackPlan]?.maxBatch || 10);
}

function buildStackedEntitlement({ event, usersRows }) {
  const ids = stripeIdsFromPayload(event);
  const priceId = priceIdFromPayload(event);
  const purchasedPlan = PRICE_TO_PLAN[priceId] || normalizePlan(first(event?.data?.object?.metadata?.plan, event?.plan, event?.current_plan));
  const allowance = PLAN_ALLOWANCES[purchasedPlan];
  const email = emailFromPayload(event);

  if (!email) return { already_processed: false, error: 'missing_email_from_stripe_event' };
  if (!allowance || purchasedPlan === 'free') return { already_processed: false, error: 'unknown_or_free_price_id', price_id: priceId };

  const matchingRows = matchingRowsForEmail(usersRows || [], email);
  const duplicate = matchingRows.find(row => hasMatchingProcessedPurchase(row, ids));
  if (duplicate) {
    return { already_processed: true, reason: 'duplicate_stripe_purchase', matched_existing_row: duplicate, stripe_ids: ids };
  }

  const activeRows = matchingRows.filter(row => isAdminOverride(row) || isPaidRow(row));
  const existing = chooseBestEntitlement(activeRows);
  const existingPlan = existing ? rowPlan(existing) : 'free';
  const existingBilling = existing ? rowBilling(existing) : 'free';

  if (existing && (existingPlan === 'admin' || existingBilling === 'admin_unlimited')) {
    return { already_processed: true, reason: 'admin_unlimited_not_stacked', matched_existing_row: existing, stripe_ids: ids };
  }

  const existingSearch = existing && existingBilling === 'active' ? effectiveSearch(existing, existingPlan) : 0;
  const existingCredits = existing && existingBilling === 'active' ? effectiveCredits(existing, existingPlan) : 0;
  const existingMaxBatch = existing && existingBilling === 'active' ? effectiveMaxBatch(existing, existingPlan) : 10;

  const newEffectiveSearch = existingSearch + allowance.search;
  const newEffectiveCredits = existingCredits + allowance.credits;
  const newMaxBatch = Math.max(existingMaxBatch, allowance.maxBatch);
  const now = new Date().toISOString();

  return {
    already_processed: false,
    append_row: {
      user_id: first(existing?.user_id, existing?.userId, event?.data?.object?.client_reference_id, event?.client_reference_id, email),
      email,
      user_email: email,
      plan: existing && existingBilling === 'active' ? 'stacked' : purchasedPlan,
      current_plan: existing && existingBilling === 'active' ? 'stacked' : purchasedPlan,
      plan_name: existing && existingBilling === 'active' ? `Stacked ${purchasedPlan}` : purchasedPlan,
      billing_status: 'active',
      subscription_status: 'active',
      base_search_limit: allowance.search,
      base_qualified_lead_limit: allowance.credits,
      extra_search_credits: existingSearch,
      extra_qualified_lead_credits: existingCredits,
      effective_search_limit: newEffectiveSearch,
      effective_qualified_lead_limit: newEffectiveCredits,
      max_leads_per_batch: newMaxBatch,
      csv_export: true,
      source: existing && existingBilling === 'active' ? 'stripe_webhook_stacked' : 'stripe_webhook',
      synced_at: now,
      updated_at: now,
      stripe_event_id: ids.stripe_event_id,
      stripe_subscription_id: ids.stripe_subscription_id,
      stripe_invoice_id: ids.stripe_invoice_id,
      stripe_checkout_session_id: ids.stripe_checkout_session_id,
      stripe_payment_intent_id: ids.stripe_payment_intent_id,
      stripe_price_id: priceId,
      purchased_plan: purchasedPlan,
      stack_note: existing && existingBilling === 'active'
        ? 'Added purchased plan allowance on top of existing active entitlement.'
        : 'Initial paid entitlement from Stripe purchase.'
    },
    previous_entitlement_row: existing || null,
    stripe_ids: ids
  };
}

// n8n usage:
// const event = $json.event || $json;
// const usersRows = $json.existingUsersRows || $json.usersRows || [];
// return [{ json: buildStackedEntitlement({ event, usersRows }) }];

if (typeof module !== 'undefined') {
  module.exports = { buildStackedEntitlement, PRICE_TO_PLAN, PLAN_ALLOWANCES };
}
