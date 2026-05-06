# RankForge Demo Sandbox Hardening

Branch: `demo/sandbox-hardening`

## Demo frontend config

The dashboard uses `dashboard/rankforge-config.js` as the single demo environment source of truth. `dashboard/index.html` loads `rankforge-config.js` and `rankforge-sandbox-hardening.js` before the webhook/current-state/search scripts.

```js
window.RANKFORGE_CONFIG = {
  ENV: "demo",
  N8N_BASE_URL: "https://rankforge1907.app.n8n.cloud",
  WEBHOOKS: {
    CREATE_SEARCH: "/webhook/rankforge-demo-create-search",
    CURRENT_STATE: "/webhook/rankforge-demo-current-state",
    SEARCH_RESULTS: "/webhook/rankforge-demo-search-results"
  },
  ADMIN_EMAIL: "automly1@gmail.com",
  CREDIT_RULE: "Credits are consumed ONLY when a lead is marked as Qualified."
};
```

## Demo n8n workflow target

Workflow name: `[DEMO] RankForge MVP Memory Safe`

Primary dashboard webhook paths:

- `/webhook/rankforge-demo-create-search`
- `/webhook/rankforge-demo-current-state`
- `/webhook/rankforge-demo-search-results`

All other workflow webhook triggers must also use demo paths to avoid activation conflicts with production:

- `/webhook/rankforge-demo-lead-feedback`
- `/webhook/rankforge-demo-admin-user-override`
- `/webhook/rankforge-demo-user-sync`
- `/webhook/rankforge-demo-user-profile-upsert`
- `/webhook/rankforge-demo-billing-activation`
- `/webhook/rankforge-demo-stripe-webhook`

Google Sheet ID for demo, confirmed by owner:

- `1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco`

A separate demo spreadsheet or `demo_*` tabs are not required. The same production Google Sheet may be used for the demo because there are not yet customer users.

Demo-created rows should be easy to clean up:

- `search_id` must use the `srch_demo_` prefix.
- Use `demo_sandbox: true` where a compatible column exists.
- Use `source_environment: demo` where a compatible column exists.
- If a tab lacks those columns, do not break existing column mapping. Put demo markers in a compatible field such as `details_json`, `notes`, or `credit_note` when available.

The demo workflow should remain inactive until explicitly enabled in n8n.

## n8n no-candidates completion safeguard

The demo workflow import includes a no-candidates fallback for the discovery gate:

- `Code - Filter Directories and Dedupe` returns one placeholder item instead of zero items when no prospect passes filtering.
- `Code - Fan Out Valid Prospects` preserves that placeholder instead of returning zero items.
- `IF - Has Audit URL?` now sends the false branch to `Code - Pick Raw Prospect Row`, then `Google Sheets - Append Raw Prospects`, so the no-candidates case still writes a terminal row and execution can complete.
- Search-results response builder excludes the no-candidates placeholder from the visible leads list and marks the search as completed when the matching raw prospect row has `no_candidates_found=true` / `status=no_candidates`.
- Placeholder rows include:
  - `no_candidates_found: true`
  - `skip_audit: true`
  - `candidate_count: 0`
  - `status: no_candidates`
  - `discovery_status: no_candidates_after_directory_filter`
  - `demo_sandbox: true`
  - `source_environment: demo`
  - `search_id` with `srch_demo_` prefix

This prevents n8n from stopping at the discovery dedupe/audit-url gate when directories or maps return no viable candidates.

## Security notes

- Do not edit the production n8n workflow.
- Do not edit production webhook path settings.
- Do not push API keys, tokens, service role keys, or bearer values into this repository.
- Existing n8n credential references should be preserved when duplicating the workflow inside n8n.
- If an exported workflow contains hardcoded secret values, do not commit them. Report only: `secret value exists in node; not printed`.

## Demo hardening behavior

`dashboard/rankforge-sandbox-hardening.js` enforces demo routing and dashboard isolation:

- Rewrites RankForge webhook calls to the demo webhook paths.
- Uses event-driven hardening via `DOMContentLoaded`, `rankforge:dashboard-session`, `rankforge:auth-changed`, `rankforge:rendered`, and relevant `storage` events.
- Stores sandbox data in user-scoped keys:
  - `rankforge:${user_id}:leads`
  - `rankforge:${user_id}:searches`
  - `rankforge:${user_id}:outreach`
- Rejects current-state/search-results payloads that do not match the current `user_id`, `email`, or known `search_id`.
- Shows no private data when identity is missing.
- Clears RankForge session keys and Supabase `sb-*` tokens during logout while preserving `rankforge-explicit-logout-v1`.
- Shows admin UI only for `automly1@gmail.com`.
- Displays admin usage as unlimited.
- Keeps the credit rule visible: `Credits are consumed ONLY when a lead is marked as Qualified.`

## Search submit behavior

- `v13-search-submit.js` does not use `mode: 'no-cors'`.
- New search batches are stored locally as `Pending` first.
- After a successful demo webhook response, the batch is updated to `Running`.
- If the webhook fails, the user sees an error instead of a false success.

## Credit guard

Search creation is blocked unless the user is admin when:

- `remaining_search_batches <= 0`
- `remaining_lead_credits <= 0`

Credit usage rule:

- Qualified = 1 credit
- Needs Review = 0 credit
- Rejected = 0 credit

## Runtime test checklist

Run these manually in a browser against the demo branch before marking complete:

- DevTools Network shows only demo webhook calls for dashboard actions.
- Create Search calls `/webhook/rankforge-demo-create-search`.
- Refresh Results calls `/webhook/rankforge-demo-search-results`.
- Current State calls `/webhook/rankforge-demo-current-state`.
- Any lead feedback/admin/user/billing/Stripe workflow test calls use only `rankforge-demo-*` paths.
- Created rows use `srch_demo_` search_id prefix.
- If discovery returns no viable prospects, the workflow appends one raw prospect placeholder and the dashboard search status stops staying indefinitely in Running.
- Created rows include `demo_sandbox=true` and/or `source_environment=demo` when the sheet mapping supports those fields.
- User A creates a search, logs out, then User B does not see User A data.
- localStorage keys are user scoped.
- Supabase `sb-*` tokens are removed after logout.
- `rankforge-explicit-logout-v1` remains after logout cleanup.
- Admin `automly1@gmail.com` sees Admin UI and unlimited usage.
- Non-admin users do not see Admin UI.
- Row click does not conflict with checkbox/select/export actions.
- Dashboard flicker is not increased.
- Mobile dashboard layout still works.
